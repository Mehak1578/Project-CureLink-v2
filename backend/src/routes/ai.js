const express = require("express");
const auth = require("../middleware/auth");
const { callGrok } = require("../utils/grok");
const { callHuggingFace } = require("../utils/huggingface");
const { callGrokWithTools } = require("../utils/grokTools");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { getAvailableSlotsForDoctorAndDate } = require("../utils/slotHelper");

const router = express.Router();

const formatISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, numberOfDays) => {
  const next = new Date(date);
  next.setDate(next.getDate() + numberOfDays);
  return next;
};

const nextWeekdayDate = (weekday, referenceDate = new Date()) => {
  const current = new Date(referenceDate);
  const currentDay = current.getDay();
  const diff = (weekday - currentDay + 7) % 7 || 7;
  current.setDate(current.getDate() + diff);
  return current;
};

const parseTimeFromText = (text) => {
  const match = text.match(/(?:at|around|by|before|after)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = (match[3] || '').toLowerCase();

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseAppointmentState = (messages = []) => {
  const state = {
    doctorName: null,
    specialization: null,
    date: null,
    time: null,
    selectedSlot: null,
    patientRequest: '',
    intent: 'SEARCH_DOCTOR',
    bookingConfirmationPending: false,
  };

  const userMessages = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string');
  if (userMessages.length) {
    state.patientRequest = userMessages[userMessages.length - 1].content.trim();
  }

  const relevantText = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => m.content)
    .join(' ');

  const potentialDoctorNames = [];
  for (const message of messages) {
    const content = String(message?.content || '');
    if (!content) continue;

    const directMatch = content.match(/dr\.?\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){0,3})/i);
    if (directMatch) {
      potentialDoctorNames.push(directMatch[1]);
    }

    const prefixedMatch = content.match(/(?:doctor(?:\s+is)?|with|book\s+with|for)\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/i);
    if (prefixedMatch) {
      potentialDoctorNames.push(prefixedMatch[1]);
    }
  }

  const doctorName = potentialDoctorNames.find((name) => {
    const cleaned = name.replace(/\s+/g, ' ').trim();
    return cleaned && !/specialization|doctor|appointment|consult/i.test(cleaned);
  });

  if (doctorName) {
    state.doctorName = doctorName.replace(/\s+/g, ' ').trim();
  }

  const specializationMap = ['cardiologist', 'dermatologist', 'neurologist', 'gastroenterologist', 'orthopedic', 'general medicine', 'pediatrician', 'gynecologist'];
  const specializationFound = specializationMap.find((name) => new RegExp(name, 'i').test(relevantText));
  if (specializationFound) {
    state.specialization = specializationFound.charAt(0).toUpperCase() + specializationFound.slice(1);
  }

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  if (/\btoday\b/i.test(relevantText)) {
    state.date = formatISODate(today);
  } else if (/\btomorrow\b/i.test(relevantText)) {
    state.date = formatISODate(tomorrow);
  } else if (/\bday after tomorrow\b/i.test(relevantText)) {
    state.date = formatISODate(dayAfterTomorrow);
  } else if (/\bnext monday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(1, today));
  } else if (/\bnext tuesday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(2, today));
  } else if (/\bnext wednesday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(3, today));
  } else if (/\bnext thursday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(4, today));
  } else if (/\bnext friday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(5, today));
  } else if (/\bnext saturday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(6, today));
  } else if (/\bnext sunday\b/i.test(relevantText)) {
    state.date = formatISODate(nextWeekdayDate(0, today));
  } else {
    const explicitDate = relevantText.match(/\b(\d{1,2})\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i)
      || relevantText.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/i)
      || relevantText.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (explicitDate) {
      const value = explicitDate[0];
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        state.date = formatISODate(parsed);
      }
    }
  }

  const timeMatch = parseTimeFromText(relevantText);
  if (timeMatch) {
    state.time = timeMatch;
    state.selectedSlot = timeMatch;
  }

  if (state.doctorName || state.specialization || state.date || state.time) {
    state.intent = state.date && state.doctorName && state.time ? 'BOOKING' : state.date && state.doctorName ? 'CHECK_AVAILABILITY' : state.doctorName ? 'SELECT_DATE' : 'SEARCH_DOCTOR';
  }

  if (/(?:yes|confirm|confirmed|book it|book now|please book)/i.test(relevantText)) {
    state.bookingConfirmationPending = true;
    state.intent = 'BOOKING';
  }

  return state;
};

