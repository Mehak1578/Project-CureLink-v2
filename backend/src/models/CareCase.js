const mongoose = require("mongoose");

const CareTeamMemberSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Primary Doctor", "Specialist", "Consultant"],
      required: true,
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const CareCaseSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    primaryDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "On Hold", "Completed"],
      default: "Active",
      index: true,
    },
    members: { type: [CareTeamMemberSchema], default: [] },
  },
  { timestamps: true },
);

CareCaseSchema.index({ "members.doctor": 1 });
CareCaseSchema.index({ patient: 1, updatedAt: -1 });
CareCaseSchema.index({ primaryDoctor: 1, updatedAt: -1 });

module.exports = mongoose.model("CareCase", CareCaseSchema);
