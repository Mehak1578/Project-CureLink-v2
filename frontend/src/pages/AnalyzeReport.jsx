import React, { useRef, useState, useEffect } from "react";
import axios from "../api";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const removeGeneratedNote = (analysis) =>
  analysis.replace(
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Note(?:\*\*)?\s*:[\s\S]*?(?=\n\s*#{1,6}\s|\n{2,}|\s*$)/gi,
    "",
  );

export default function AnalyzeReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const analysisRequestInFlight = useRef(false);
  const [language, setLanguage] = useState("english");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      // Get single report details
      const res = await axios.get(`/api/reports/${id}`);
      setReport(res.data);
    } catch (err) {
      console.error("Load report error:", err);
      if (err.response?.status === 401) {
        setError("Please log in to view this report");
        setTimeout(() => navigate("/login"), 2000);
      } else if (err.response?.status === 404) {
        setError("Report not found");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to view this report");
      } else {
        setError(err.response?.data?.msg || "Failed to load report");
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeReport = async () => {
    if (analysisRequestInFlight.current) return;

    analysisRequestInFlight.current = true;
    try {
      setAnalyzing(true);
      setError("");
      setSuccessMsg("");

      const res = await axios.post(
        `/api/analysis/report/${id}`,
        { language },
        { timeout: 150000 },
      );

      // Update the report state with the analysis from the response
      if (!res.data?.analysis) {
        throw new Error("Analysis response did not include analysis text");
      }

      setReport((prevReport) => ({
        ...prevReport,
        analysis: res.data.analysis,
      }));
      setSuccessMsg("AI analysis completed successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.msg ||
          "Failed to analyze report. Please try again.",
      );
    } finally {
      setAnalyzing(false);
      analysisRequestInFlight.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12 px-4">
        <div className="container-max max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <Link
                to="/my-reports"
                className="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
              >
                Back to Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fix PDF URL - Cloudinary stores PDFs under /raw/upload/ not /image/upload/
  const fixedUrl =
    report?.fileType === "application/pdf" && report?.url
      ? report.url.replace("/image/upload/", "/raw/upload/")
      : report?.url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-12 px-4">
      <div className="container-max max-w-4xl">
        {/* Back Button */}
        <Link
          to="/my-reports"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-purple-600 mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Reports
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Report Analysis
          </h1>
          <p className="text-lg text-slate-600">
            AI-powered insights for your medical report
          </p>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <svg
              className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-emerald-700 font-medium">{successMsg}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Report Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-slate-100">
          <div className="flex items-start gap-6 mb-6">
            {/* File Icon */}
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                report?.fileType === "application/pdf"
                  ? "bg-gradient-to-br from-red-400 to-red-500"
                  : "bg-gradient-to-br from-purple-400 to-pink-500"
              }`}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-900 mb-2 truncate">
                {report?.fileName || report?.filename || "Medical Report"}
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {report?.fileType || report?.contentType || "Unknown type"}
                  </span>
                </div>
                {report?.size && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z"
                      />
                    </svg>
                    <span>{(report.size / 1024).toFixed(2)} KB</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {new Date(
                      report?.uploadedAt || report?.createdAt,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                11
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {report?.url && (
              <a
                href={fixedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {report?.fileType === "application/pdf"
                  ? "Open PDF"
                  : "Open Report"}
              </a>
            )}

            <label className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 font-semibold rounded-lg border-2 border-slate-200">
              <span className="text-sm">Language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={analyzing}
                className="bg-transparent outline-none disabled:text-slate-400"
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="english_hindi">English + Hindi</option>
              </select>
            </label>

            <button
              onClick={analyzeReport}
              disabled={analyzing}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-purple-600 font-semibold rounded-lg border-2 border-purple-500 disabled:border-slate-300 disabled:text-slate-400 transition-all disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  Analyzing report...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  {report?.analysis ? "Re-analyze with AI" : "Analyze with AI"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Analysis Results */}
        {report?.analysis && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  AI Analysis Results
                </h3>
                <p className="text-sm text-slate-600">
                  Generated by advanced AI medical assistant
                </p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
              <ReactMarkdown>
                {removeGeneratedNote(report.analysis)}
              </ReactMarkdown>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Important Disclaimer</p>
                  <p>
                    This is an AI-generated analysis and should not replace
                    professional medical advice, diagnosis, or treatment. Always
                    consult with qualified healthcare providers for medical
                    decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Analysis Yet State */}
        {!report?.analysis && !analyzing && (
          <div className="bg-white rounded-2xl shadow-xl p-12 border border-slate-100 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No Analysis Yet
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Click the "Analyze with AI" button above to get intelligent
              insights about your medical report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
