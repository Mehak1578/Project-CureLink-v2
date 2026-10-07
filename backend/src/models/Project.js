const mongoose = require("mongoose");

const ProjectFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readme: { type: String, default: "" },
    files: [ProjectFileSchema],
    isPublic: { type: Boolean, default: false },
    publicShareToken: { type: String, default: null, unique: true, sparse: true },
    publicContentSettings: {
      overview: { type: Boolean, default: true },
      readme: { type: Boolean, default: true },
      files: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", ProjectSchema);
