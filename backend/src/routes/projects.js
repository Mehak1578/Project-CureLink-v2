const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const Project = require("../models/Project");
const User = require("../models/User");

const router = express.Router();
const uploadsDir = path.join(__dirname, "../../uploads/projects");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "-");
    callback(null, `${crypto.randomBytes(12).toString("hex")}-${safeName}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });
const userFields = "name email role avatar";
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const projectQuery = (query) =>
  query.populate("owner", userFields).populate("members", userFields);
const generateToken = () => crypto.randomBytes(32).toString("hex");

const getProject = async (id, res) => {
  if (!isValidId(id)) {
    res.status(400).json({ msg: "Invalid project id" });
    return null;
  }
  const project = await projectQuery(Project.findById(id));
  if (!project) res.status(404).json({ msg: "Project not found" });
  return project;
};

const publicProject = (project, shareToken) => {
  const settings = project.publicContentSettings || {};
  const result = {
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    readOnly: true,
  };
  if (settings.overview) result.description = project.description;
  if (settings.readme) result.readme = project.readme;
  if (settings.files) {
    result.files = project.files.map(({ _id, name, mimeType, size, uploadedAt }) => ({
      _id,
      name,
      url: `/api/projects/public/${shareToken}/files/${_id}`,
      mimeType,
      size,
      uploadedAt,
    }));
  }
  return result;
};

router.get("/public/:shareToken", async (req, res) => {
  try {
    const project = await Project.findOne({
      publicShareToken: req.params.shareToken,
      isPublic: true,
    }).select("name description readme files createdAt updatedAt publicContentSettings");
    if (!project) return res.status(404).json({ msg: "This project is no longer publicly available." });
    res.json(publicProject(project, req.params.shareToken));
  } catch (error) {
    res.status(500).json({ msg: "Unable to load public project." });
  }
});

router.get("/public/:shareToken/files/:fileId", async (req, res) => {
  try {
    const project = await Project.findOne({
      publicShareToken: req.params.shareToken,
      isPublic: true,
    }).select("files publicContentSettings");
    if (!project || !project.publicContentSettings?.files) {
      return res.status(404).json({ msg: "This project is no longer publicly available." });
    }
    const file = project.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "Project file not found." });
    res.sendFile(path.join(uploadsDir, path.basename(file.url)));
  } catch (error) {
    res.status(500).json({ msg: "Unable to load public project file." });
  }
});

router.use(auth);
router.use(roles("admin"));

router.get("/", async (req, res) => {
  try {
    const projects = await projectQuery(Project.find()).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ msg: "Unable to load projects." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description = "", readme = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ msg: "Project name is required." });
    const project = await Project.create({
      name: name.trim(),
      description,
      readme,
      owner: req.user._id,
      members: [],
    });
    res.status(201).json(await projectQuery(Project.findById(project._id)));
  } catch (error) {
    res.status(500).json({ msg: "Unable to create project." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    res.json(project);
  } catch (error) {
    res.status(500).json({ msg: "Unable to load project." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    const updates = {};
    if (typeof req.body.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
    if (typeof req.body.description === "string") updates.description = req.body.description;
    if (typeof req.body.readme === "string") updates.readme = req.body.readme;
    const updated = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json(await projectQuery(Project.findById(updated._id)));
  } catch (error) {
    res.status(500).json({ msg: "Unable to update project." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    await Project.findByIdAndDelete(req.params.id);
    res.json({ msg: "Project deleted." });
  } catch (error) {
    res.status(500).json({ msg: "Unable to delete project." });
  }
});

router.post("/:id/share", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    const isPublic = Boolean(req.body.isPublic);
    const settings = req.body.publicContentSettings || {};
    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      {
        isPublic,
        publicShareToken: isPublic ? project.publicShareToken || generateToken() : null,
        publicContentSettings: {
          overview: settings.overview !== false,
          readme: settings.readme !== false,
          files: settings.files === true,
        },
      },
      { new: true },
    );
    res.json({
      isPublic: updated.isPublic,
      publicContentSettings: updated.publicContentSettings,
      publicShareToken: updated.isPublic ? updated.publicShareToken : null,
    });
  } catch (error) {
    res.status(500).json({ msg: "Unable to update project sharing." });
  }
});

router.post("/:id/members", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    if (!isValidId(req.body.userId)) return res.status(400).json({ msg: "Valid user id is required." });
    const member = await User.findById(req.body.userId).select(userFields);
    if (!member) return res.status(404).json({ msg: "User not found." });
    await Project.findByIdAndUpdate(req.params.id, { $addToSet: { members: member._id } });
    res.json(member);
  } catch (error) {
    res.status(500).json({ msg: "Unable to add project member." });
  }
});

router.delete("/:id/members/:userId", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    await Project.findByIdAndUpdate(req.params.id, { $pull: { members: req.params.userId } });
    res.json({ msg: "Project member removed." });
  } catch (error) {
    res.status(500).json({ msg: "Unable to remove project member." });
  }
});

router.post("/:id/files", upload.single("file"), async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    if (!req.file) return res.status(400).json({ msg: "No file provided." });
    const file = {
      name: req.file.originalname,
      url: `/uploads/projects/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };
    const updated = await Project.findByIdAndUpdate(req.params.id, { $push: { files: file } }, { new: true });
    res.status(201).json(updated.files[updated.files.length - 1]);
  } catch (error) {
    res.status(500).json({ msg: "Unable to upload project file." });
  }
});

router.get("/:id/files/:fileId/download", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    const file = project.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "Project file not found." });
    res.sendFile(path.join(uploadsDir, path.basename(file.url)));
  } catch (error) {
    res.status(500).json({ msg: "Unable to load project file." });
  }
});

router.delete("/:id/files/:fileId", async (req, res) => {
  try {
    const project = await getProject(req.params.id, res);
    if (!project) return;
    const file = project.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ msg: "Project file not found." });
    if (file.url.startsWith("/uploads/projects/")) {
      fs.rm(path.join(uploadsDir, path.basename(file.url)), { force: true }, () => {});
    }
    await Project.findByIdAndUpdate(req.params.id, { $pull: { files: { _id: req.params.fileId } } });
    res.json({ msg: "Project file deleted." });
  } catch (error) {
    res.status(500).json({ msg: "Unable to delete project file." });
  }
});

module.exports = router;
