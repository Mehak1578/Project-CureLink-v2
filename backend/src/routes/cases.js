const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const Appointment = require("../models/Appointment");
const CareCase = require("../models/CareCase");
const ClinicalNote = require("../models/ClinicalNote");
const User = require("../models/User");
const Activity = require("../models/Activity");

const router = express.Router();
const CASE_STATUSES = ["Active", "On Hold", "Completed"];
const MEMBER_ROLES = ["Specialist", "Consultant"];
const userFields = "name email role avatar";

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const isAdmin = (user) => user.role === "admin";

const populateCase = (query) =>
  query
    .populate("patient", userFields)
    .populate("primaryDoctor", userFields)
    .populate("members.doctor", userFields);

const canAccessCase = (careCase, user) => {
  if (isAdmin(user)) return true;
  if (user.role === "patient")
    return (
      String(careCase.patient?._id || careCase.patient) === String(user._id)
    );
  if (user.role !== "doctor") return false;
  return (
    String(careCase.primaryDoctor?._id || careCase.primaryDoctor) ===
      String(user._id) ||
    careCase.members.some(
      (member) =>
        String(member.doctor?._id || member.doctor) === String(user._id),
    )
  );
};

const canManageCase = (careCase, user) =>
  isAdmin(user) ||
  (user.role === "doctor" &&
    String(careCase.primaryDoctor?._id || careCase.primaryDoctor) ===
      String(user._id));

const canAccessNotes = (careCase, user) => canAccessCase(careCase, user);
const canManageNote = (note, careCase, user) =>
  canManageCase(careCase, user) ||
  String(note.doctorId?._id || note.doctorId) === String(user._id) ||
  (user.role === "patient" &&
    String(careCase.patient?._id || careCase.patient) === String(user._id));

const getDoctorAppointmentFilter = async (userId) => {
  const doctorProfileIds = await require("../models/Doctor")
    .find({ user: userId })
    .distinct("_id");
  return { $or: [{ doctor: userId }, { doctor: { $in: doctorProfileIds } }] };
};

const getCaseOr404 = async (id, res) => {
  if (!isValidId(id)) {
    res.status(400).json({ msg: "Invalid care case id" });
    return null;
  }
  const careCase = await populateCase(CareCase.findById(id));
  if (!careCase) res.status(404).json({ msg: "Care case not found" });
  return careCase;
};

router.use(auth);

// Patients available to the current doctor are limited to their existing appointments.
router.get("/patients", roles("doctor"), async (req, res) => {
  try {
    const appointments = await Appointment.find(
      await getDoctorAppointmentFilter(req.user._id),
    ).distinct("patient");
    const patients = await User.find({
      _id: { $in: appointments },
      role: "patient",
      isActive: true,
    })
      .select("name email phone")
      .sort({ name: 1 });
    res.json(patients);
  } catch (error) {
    console.error("Care case patients error:", error.message);
    res.status(500).json({ msg: "Unable to load eligible patients" });
  }
});

// Registered active doctors can be selected as team members; credentials are never returned.
router.get("/doctors", roles("doctor"), async (req, res) => {
  try {
    const doctors = await User.find({
      role: "doctor",
      isActive: true,
      _id: { $ne: req.user._id },
      $or: [{ verified: true }, { verificationStatus: "verified" }],
    })
      .select(userFields)
      .sort({ name: 1 });
    res.json(doctors);
  } catch (error) {
    console.error("Care case doctors error:", error.message);
    res.status(500).json({ msg: "Unable to load eligible doctors" });
  }
});

router.get("/:caseId/notes", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.caseId, res);
    if (!careCase) return;
    if (!canAccessNotes(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });

    const notes = await ClinicalNote.find({ caseId: careCase._id })
      .populate("doctorId", "name email avatar")
      .populate("patientId", "name email avatar")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(notes);
  } catch (error) {
    console.error("List clinical notes error:", error.message);
    res.status(500).json({ msg: "Unable to load clinical notes" });
  }
});

router.post("/:caseId/notes", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.caseId, res);
    if (!careCase) return;
    if (!canAccessNotes(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });

    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content)
      return res
        .status(400)
        .json({ msg: "Note title and content are required" });

    const note = await ClinicalNote.create({
      caseId: careCase._id,
      patientId: careCase.patient._id || careCase.patient,
      // If patient is creating, they are not the doctor, so we just set doctorId to primaryDoctor
      doctorId:
        req.user.role === "doctor"
          ? req.user._id
          : careCase.primaryDoctor._id || careCase.primaryDoctor,
      title,
      content,
      });
      
    // Track activity
    await Activity.create({
      caseId: careCase._id,
      user: req.user._id,
      userRole: req.user.role,
      userName: req.user.name,
      action: "NOTE_CREATED",
      description: `${req.user.role === 'doctor' ? 'Dr. ' : ''}${req.user.name} added a clinical note`,
    });

    res
      .status(201)
      .json(
        await ClinicalNote.findById(note._id)
          .populate("doctorId", "name email avatar")
          .lean(),
      );
  } catch (error) {
    console.error("Create clinical note error:", error.message);
    res.status(500).json({ msg: "Unable to save clinical note" });
  }
});

