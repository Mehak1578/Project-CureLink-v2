const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareCase', default: null },
  fileName: { type: String, required: true }, // Original filename
  filename: { type: String }, // Keep for backward compatibility
  url: { type: String, required: true }, // Cloudinary URL or local path
  fileType: { type: String }, // MIME type
  contentType: { type: String }, // Keep for backward compatibility
  size: { type: Number }, // File size in bytes
  uploadedAt: { type: Date, default: Date.now },
  analysis: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
