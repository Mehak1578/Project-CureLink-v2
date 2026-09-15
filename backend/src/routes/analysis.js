const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const Report = require("../models/Report");
const { fromPath } = require("pdf2pic");
const os = require("os");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HUGGINGFACE_MODEL =
  process.env.HUGGINGFACE_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct";

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
      const response = await axios.get(report.url, {
        responseType: "arraybuffer",
      });

      // Extract mime type from response headers
      mimeType = response.headers["content-type"] || "application/octet-stream";

      // Ensure we have a proper buffer
      let fileBuffer = Buffer.isBuffer(response.data)
        ? response.data
        : Buffer.from(response.data);

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

      // Convert buffer to base64 for the Hugging Face vision model.
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

    // STEP 2: HUGGING FACE VISION REQUEST WITH RETRY
    const huggingFaceToken =
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_TOKEN ||
      process.env.GEMINI_API_KEY;
    if (!huggingFaceToken) {
      return res.status(500).json({
        msg: "AI analysis is not configured on the server.",
        error: "Set HUGGINGFACE_API_KEY in the backend environment.",
      });
    }

    console.log("🤖 Sending request to Hugging Face Vision...");

    const languageInstruction =
      language === "hindi"
        ? "Write the entire response in proper Hindi using Devanagari script. Do not shorten or omit any information because of the language."
        : language === "english_hindi"
          ? "Write a complete bilingual response. For every important value, finding, and health insight, provide the English explanation followed immediately by its complete Hindi equivalent in proper Devanagari script. Do not replace the full analysis with a short mixed-language summary."
          : "Write the entire response in English without shortening or omitting any information.";
    const analysisPrompt = `Analyze this medical report or image and provide a comprehensive medical report interpretation.

Provide a comprehensive analysis of ALL relevant values in the medical report. Do not omit, compress, or summarize findings based on the selected language. Include every visible test name, value, unit, reference or normal range, abnormal finding, and medically relevant health insight. Preserve values and ranges accurately, and do not invent information that is not visible in the report.

Use this structure whenever the information is available:
### Summary
### Abnormalities / Abnormal Values
### Normal Values
### Health Insights
Include any other relevant sections needed to cover the report completely. Explain each important finding, not just the overall conclusion. ${languageInstruction}

Do not include a note, disclaimer, or statement that this is not a diagnosis; the application provides its own disclaimer.`;

    const maxAttempts = 2;
    const retryDelay = 500;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Validate inputs before sending
        if (!base64Image) {
          throw new Error("Base64 image data is missing");
        }
        if (!mimeType) {
          throw new Error("MIME type is missing");
        }

        const result = await axios.post(
          HUGGINGFACE_API_URL,
          {
            model: HUGGINGFACE_MODEL,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: analysisPrompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 1500,
          },
          {
            headers: {
              Authorization: `Bearer ${huggingFaceToken}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          },
        );

        console.log("✅ Hugging Face responded");

        const aiText = result.data?.choices?.[0]?.message?.content;

        if (!aiText) {
          return res.status(500).json({
            msg: "Failed to analyze report.",
            error: "Hugging Face returned no analysis text",
          });
        }

        // STEP 3: SAVE ANALYSIS
        report.analysis = aiText;
        await report.save();

        return res.json({
          success: true,
          analysis: aiText,
        });
      } catch (huggingFaceError) {
        lastError = huggingFaceError;
        const errorMessage =
          huggingFaceError.response?.data?.error ||
          huggingFaceError.message ||
          "";
        const isOverloaded =
          errorMessage.toLowerCase().includes("overloaded") ||
          errorMessage.includes("503");

        console.error(
          `❌ Hugging Face error (attempt ${attempt}/${maxAttempts}):`,
          errorMessage,
        );

        if (isOverloaded && attempt < maxAttempts) {
          console.log(
            `⚠️ Hugging Face is busy. Retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        // If not overloaded or retries exhausted, break
        break;
      }
    }

    // All retries exhausted or non-retryable error
    const providerError =
      lastError.response?.data?.error ||
      lastError.response?.data?.message ||
      lastError.message ||
      "Unknown Hugging Face error";
    const finalError =
      typeof providerError === "string"
        ? providerError
        : JSON.stringify(providerError);
    console.error("❌ Hugging Face error after retries:", finalError);

    const errorMessage = finalError || "";
    const isOverloaded =
      errorMessage.toLowerCase().includes("overloaded") ||
      errorMessage.includes("503");

    if (isOverloaded) {
      return res.status(503).json({
        msg: "The AI service is currently busy. Please try again.",
      });
    }

    return res.status(500).json({
      msg: "Failed to analyze report.",
      error: finalError,
    });
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    return res.status(500).json({
      msg: "Failed to analyze report.",
      error: error?.response?.data || error.message,
    });
  }
});

module.exports = router;