router.put("/:caseId/notes/:noteId", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.caseId, res);
    if (!careCase) return;
    if (!canAccessNotes(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });

    const note = await ClinicalNote.findOne({
      _id: req.params.noteId,
      caseId: careCase._id,
    });
    if (!note) return res.status(404).json({ msg: "Clinical note not found" });
    if (!canManageNote(note, careCase, req.user))
      return res
        .status(403)
        .json({ msg: "You cannot edit this clinical note" });

    const title = String(req.body.title || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !content)
      return res
        .status(400)
        .json({ msg: "Note title and content are required" });
    note.title = title;
    note.content = content;
    await note.save();
    res.json(
      await ClinicalNote.findById(note._id)
        .populate("doctorId", "name email avatar")
        .lean(),
    );
  } catch (error) {
    console.error("Update clinical note error:", error.message);
    res.status(500).json({ msg: "Unable to update clinical note" });
  }
});

router.delete("/:caseId/notes/:noteId", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.caseId, res);
    if (!careCase) return;
    if (!canAccessNotes(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });

    const note = await ClinicalNote.findOne({
      _id: req.params.noteId,
      caseId: careCase._id,
    });
    if (!note) return res.status(404).json({ msg: "Clinical note not found" });
    if (!canManageNote(note, careCase, req.user))
      return res
        .status(403)
        .json({ msg: "You cannot delete this clinical note" });
    await note.deleteOne();
    res.json({ msg: "Clinical note deleted" });
  } catch (error) {
    console.error("Delete clinical note error:", error.message);
    res.status(500).json({ msg: "Unable to delete clinical note" });
  }
});

router.post("/", roles("doctor"), async (req, res) => {
  try {
    const { patient, title, description = "" } = req.body;
    if (!isValidId(patient) || !title?.trim()) {
      return res
        .status(400)
        .json({ msg: "Patient and case title are required" });
    }

    const patientExists = await User.exists({
      _id: patient,
      role: "patient",
      isActive: true,
    });
    if (!patientExists)
      return res.status(404).json({ msg: "Patient not found" });

    const doctorAppointmentFilter = await getDoctorAppointmentFilter(
      req.user._id,
    );
    const hasRelationship = await Appointment.exists({
      ...doctorAppointmentFilter,
      patient,
    });
    if (!hasRelationship) {
      return res
        .status(403)
        .json({ msg: "You can only create cases for your existing patients" });
    }

    const careCase = await CareCase.create({
      patient,
      title: title.trim(),
      description: String(description).trim(),
      primaryDoctor: req.user._id,
      members: [{ doctor: req.user._id, role: "Primary Doctor" }],
    });
    res.status(201).json(await populateCase(CareCase.findById(careCase._id)));
  } catch (error) {
    console.error("Create care case error:", error.message);
    res.status(500).json({ msg: "Unable to create care case" });
  }
});

router.get("/", async (req, res) => {
  try {
    let filter;
    if (isAdmin(req.user)) filter = {};
    else if (req.user.role === "patient") filter = { patient: req.user._id };
    else if (req.user.role === "doctor") {
      filter = {
        $or: [
          { primaryDoctor: req.user._id },
          { "members.doctor": req.user._id },
        ],
      };
    } else return res.status(403).json({ msg: "Access denied" });

    const careCases = await populateCase(
      CareCase.find(filter).sort({ updatedAt: -1 }),
    );
    res.json(careCases);
  } catch (error) {
    console.error("List care cases error:", error.message);
    res.status(500).json({ msg: "Unable to load care cases" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canAccessCase(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });
    res.json(careCase);
  } catch (error) {
    console.error("Get care case error:", error.message);
    res.status(500).json({ msg: "Unable to load care case" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canManageCase(careCase, req.user))
      return res
        .status(403)
        .json({ msg: "Only the primary doctor can manage this case" });

    const updates = {};
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim())
        return res.status(400).json({ msg: "Case title cannot be empty" });
      updates.title = String(req.body.title).trim();
    }
    if (req.body.description !== undefined)
      updates.description = String(req.body.description).trim();
    if (req.body.status !== undefined) {
      if (!CASE_STATUSES.includes(req.body.status))
        return res.status(400).json({ msg: "Invalid case status" });
      updates.status = req.body.status;
    }

    const updated = await CareCase.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (Object.keys(updates).length > 0) {
      await Activity.create({
        caseId: careCase._id,
        user: req.user._id,
        userRole: req.user.role,
        userName: req.user.name,
        action: "CASE_UPDATED",
        description: `${req.user.role === 'doctor' ? 'Dr. ' : ''}${req.user.name} updated the care case`,
      });
    }

    res.json(await populateCase(CareCase.findById(updated._id)));
  } catch (error) {
    console.error("Update care case error:", error.message);
    res.status(500).json({ msg: "Unable to update care case" });
  }
});

router.delete("/:id", roles("doctor", "admin"), async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canManageCase(careCase, req.user))
      return res
        .status(403)
        .json({ msg: "Only the primary doctor can delete this case" });
    await CareCase.findByIdAndDelete(req.params.id);
    res.json({ msg: "Care case deleted" });
  } catch (error) {
    console.error("Delete care case error:", error.message);
    res.status(500).json({ msg: "Unable to delete care case" });
  }
});