const buildAppointmentStatePrompt = (messages = []) => {
  const state = parseAppointmentState(messages);
  const summaryLines = [
    'Current appointment conversation state (this is the ground truth for the current chat; use it and do not ask again for already provided details):',
    `- doctorName: ${state.doctorName || 'not set'}`,
    `- specialization: ${state.specialization || 'not set'}`,
    `- date: ${state.date || 'not set'}`,
    `- time: ${state.time || 'not set'}`,
    `- selectedSlot: ${state.selectedSlot || 'not set'}`,
    `- patientRequest: ${state.patientRequest || 'not set'}`,
    `- intent: ${state.intent}`,
  ];

  const instructions = [
    'Rules for this conversation:',
    '1. Use the current appointment state above. Never ask again for doctor, date, or time if they are already present.',
    '2. If the patient gives a doctor name, search by doctor name first before asking for specialization.',
    '3. If the patient gives a date like today/tomorrow/next Monday or a specific date, resolve it and use it without re-asking.',
    '4. If the patient chooses a slot, keep the same doctor and date in context and do not restart the flow.',
    '5. If the user says yes/confirm/book it after a slot has been selected, treat that as confirmation and call bookAppointment immediately.',
    '6. Do not return to a generic search loop unless the user starts a brand-new request.',
  ];

  return [...summaryLines, '', ...instructions].join('\n');
};

const HEALTH_SYSTEM_PROMPT = `You are the Cure Link AI Health Assistant. Respond like a concise, conversational assistant. Answer only what the user asked, do not repeat their question, and use simple language. Keep the first response to 2-4 sentences unless the user asks for more detail. Do not automatically add sections about classification, brand names, mechanisms, uses, side effects, or other background information. Avoid unnecessary bullet lists. For follow-up questions, provide only the relevant additional information. Provide general health information only: do not diagnose diseases, prescribe medicines, or replace a doctor. Consider the user's described problem and remedies or treatments already tried. Mention safe next steps or when professional medical care may be needed when relevant. For emergencies, advise the user to seek immediate medical attention.`;

// POST /api/ai/chat  — UNCHANGED (existing health-info chatbot)
router.post("/chat", auth, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ msg: "Invalid or missing messages array." });
    }
    if (messages.length > 20) {
      return res.status(400).json({ msg: "Conversation context too long." });
    }

    const payload = [
      { role: "system", content: HEALTH_SYSTEM_PROMPT },
      ...messages,
    ];

    let aiResponse;
    try {
      aiResponse = await callGrok(payload, 400);
    } catch (grokErr) {
      console.warn("Grok chat failed, falling back to HF:", grokErr.message);
      aiResponse = await callHuggingFace(payload, 400);
    }

    res.json({ message: aiResponse });
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ msg: "Failed to generate AI response. Please try again." });
  }
});

// POST /api/ai/explain-note
router.post("/explain-note", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ msg: "Missing note content." });

    const prompt = `Explain the following clinical note in simple, easy-to-understand terms. Do not add information that is not present in the note. Be concise.\n\nNote:\n${content}`;
    const payload = [{ role: "user", content: prompt }];

    let aiResponse;
    try {
      aiResponse = await callGrok(payload, 400);
    } catch (grokErr) {
      console.warn("Grok explain failed, falling back to HF:", grokErr.message);
      aiResponse = await callHuggingFace(payload, 400);
    }

    res.json({ explanation: aiResponse });
  } catch (error) {
    console.error("AI Explain Note Error:", error.message);
    res.status(500).json({ msg: "Failed to explain note. Please try again." });
  }
});

