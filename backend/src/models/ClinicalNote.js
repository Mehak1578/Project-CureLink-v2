const mongoose = require("mongoose");

const ClinicalNoteSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareCase",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    content: { type: String, required: true, trim: true, maxlength: 12000 },
  },
  { timestamps: true },
);

ClinicalNoteSchema.index({ caseId: 1, updatedAt: -1 });

module.exports = mongoose.model("ClinicalNote", ClinicalNoteSchema);