router.get("/:id/members", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canAccessCase(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });
    res.json(careCase.members);
  } catch (error) {
    console.error("List care team error:", error.message);
    res.status(500).json({ msg: "Unable to load care team" });
  }
});

router.post("/:id/members", roles("doctor", "admin"), async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canManageCase(careCase, req.user))
      return res
        .status(403)
        .json({ msg: "Only the primary doctor can manage the care team" });

    const { doctor, role } = req.body;
    if (!isValidId(doctor) || !MEMBER_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ msg: "A registered doctor and valid team role are required" });
    }
    if (
      String(doctor) ===
      String(careCase.primaryDoctor._id || careCase.primaryDoctor)
    ) {
      return res
        .status(400)
        .json({ msg: "The primary doctor is already on the care team" });
    }
    if (
      careCase.members.some(
        (member) =>
          String(member.doctor._id || member.doctor) === String(doctor),
      )
    ) {
      return res
        .status(409)
        .json({ msg: "Doctor is already assigned to this case" });
    }

    const doctorExists = await User.exists({
      _id: doctor,
      role: "doctor",
      isActive: true,
      $or: [{ verified: true }, { verificationStatus: "verified" }],
    });
    if (!doctorExists)
      return res.status(404).json({ msg: "Eligible doctor not found" });

    await CareCase.findByIdAndUpdate(req.params.id, {
      $push: { members: { doctor, role } },
    });
    const updated = await populateCase(CareCase.findById(req.params.id));
    res.status(201).json(updated.members);
  } catch (error) {
    console.error("Add care team member error:", error.message);
    res.status(500).json({ msg: "Unable to add care team member" });
  }
});

router.delete(
  "/:id/members/:memberId",
  roles("doctor", "admin"),
  async (req, res) => {
    try {
      const careCase = await getCaseOr404(req.params.id, res);
      if (!careCase) return;
      if (!canManageCase(careCase, req.user))
        return res
          .status(403)
          .json({ msg: "Only the primary doctor can manage the care team" });
      const member = careCase.members.id(req.params.memberId);
      if (!member)
        return res.status(404).json({ msg: "Care team member not found" });
      if (member.role === "Primary Doctor")
        return res
          .status(400)
          .json({ msg: "The primary doctor cannot be removed" });

      await CareCase.findByIdAndUpdate(req.params.id, {
        $pull: { members: { _id: req.params.memberId } },
      });
      res.json({ msg: "Care team member removed" });
    } catch (error) {
      console.error("Remove care team member error:", error.message);
      res.status(500).json({ msg: "Unable to remove care team member" });
    }
  },
);

router.get("/:id/activity", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canAccessCase(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });
    
    const activities = await Activity.find({ caseId: careCase._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json(activities);
  } catch (error) {
    console.error("List activity error:", error.message);
    res.status(500).json({ msg: "Unable to load recent activity" });
  }
});

router.get("/:id/contributions", async (req, res) => {
  try {
    const careCase = await getCaseOr404(req.params.id, res);
    if (!careCase) return;
    if (!canAccessCase(careCase, req.user))
      return res.status(403).json({ msg: "Access denied" });
    
    // Calculate stats based on Activity model
    const stats = await Activity.aggregate([
      { $match: { caseId: careCase._id, userRole: "doctor" } },
      { $group: {
        _id: "$user",
        clinicalNotes: { $sum: { $cond: [{ $eq: ["$action", "NOTE_CREATED"] }, 1, 0] } },
        documentsAdded: { $sum: { $cond: [{ $eq: ["$action", "DOCUMENT_UPLOADED"] }, 1, 0] } },
        reportsReviewed: { $sum: { $cond: [{ $eq: ["$action", "REPORT_REVIEWED"] }, 1, 0] } },
        caseUpdates: { $sum: { $cond: [{ $eq: ["$action", "CASE_UPDATED"] }, 1, 0] } }
      }}
    ]);
    
    const statsMap = {};
    stats.forEach(s => {
      statsMap[s._id.toString()] = s;
    });

    const contributions = [];
    careCase.members.forEach(member => {
      const docId = String(member.doctor._id || member.doctor);
      const doctorData = member.doctor || {};
      const doctorStats = statsMap[docId] || {
        clinicalNotes: 0,
        documentsAdded: 0,
        reportsReviewed: 0,
        caseUpdates: 0
      };
      
      contributions.push({
        doctorId: docId,
        doctorName: doctorData.name || "Unknown Doctor",
        role: member.role,
        clinicalNotes: doctorStats.clinicalNotes,
        documentsAdded: doctorStats.documentsAdded,
        reportsReviewed: doctorStats.reportsReviewed,
        caseUpdates: doctorStats.caseUpdates
      });
    });

    res.json({ contributions });
  } catch (error) {
    console.error("Contributions error:", error.message);
    res.status(500).json({ msg: "Unable to calculate contributions" });
  }
});

module.exports = router;