// POST /api/ai/improve-note
router.post("/improve-note", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ msg: "Missing note content." });

    const prompt = `Review the following clinical note and identify only the most relevant missing information the user should consider adding.
  IMPORTANT:
  - Provide no more than 5 concise bullet points.
  - Keep each bullet to 1-2 lines and make it specific to this note.
  - Do not provide a generic clinical documentation checklist.
  - DO NOT rewrite the note.
  - DO NOT invent or assume any missing details; only suggest what fields or questions are missing.

Note:\n${content}`;
    const payload = [{ role: "user", content: prompt }];

    let aiResponse;
    try {
      aiResponse = await callGrok(payload, 400);
    } catch (grokErr) {
      console.warn("Grok improve failed, falling back to HF:", grokErr.message);
      aiResponse = await callHuggingFace(payload, 400);
    }

    res.json({ suggestions: aiResponse });
  } catch (error) {
    console.error("AI Improve Note Error:", error.message);
    res.status(500).json({ msg: "Failed to suggest improvements. Please try again." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS for LLM function-calling
// ─────────────────────────────────────────────────────────────────────────────

const APPOINTMENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "searchDoctors",
      description:
        "Search the database for verified doctors by specialization, name, or other criteria. Always call this first before showing any doctor to the patient.",
      parameters: {
        type: "object",
        properties: {
          specialization: {
            type: "string",
            description: "Medical specialization e.g. 'Cardiologist', 'Dermatologist', 'General Medicine'",
          },
          name: {
            type: "string",
            description: "Partial or full doctor name to search for",
          },
          sort: {
            type: "string",
            enum: ["rating", "experience", "fee-low", "fee-high", "availability"],
            description: "How to sort the results",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDoctorDetails",
      description: "Get the full profile of a specific doctor by their ID. Use this to get more info before checking availability.",
      parameters: {
        type: "object",
        properties: {
          doctorId: {
            type: "string",
            description: "The Doctor profile _id (from searchDoctors results)",
          },
        },
        required: ["doctorId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkDoctorAvailability",
      description:
        "Check which time slots are available for a specific doctor on a given date. Always call this BEFORE confirming any booking. NEVER assume a slot is available.",
      parameters: {
        type: "object",
        properties: {
          doctorId: {
            type: "string",
            description: "The Doctor profile _id",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
        },
        required: ["doctorId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bookAppointment",
      description:
        "Book an appointment for the patient. Only call this after the patient has EXPLICITLY confirmed. The patient ID is taken from the authenticated session automatically.",
      parameters: {
        type: "object",
        properties: {
          doctorId: {
            type: "string",
            description: "The Doctor profile _id (NOT the User _id — the backend resolves this)",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
          timeSlot: {
            type: "string",
            description: "Time in HH:MM 24-hour format e.g. '10:00', '14:30'",
          },
          reason: {
            type: "string",
            description: "Brief reason for the appointment",
          },
        },
        required: ["doctorId", "date", "timeSlot"],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TOOL EXECUTOR — runs on the backend, never exposes raw DB errors to LLM
// ─────────────────────────────────────────────────────────────────────────────

async function executeTool(toolName, args, patientUserId) {
  try {
    if (toolName === "searchDoctors") {
      const { specialization, name, sort = "availability" } = args;

      // Fetch verified doctors
      const verifiedUsers = await User.find({
        role: "doctor",
        $or: [{ verified: true }, { verificationStatus: "verified" }],
      })
        .select("_id name email avatar verified verificationStatus")
        .lean();

      const verifiedUserIds = verifiedUsers.map((u) => u._id);

      const query = {
        $or: [{ verified: true }, { user: { $in: verifiedUserIds } }],
      };
      if (specialization) {
        query.specialization = { $regex: specialization, $options: "i" };
      }

      let docs = await Doctor.find(query)
        .populate("user", "name email avatar verified verificationStatus")
        .lean();

      // Filter out unverified
      docs = docs.filter((doc) => {
        if (!doc.user) return false;
        return doc.user.verified === true || doc.user.verificationStatus === "verified" || doc.verified === true;
      });

      // Deduplicate
      const seen = new Set();
      docs = docs.filter((doc) => {
        const k = String(doc._id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // Name filter
      if (name) {
        const q = name.trim().toLowerCase();
        docs = docs.filter(
          (doc) =>
            (doc.user?.name || "").toLowerCase().includes(q) ||
            (doc.specialization || "").toLowerCase().includes(q)
        );
      }

      // Rating helper
      const avgRating = (doc) => {
        const r = doc.ratings || [];
        return r.length ? r.reduce((sum, x) => sum + Number(x.score || 0), 0) / r.length : 0;
      };

      docs.sort((a, b) => {
        if (sort === "rating") return avgRating(b) - avgRating(a);
        if (sort === "experience") return (b.experience || 0) - (a.experience || 0);
        if (sort === "fee-low") return (a.fees || 0) - (b.fees || 0);
        if (sort === "fee-high") return (b.fees || 0) - (a.fees || 0);
        return 0;
      });

      const results = docs.slice(0, 6).map((doc) => ({
        doctorId: String(doc._id),
        userUserId: String(doc.user?._id || ""),
        name: doc.user?.name || "Unknown Doctor",
        specialization: doc.specialization || "General Medicine",
        experience: doc.experience || 0,
        fees: doc.fees || 0,
        rating: Math.round(avgRating(doc) * 10) / 10,
        ratingCount: (doc.ratings || []).length,
        bio: doc.bio || "",
        clinic: doc.clinic || "",
        consultationMode: doc.consultationMode || "",
        verified: doc.verified || doc.user?.verified || false,
        avatar: doc.user?.avatar || null,
      }));

      if (results.length === 0) {
        return JSON.stringify({ found: false, message: "No verified doctors found matching your search." });
      }

      return JSON.stringify({ found: true, count: results.length, doctors: results });
    }

    if (toolName === "getDoctorDetails") {
      const { doctorId } = args;
      if (!doctorId) return JSON.stringify({ error: "doctorId is required" });

      const doc = await Doctor.findById(doctorId)
        .populate("user", "name email avatar verified verificationStatus phone")
        .lean();

      if (!doc) return JSON.stringify({ error: "Doctor not found" });
      if (!doc.verified && doc.user?.verificationStatus !== "verified") {
        return JSON.stringify({ error: "Doctor not found" });
      }

      const avgRating =
        (doc.ratings || []).length
          ? (doc.ratings || []).reduce((s, r) => s + Number(r.score || 0), 0) / doc.ratings.length
          : 0;

      return JSON.stringify({
        doctorId: String(doc._id),
        userUserId: String(doc.user?._id || ""),
        name: doc.user?.name || "Unknown Doctor",
        specialization: doc.specialization || "General Medicine",
        experience: doc.experience || 0,
        fees: doc.fees || 0,
        rating: Math.round(avgRating * 10) / 10,
        ratingCount: (doc.ratings || []).length,
        bio: doc.bio || "",
        clinic: doc.clinic || "",
        consultationMode: doc.consultationMode || "",
        qualification: doc.qualification || "",
        languages: doc.languages || [],
        workingHours: doc.workingHours || {},
        verified: doc.verified || doc.user?.verified || false,
      });
    }

    if (toolName === "checkDoctorAvailability") {
      const { doctorId, date } = args;
      if (!doctorId || !date) return JSON.stringify({ error: "doctorId and date are required" });

      // Validate date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });

      // Reject past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) return JSON.stringify({ error: "Cannot check availability for past dates." });

      const doc = await Doctor.findById(doctorId)
        .populate("user", "name verified verificationStatus")
        .lean();

      if (!doc) return JSON.stringify({ error: "Doctor not found" });
      if (!doc.verified && doc.user?.verificationStatus !== "verified") {
        return JSON.stringify({ error: "Doctor not found" });
      }

      const slots = await getAvailableSlotsForDoctorAndDate(doc, date);

      if (!slots || slots.length === 0) {
        return JSON.stringify({
          available: false,
          doctorId: String(doc._id),
          doctorName: doc.user?.name || "Doctor",
          date,
          message: "No available slots on this date. The doctor may not work on this day or all slots are booked.",
        });
      }

      // Format slots to 12h for display
      const formatted = slots.map((s) => {
        const [h, m] = s.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return { value: s, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` };
      });

      return JSON.stringify({
        available: true,
        doctorId: String(doc._id),
        doctorName: doc.user?.name || "Doctor",
        date,
        slots: formatted,
      });
    }

    if (toolName === "bookAppointment") {
      const { doctorId, date, timeSlot, reason = "" } = args;
      if (!doctorId || !date || !timeSlot) {
        return JSON.stringify({ error: "doctorId, date, and timeSlot are all required." });
      }

      // Resolve Doctor profile → User._id (Appointment.doctor must be User._id)
      const doc = await Doctor.findById(doctorId)
        .populate("user", "_id name verified verificationStatus")
        .lean();

      if (!doc) return JSON.stringify({ error: "Doctor not found." });
      if (!doc.verified && doc.user?.verificationStatus !== "verified") {
        return JSON.stringify({ error: "Doctor is not verified and cannot accept appointments." });
      }

      const doctorUserId = doc.user?._id;
      if (!doctorUserId) return JSON.stringify({ error: "Doctor account is incomplete." });

      // Validate date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) return JSON.stringify({ error: "Cannot book an appointment in the past." });

      // Validate time slot format HH:MM
      if (!/^\d{2}:\d{2}$/.test(timeSlot)) {
        return JSON.stringify({ error: "Invalid time slot format. Use HH:MM e.g. 10:00" });
      }

      // Build the appointment datetime (local date + time)
      const [year, month, day] = date.split("-").map(Number);
      const [hours, minutes] = timeSlot.split(":").map(Number);
      const apptDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      if (isNaN(apptDate.getTime())) return JSON.stringify({ error: "Invalid appointment date/time." });

      // Verify the slot is actually available (prevents double-booking)
      const slotStart = new Date(apptDate);
      const slotEnd = new Date(apptDate.getTime() + 60 * 1000); // 1-minute window

      const existing = await Appointment.findOne({
        doctor: { $in: [doctorUserId, doc._id] },
        date: { $gte: slotStart, $lt: slotEnd },
        status: { $in: ["requested", "confirmed", "approved", "waiting", "in_consultation"] },
      }).select("_id");

      if (existing) {
        // Return alternative slots so LLM can present them
        const altSlots = await getAvailableSlotsForDoctorAndDate(doc, date);
        const altFormatted = altSlots.map((s) => {
          const [h, m] = s.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          return { value: s, label: `${h12}:${String(m).padStart(2, "0")} ${ampm}` };
        });
        return JSON.stringify({
          booked: false,
          slotTaken: true,
          doctorId: String(doc._id),
          doctorName: doc.user?.name || "Doctor",
          date,
          alternativeSlots: altFormatted,
          message: "That slot was just booked by someone else.",
        });
      }

      // Create the appointment
      const appt = new Appointment({
        patient: patientUserId,
        doctor: doctorUserId,
        date: apptDate,
        reason: reason || "Appointment booked via AI Assistant",
        status: "requested",
      });
      await appt.save();

      // Format confirmation time
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      const timeLabel = `${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;

      // Human-readable date
      const dateLabel = apptDate.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return JSON.stringify({
        booked: true,
        appointmentId: String(appt._id),
        doctorName: doc.user?.name || "Doctor",
        specialization: doc.specialization || "",
        date: dateLabel,
        timeSlot: timeLabel,
        status: "requested",
        message: "Appointment successfully booked.",
      });
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (err) {
    console.error(`Tool execution error [${toolName}]:`, err.message);
    return JSON.stringify({ error: "An internal error occurred while processing your request." });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT for tool-calling chatbot
// ─────────────────────────────────────────────────────────────────────────────

const BOOKING_SYSTEM_PROMPT = `You are the CureLink AI Health Assistant — a friendly, knowledgeable healthcare assistant that helps patients with:
1. General health information, medicine questions, and symptom guidance.
2. Finding verified doctors and booking appointments through natural conversation.

IMPORTANT RULES:
- You are NOT a doctor. Do not diagnose diseases or prescribe treatments.
- For emergencies, always tell the patient to seek immediate medical attention.
- For appointment booking: ALWAYS use the tools. NEVER invent or assume doctor names, slots, or IDs.
- Only call bookAppointment after the patient has EXPLICITLY said yes/confirm/book it.
- NEVER assume a slot is available. Always call checkDoctorAvailability first.
- When you receive tool results, present them conversationally and clearly to the patient.
- Keep responses concise and friendly. Use the patient's name if available.
- If a search returns no results, suggest broadening the search.
- Today's date is ${new Date().toISOString().split("T")[0]}.
- Use the "Current appointment conversation state" below as the source of truth in the current conversation.
- Do not ask again for information already present in that current state.
- If the patient provides a doctor name, search by doctor name first instead of asking for specialization again.
- If the patient says yes/confirm/book it after a slot has already been selected, treat that as confirmation and call bookAppointment immediately.
- Do not return to a generic SEARCH_DOCTOR loop unless the user starts a brand-new request.

BOOKING WORKFLOW:
1. Patient asks for a doctor → call searchDoctors
2. Patient selects a doctor → call getDoctorDetails if needed
3. Patient mentions a date → call checkDoctorAvailability
4. Show available slots, ask which one they prefer
5. Patient picks a slot → confirm the details back to them
6. Patient says yes → call bookAppointment
7. Show the confirmation

For general health questions (medicines, symptoms, etc.) — answer directly without using tools.`;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat-with-tools — Enhanced chatbot with appointment booking
// ─────────────────────────────────────────────────────────────────────────────

router.post("/chat-with-tools", auth, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ msg: "Invalid or missing messages array." });
    }
    if (messages.length > 40) {
      return res.status(400).json({ msg: "Conversation context too long." });
    }

    // Ensure only valid roles and tool fields are passed to Groq
    const cleanMessages = messages.map((m) => {
      if (m.role === 'assistant' && m.tool_calls) {
        return { role: m.role, content: m.content || "", tool_calls: m.tool_calls };
      }
      if (m.role === 'tool') {
        return { role: m.role, content: String(m.content), tool_call_id: m.tool_call_id };
      }
      return { role: m.role, content: String(m.content) };
    });

    const statePrompt = buildAppointmentStatePrompt(messages);
    const payload = [
      { role: "system", content: `${BOOKING_SYSTEM_PROMPT}\n\n${statePrompt}` },
      ...cleanMessages,
    ];

    // Tool-calling loop: LLM may request multiple tool calls sequentially
    const MAX_TOOL_ROUNDS = 5;
    let richData = null;
    const newContext = []; // Stores messages generated in this request

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const choice = await callGrokWithTools(payload, APPOINTMENT_TOOLS, 1000);

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
        // Add the assistant's tool-call message to the payload
        payload.push(choice.message);
        newContext.push(choice.message);

        // Execute each tool call
        for (const tc of choice.message.tool_calls) {
          const toolName = tc.function.name;
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            args = {};
          }

          console.log(`[AI Tool] Executing: ${toolName}`, args);
          const toolResult = await executeTool(toolName, args, req.user.id);

          // Parse tool result for richData extraction
          try {
            const parsed = JSON.parse(toolResult);

            // Extract rich data for UI rendering
            if (toolName === "searchDoctors" && parsed.found && parsed.doctors) {
              richData = { type: "doctorList", doctors: parsed.doctors };
            } else if (toolName === "checkDoctorAvailability" && parsed.available && parsed.slots) {
              richData = {
                type: "slotPicker",
                doctorId: parsed.doctorId,
                doctorName: parsed.doctorName,
                date: parsed.date,
                slots: parsed.slots,
              };
            } else if (toolName === "bookAppointment" && parsed.booked) {
              richData = {
                type: "bookingConfirm",
                appointmentId: parsed.appointmentId,
                doctorName: parsed.doctorName,
                specialization: parsed.specialization,
                date: parsed.date,
                timeSlot: parsed.timeSlot,
                status: parsed.status,
              };
            } else if (toolName === "bookAppointment" && parsed.slotTaken && parsed.alternativeSlots) {
              richData = {
                type: "slotPicker",
                doctorId: parsed.doctorId,
                doctorName: parsed.doctorName,
                date: parsed.date,
                slots: parsed.alternativeSlots,
              };
            }
          } catch {
            // ignore parse errors for richData extraction
          }

          // Add tool result to payload
          const toolMsg = {
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          };
          payload.push(toolMsg);
          newContext.push(toolMsg);
        }

        // Continue the loop so the LLM can generate a response based on tool results
        continue;
      }

      // LLM has finished (no more tool calls)
      const finalMsg = choice.message || { role: 'assistant', content: "I'm sorry, I couldn't process that. Please try again." };
      newContext.push({
        role: finalMsg.role,
        content: finalMsg.content || "",
      });
      return res.json({ message: finalMsg.content || "", richData, newContext });
    }

    // Fallback if max rounds exceeded
    const fallbackMsg = { role: 'assistant', content: "I'm sorry, I ran into an issue processing your request. Please try again." };
    newContext.push(fallbackMsg);
    return res.json({
      message: fallbackMsg.content,
      richData: null,
      newContext
    });
  } catch (error) {
    console.error("AI Chat-with-Tools Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      providerMessage: error.response?.data?.error?.message,
    });
    res.status(500).json({ msg: "Failed to generate AI response. Please try again." });
  }
});

module.exports = router;
module.exports.extractAppointmentState = parseAppointmentState;
module.exports.buildAppointmentStatePrompt = buildAppointmentStatePrompt;
