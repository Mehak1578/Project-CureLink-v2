const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const Report = require("../models/Report");
const { fromPath } = require("pdf2pic");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { callGrok, callGrokVision } = require("../utils/grok");
const { callHuggingFace } = require("../utils/huggingface");

const router = express.Router();

const cleanAnalysisText = (text) =>
  text
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();

router.post("/report/:id", auth, async (req, res) => {
  try {
    const requestedLanguage = String(req.body?.language || "english")
      .trim()
      .toLowerCase();
    const languageAliases = {
      english: "english",
      hindi: "hindi",
      english_hindi: "english_hindi",
      "english + hindi": "english_hindi",
    };
    const language = languageAliases[requestedLanguage] || "english";

    console.log(
      "🌐 Analysis language:",
      JSON.stringify({ requestedLanguage, language }),
    );

    const report = await Report.findById(req.params.id);

    if (!report) return res.status(404).json({ msg: "Report not found" });

    if (report.patient.toString() !== req.user.id)
      return res.status(403).json({ msg: "Access denied" });

    console.log("📄 Report URL:", report.url);

    // STEP 1: DOWNLOAD FILE FROM CLOUDINARY (IMAGE OR PDF)
    let base64Image;
    let mimeType;

    try {
      let fileBuffer;

      // Check if report.url points to a local upload
      if (report.url.startsWith("/uploads") || report.url.startsWith("uploads") || !report.url.startsWith("http")) {
        const localPath = path.isAbsolute(report.url)
          ? report.url
          : path.join(__dirname, "../../", report.url.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          fileBuffer = fs.readFileSync(localPath);
          mimeType = report.fileType || report.contentType || "image/jpeg";
          console.log("📥 Loaded file from local storage:", localPath);
        }
      }

      if (!fileBuffer) {
        const fetchUrl = report.url.startsWith("http")
          ? report.url
          : `http://localhost:${process.env.PORT || 5000}${report.url.startsWith("/") ? "" : "/"}${report.url}`;

        const response = await axios.get(fetchUrl, {
          responseType: "arraybuffer",
        });

        // Extract mime type from response headers
        mimeType = response.headers["content-type"] || "application/octet-stream";

        // Ensure we have a proper buffer
        fileBuffer = Buffer.isBuffer(response.data)
          ? response.data
          : Buffer.from(response.data);
      }

      console.log(
        "📥 File downloaded. Size:",
        fileBuffer.length,
        "bytes. Mime:",
        mimeType,
      );

      // Fix MIME type for PDFs - Cloudinary raw resources return octet-stream
      if (
        report.fileType === "application/pdf" ||
        report.url.endsWith(".pdf")
      ) {
        mimeType = "application/pdf";
        console.log("🔧 Corrected MIME type to application/pdf");
      }

      // Validate buffer is not empty
      if (fileBuffer.length === 0) {
        return res.status(400).json({
          msg: "Downloaded file is empty",
          error: "File has no content",
        });
      }

      // Handle PDF files - convert first page to PNG
      if (mimeType === "application/pdf") {
        console.log("📄 PDF detected - converting first page to PNG...");

        try {
          const tempPdfPath = path.join(
            os.tmpdir(),
            `report_${Date.now()}.pdf`,
          );
          fs.writeFileSync(tempPdfPath, fileBuffer);

          const outputDir = os.tmpdir();
          const options = {
            density: 200,
            saveFilename: "page",
            savePath: outputDir,
            format: "png",
            width: 2000,
            height: 2000,
          };

          const convert = fromPath(tempPdfPath, options);
          await convert(1, { responseType: "image" });

          const files = fs.readdirSync(outputDir);
          const generated = files.find(
            (f) => f.startsWith("page") && f.endsWith(".png"),
          );
          if (!generated)
            throw new Error("Poppler did not generate a PNG file");

          const pngPath = path.join(outputDir, generated);
          const pngBuffer = fs.readFileSync(pngPath);
          if (!pngBuffer || pngBuffer.length < 1000)
            throw new Error("PNG output is empty – PDF conversion failed");

          fileBuffer = pngBuffer;
          mimeType = "image/png";

          // Cleanup temp files
          fs.unlinkSync(tempPdfPath);
          fs.unlinkSync(pngPath);

          console.log(
            "✅ PDF converted to PNG. Size:",
            fileBuffer.length,
            "bytes",
          );
        } catch (err) {
          console.error("❌ PDF → PNG failed:", err.message);
          return res.status(500).json({
            msg: "Failed to convert PDF for analysis",
            error: err.message,
          });
        }
      }

      // Convert buffer to base64 for the Groq vision model.
      base64Image = fileBuffer.toString("base64");

      // Validate base64 conversion
      if (!base64Image || base64Image.length === 0) {
        return res.status(500).json({
          msg: "Failed to encode file",
          error: "Base64 conversion resulted in empty string",
        });
      }

      console.log(
        "📥 File ready for analysis. Base64 length:",
        base64Image.length,
        "Mime:",
        mimeType,
      );
    } catch (err) {
      console.error("❌ File download failed:", err.message);
      return res.status(500).json({
        msg: "Failed to download report file",
        error: err.message,
      });
    }

    // STEP 2: AI 1 extracts report text from the image using the configured
    // Groq vision key, then AI 2 analyzes that text with Hugging Face.
    if (!process.env.GROQ_API_KEY && !process.env.HF_TOKEN) {
      return res.status(500).json({
        msg: "AI analysis is not configured on the server.",
        error: "Set GROQ_API_KEY or HF_TOKEN in the backend environment.",
      });
    }

    const extractionPrompt = `Read this medical report image carefully and extract all visible text and data.
Return only the extracted report text as plain text. Do not analyze, interpret, summarize, translate, or give medical advice.
Preserve test names, values, units, reference ranges, dates, headings, and other visible details accurately. Do not invent text that is not visible.`;

    let extractedText;
    try {
      console.log("🤖 AI 1: sending report image to Groq vision...");
      extractedText = await callGrokVision(
        base64Image,
        mimeType,
        extractionPrompt,
        4096,
      );

      if (!extractedText || !extractedText.trim()) {
        throw new Error("Vision model returned empty extracted text");
      }

      extractedText = extractedText.trim();
      console.log(
        "✅ AI 1 completed. Extracted text length:",
        extractedText.length,
      );
    } catch (visionError) {
      let providerError =
        visionError.response?.data?.error ||
        visionError.message ||
        "Unknown vision model error";
      if (typeof providerError !== "string") {
        providerError = providerError.message || JSON.stringify(providerError);
      }
      console.error("❌ AI 1 vision error:", providerError);
      return res.status(502).json({
        msg: "Failed to extract text from the medical report.",
        error: providerError,
      });
    }

    const languageInstruction =
      language === "hindi"
        ? "Write the entire response in proper Hindi using Devanagari script. Do not shorten or omit any information because of the language."
        : language === "english_hindi"
          ? "Write a complete bilingual response. For every important value, finding, and health insight, provide the English explanation followed immediately by its complete Hindi equivalent in proper Devanagari script. Do not replace the full analysis with a short mixed-language summary."
          : "Write the entire response in English without shortening or omitting any information.";
    const analysisPrompt = `Analyze the extracted medical report text and provide a comprehensive medical report interpretation.

Provide a comprehensive analysis of ALL relevant values in the medical report. Do not omit, compress, or summarize findings based on the selected language. Include every visible test name, value, unit, reference or normal range, abnormal finding, and medically relevant health insight. Preserve values and ranges accurately, and do not invent information that is not visible in the report.

Use this structure whenever the information is available:
### Summary
### Abnormalities / Abnormal Values
### Normal Values
### Health Insights
Include any other relevant sections needed to cover the report completely. Explain each important finding, not just the overall conclusion. ${languageInstruction}

Do not include a note, disclaimer, or statement that this is not a diagnosis; the application provides its own disclaimer.
Return plain text only. Do not use Markdown headings, hashtags, asterisks, or decorative formatting.`;

    // STEP 3: AI 2 analyzes the extracted text.
    try {
      console.log("🤖 AI 2: analyzing extracted report text...");
      let aiText = null;

      // Try Hugging Face first if HF_TOKEN is present
      if (process.env.HF_TOKEN) {
        try {
          console.log("🤖 AI 2: attempting analysis with Hugging Face...");
          aiText = await callHuggingFace(
            [
              {
                role: "user",
                content: `${analysisPrompt}\n\nExtracted medical report text:\n${extractedText}`,
              },
            ],
            4096,
          );
        } catch (hfErr) {
          console.warn("⚠️ Hugging Face analysis failed, falling back to Groq:", hfErr.message);
        }
      }

      // If Hugging Face failed or was not configured, fallback to Groq text model
      if (!aiText && process.env.GROQ_API_KEY) {
        console.log("🤖 AI 2: analyzing extracted report text with Groq...");
        aiText = await callGrok(
          [
            {
              role: "user",
              content: `${analysisPrompt}\n\nExtracted medical report text:\n${extractedText}`,
            },
          ],
          4096,
        );
      }

      if (!aiText || !aiText.trim()) {
        throw new Error("Text model returned empty analysis");
      }

      const cleanedAnalysis = cleanAnalysisText(aiText);
      report.analysis = cleanedAnalysis;
      await report.save();

      console.log("✅ AI 2 completed and analysis saved");
      return res.json({
        success: true,
        analysis: cleanedAnalysis,
      });
    } catch (textError) {
      let providerError =
        textError.response?.data?.error ||
        textError.message ||
        "Unknown text model error";
      if (typeof providerError !== "string") {
        providerError = providerError.message || JSON.stringify(providerError);
      }
      console.error("❌ AI 2 text analysis error:", providerError);
      return res.status(502).json({
        msg: "Failed to analyze the extracted medical report text.",
        error: providerError,
      });
    }
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    return res.status(500).json({
      msg: "Failed to analyze report.",
      error: error?.response?.data || error.message,
    });
  }
});

module.exports = router;
