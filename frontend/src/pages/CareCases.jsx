import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import axios from "../api";
import { AuthContext } from "../context/AuthContext";

const statuses = ["Active", "On Hold", "Completed"];
const teamRoles = ["Specialist", "Consultant"];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not available";
const statusClass = (status) =>
  status === "Completed"
    ? "status-completed"
    : status === "On Hold"
      ? "status-pending"
      : "status-confirmed";
const doctorName = (doctor) => doctor?.name || "Doctor";
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";
const notePreview = (content) =>
  content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
const sanitizeNoteHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
const markdownToHtml = (content) =>
  content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/^(?!<h[1-3]>|<li>)(.+)$/gm, "<p>$1</p>")
    .replace(/(<li>.*<\/li>\n?)+/g, (items) => `<ul>${items}</ul>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

function ErrorMessage({ error }) {
  return error ? (
    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  ) : null;
}

function RichTextToolbar({ editorRef, onChange }) {
  const [active, setActive] = useState({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedRange = useRef(null);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshState);
    return () => document.removeEventListener("selectionchange", refreshState);
  }, []);

  const refreshState = () =>
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      blockquote: document.queryCommandValue("formatBlock") === "blockquote",
      h2: document.queryCommandValue("formatBlock") === "h2",
    });

  const command = (name, value = null) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    onChange(editorRef.current?.innerHTML || "");
    refreshState();
  };

  const addLink = (event) => {
    event.preventDefault();
    if (savedRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (linkUrl.trim()) command("createLink", linkUrl.trim());
    setLinkOpen(false);
    setLinkUrl("");
  };

  const buttons = [
    ["Bold", "bold", "bold"],
    ["Italic", "italic", "italic"],
    ["Heading", "formatBlock", "h2"],
    ["Bullet List", "insertUnorderedList", null],
    ["Numbered List", "insertOrderedList", null],
    ["Quote", "formatBlock", "blockquote"],
  ];

  return (
    <div
      className="relative flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2"
      onMouseUp={refreshState}
      onKeyUp={refreshState}
    >
      {buttons.map(([label, name, value]) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${active[name === "formatBlock" ? value : name] ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-white hover:text-sky-700"}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command(name, value)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white hover:text-sky-700"
        onMouseDown={(event) => {
          event.preventDefault();
          const selection = window.getSelection();
          savedRange.current = selection?.rangeCount
            ? selection.getRangeAt(0).cloneRange()
            : null;
        }}
        onClick={() => setLinkOpen((value) => !value)}
      >
        Link
      </button>
      {linkOpen && (
        <form
          onSubmit={addLink}
          className="absolute left-2 top-full z-10 mt-1 flex gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          <input
            autoFocus
            className="field-input w-56"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <button className="btn btn-primary btn-sm">Apply</button>
        </form>
      )}
    </div>
  );
}

export default function CareCases() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const [cases, setCases] = useState([]);
  const [careCase, setCareCase] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageVisible, setMessageVisible] = useState(false);
  const [form, setForm] = useState({ patient: "", title: "", description: "" });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "Active",
  });
  const [memberForm, setMemberForm] = useState({
    doctor: "",
    role: "Specialist",
  });
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteModal, setNoteModal] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const noteEditorRef = useRef(null);

  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiResultType, setAiResultType] = useState("");

  useEffect(() => {
    if (!message) {
      setMessageVisible(false);
      return undefined;
    }

    setMessageVisible(true);
    const fadeTimer = setTimeout(() => setMessageVisible(false), 2700);
    const clearTimer = setTimeout(() => setMessage(""), 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [message]);

  useEffect(() => {
    setMessage("");
  }, [id]);

  const handleAiExplain = async () => {
    if (!noteForm.content.replace(/<[^>]*>/g, "").trim()) return;
    setAiAssistantOpen(false);
    setAiLoading(true);
    setAiResult("");
    setNoteError("");
    try {
      const response = await axios.post("/api/ai/explain-note", {
        content: noteForm.content,
      });
      setAiResult(response.data.explanation);
      setAiResultType("explanation");
    } catch (err) {
      setNoteError("Failed to get explanation from AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiImprove = async () => {
    if (!noteForm.content.replace(/<[^>]*>/g, "").trim()) return;
    setAiAssistantOpen(false);
    setAiLoading(true);
    setAiResult("");
    setNoteError("");
    try {
      const response = await axios.post("/api/ai/improve-note", {
        content: noteForm.content,
      });
      setAiResult(response.data.suggestions);
      setAiResultType("suggestions");
    } catch (err) {
      setNoteError("Failed to get suggestions from AI.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (noteModal && noteEditorRef.current) {
      noteEditorRef.current.innerHTML = sanitizeNoteHtml(noteForm.content);
    }
  }, [noteModal?._id]);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/cases");
      setCases(response.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg || "Could not load care cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`/api/cases/${id}`);
      setCareCase(response.data);
      setEditForm({
        title: response.data.title,
        description: response.data.description || "",
        status: response.data.status,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg || "Could not load this care case.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const response = await axios.get("/api/doctors");
      const currentUserId = String(user.id || user._id);
      const availableDoctors = (response.data || [])
        .map((doctor) => ({
          _id: doctor.user?._id || doctor.user,
          name: doctor.user?.name || doctor.name,
          email: doctor.user?.email || doctor.email,
        }))
        .filter((doctor) => doctor._id && String(doctor._id) !== currentUserId);
      setDoctors(availableDoctors);
    } catch (requestError) {
      setError(
        requestError.response?.status === 401
          ? "Your session has expired. Please sign in again."
          : "Unable to load registered doctors. Please try again.",
      );
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      setNotesLoading(true);
      setNoteError("");
      const response = await axios.get(`/api/cases/${id}/notes`);
      setNotes(response.data || []);
    } catch (requestError) {
      setNoteError(
        requestError.response?.data?.msg || "Unable to load clinical notes.",
      );
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "doctor") return;
    if (id) {
      loadCase();
      loadDoctors();
      loadNotes();
    } else loadCases();
  }, [id, user?.role]);

  const loadCreateOptions = async () => {
    try {
      setError("");
      setPatientsLoading(true);
      const appointmentsResponse = await axios.get("/api/appointments/my");
      const uniquePatients = new Map();
      for (const appointment of appointmentsResponse.data || []) {
        const patient = appointment.patient;
        if (patient?._id && !uniquePatients.has(String(patient._id)))
          uniquePatients.set(String(patient._id), patient);
      }
      setPatients([...uniquePatients.values()]);
      setShowCreate(true);
    } catch (requestError) {
      setError(
        requestError.response?.status === 401
          ? "Your session has expired. Please sign in again."
          : "Unable to load patients. Please try again.",
      );
    } finally {
      setPatientsLoading(false);
    }
  };

  const createCase = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await axios.post("/api/cases", form);
      setForm({ patient: "", title: "", description: "" });
      setShowCreate(false);
      setMessage("Care case created.");
      await loadCases();
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg || "Could not create the care case.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateCase = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const response = await axios.put(`/api/cases/${id}`, editForm);
      setCareCase(response.data);
      setMessage("Care case updated.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg || "Could not update the care case.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const response = await axios.post(`/api/cases/${id}/members`, memberForm);
      setCareCase((current) => ({ ...current, members: response.data }));
      setMemberForm({ doctor: "", role: "Specialist" });
      setMessage("Care team member added.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg ||
          "Could not add the care team member.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId) => {
    try {
      setError("");
      await axios.delete(`/api/cases/${id}/members/${memberId}`);
      setCareCase((current) => ({
        ...current,
        members: current.members.filter((member) => member._id !== memberId),
      }));
      setMessage("Care team member removed.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg ||
          "Could not remove the care team member.",
      );
    }
  };

  const openNoteEditor = (note) => {
    setNoteError("");
    const content = note?.content || "";
    setNoteForm({
      title: note?.title || "",
      content: content.trim().startsWith("<")
        ? content
        : markdownToHtml(content),
    });
    setNoteModal(note || { _id: null });
  };

  const saveNote = async (event) => {
    event.preventDefault();
    try {
      setNoteSaving(true);
      setNoteError("");
      if (
        !noteForm.title.trim() ||
        !noteForm.content.replace(/<[^>]*>/g, "").trim()
      ) {
        setNoteError("Note title and content are required.");
        return;
      }
      if (noteModal._id)
        await axios.put(`/api/cases/${id}/notes/${noteModal._id}`, noteForm);
      else await axios.post(`/api/cases/${id}/notes`, noteForm);
      setNoteModal(null);
      setNoteForm({ title: "", content: "" });
      await loadNotes();
      setMessage(
        noteModal._id ? "Clinical note updated." : "Clinical note saved.",
      );
    } catch (requestError) {
      setNoteError(
        requestError.response?.data?.msg || "Unable to save clinical note.",
      );
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async (note) => {
    if (
      !window.confirm(`Delete "${note.title}"? This action cannot be undone.`)
    )
      return;
    try {
      setNoteError("");
      await axios.delete(`/api/cases/${id}/notes/${note._id}`);
      await loadNotes();
      setMessage("Clinical note deleted.");
    } catch (requestError) {
      setNoteError(
        requestError.response?.data?.msg || "Unable to delete clinical note.",
      );
    }
  };

  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading care cases...</span>
      </div>
    );

  const isDoctor = user?.role === "doctor";
  const isPatient = user?.role === "patient";

  if (id) {
    const isPrimary =
      isDoctor &&
      String(careCase?.primaryDoctor?._id) === String(user.id || user._id);
    const canManageNotes =
      isPrimary ||
      (isDoctor &&
        careCase?.members?.some(
          (member) =>
            String(member.doctor?._id || member.doctor) ===
            String(user.id || user._id),
        )) ||
      (isPatient &&
        String(careCase?.patient?._id || careCase?.patient) ===
          String(user.id || user._id));
    return (
      <div className="page-shell">
        <div className="page-body max-w-5xl">
          <Link
            to="/doctor/cases"
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            ← Back to Care Cases
          </Link>
          <ErrorMessage error={error} />
          {message && (
            <div
              className={`mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition-opacity duration-300 ${messageVisible ? "opacity-100" : "opacity-0"}`}
            >
              {message}
            </div>
          )}
          {careCase && (
            <>
              <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                    Patient Care Case
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    {careCase.title}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Last updated {formatDate(careCase.updatedAt)}
                  </p>
                </div>
                <span
                  className={`status-badge ${statusClass(careCase.status)}`}
                >
                  {careCase.status}
                </span>
              </div>
              <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <form onSubmit={updateCase} className="card">
                  <h2 className="text-lg font-bold text-slate-900">
                    Case information
                  </h2>
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="field-label">Case title</span>
                      <input
                        className="field-input"
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            title: event.target.value,
                          })
                        }
                        disabled={!isPrimary}
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Description</span>
                      <textarea
                        className="field-input"
                        rows="6"
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            description: event.target.value,
                          })
                        }
                        disabled={!isPrimary}
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Status</span>
                      <select
                        className="field-input"
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            status: event.target.value,
                          })
                        }
                        disabled={!isPrimary}
                      >
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {isPrimary && (
                    <button className="btn btn-primary mt-5" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  )}
                </form>
                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900">
                    People involved
                  </h2>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Patient</dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {doctorName(careCase.patient)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Primary doctor</dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {doctorName(careCase.primaryDoctor)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Created</dt>
                      <dd className="mt-1 font-semibold text-slate-900">
                        {formatDate(careCase.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <section className="card mt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Clinical Notes
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Document important updates for this patient's care team.
                    </p>
                  </div>
                  {canManageNotes ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openNoteEditor()}
                    >
                      + Add Note
                    </button>
                  ) : null}
                </div>
                {noteError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {noteError}
                  </div>
                )}
                {notesLoading ? (
                  <div className="page-loading min-h-32">
                    Loading clinical notes...
                  </div>
                ) : notes.length ? (
                  <div className="mt-5 space-y-3">
                    {notes.map((note) => (
                      <article
                        key={note._id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {note.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {doctorName(note.doctorId)} ·{" "}
                              {formatDateTime(note.updatedAt || note.createdAt)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openNoteEditor(note)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteNote(note)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {notePreview(note.content)}
                          {note.content.length > 180 ? "..." : ""}
                        </p>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold text-sky-700">
                            View note
                          </summary>
                          <div className="clinical-note-content mt-3 border-t border-slate-100 pt-3">
                            {note.content.trim().startsWith("<") ? (
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeNoteHtml(note.content),
                                }}
                              />
                            ) : (
                              <ReactMarkdown>{note.content}</ReactMarkdown>
                            )}
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No clinical notes yet.
                  </div>
                )}
              </section>
              <section className="card mt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Care Team
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Doctors assigned to this patient case.
                    </p>
                  </div>
                  <span className="badge bg-sky-50 text-sky-700">
                    {careCase.members.length} members
                  </span>
                </div>
                <div className="mt-5 divide-y divide-slate-100">
                  {careCase.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {doctorName(member.doctor)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.role} · Added {formatDate(member.addedAt)}
                        </p>
                      </div>
                      {isPrimary && member.role !== "Primary Doctor" && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeMember(member._id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isPrimary && (
                  <form
                    onSubmit={addMember}
                    className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[1fr_0.6fr_auto]"
                  >
                    {doctorsLoading ? (
                      <p className="field-input text-slate-500">
                        Loading registered doctors...
                      </p>
                    ) : (
                      <select
                        className="field-input"
                        value={memberForm.doctor}
                        onChange={(event) =>
                          setMemberForm({
                            ...memberForm,
                            doctor: event.target.value,
                          })
                        }
                        required
                        disabled={!doctors.length}
                      >
                        <option value="">
                          {doctors.length
                            ? "Select a registered doctor"
                            : "No other registered doctors available"}
                        </option>
                        {doctors.map((doctor) => (
                          <option key={doctor._id} value={doctor._id}>
                            {doctor.name} · {doctor.email}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      className="field-input"
                      value={memberForm.role}
                      onChange={(event) =>
                        setMemberForm({
                          ...memberForm,
                          role: event.target.value,
                        })
                      }
                    >
                      <option>Specialist</option>
                      <option>Consultant</option>
                    </select>
                    <button
                      className="btn btn-primary"
                      disabled={saving || doctorsLoading || !doctors.length}
                    >
                      Add doctor
                    </button>
                  </form>
                )}
              </section>
              {noteModal && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="clinical-note-title"
                >
                  <form
                    onSubmit={saveNote}
                    className="card flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2
                          id="clinical-note-title"
                          className="text-xl font-bold text-slate-900"
                        >
                          Clinical Note
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Record a concise update for the care team.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 relative">
                        <div className="relative">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
                          >
                            AI Assistant
                          </button>
                          {aiAssistantOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-[70]">
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700 font-medium border-b border-slate-100"
                                onClick={handleAiExplain}
                              >
                                Explain this Note
                              </button>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                                onClick={handleAiImprove}
                              >
                                Suggest Improvements
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                          onClick={() => {
                            setNoteModal(null);
                            setAiResult("");
                            setAiResultType("");
                            setAiAssistantOpen(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <label className="mt-5 block">
                      <span className="field-label">Title</span>
                      <input
                        className="field-input"
                        value={noteForm.title}
                        onChange={(event) =>
                          setNoteForm({
                            ...noteForm,
                            title: event.target.value,
                          })
                        }
                        placeholder="Follow-up Consultation"
                        required
                      />
                    </label>

                    {aiLoading && (
                      <div className="mt-4 p-4 bg-sky-50 rounded-lg border border-sky-100 flex items-center gap-3 text-sky-700">
                        <div className="spinner !w-5 !h-5 !border-2" />
                        <span className="text-sm font-medium">
                          Asking AI Assistant...
                        </span>
                      </div>
                    )}

                    {!aiLoading && aiResult && (
                      <div className="mt-4 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-slate-800">
                            {aiResultType === "explanation"
                              ? "Note Explanation"
                              : "Suggested Improvements"}
                          </h3>
                          <button
                            type="button"
                            className="text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => setAiResult("")}
                          >
                            Dismiss
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto pr-2 text-sm leading-relaxed text-slate-600">
                          <ReactMarkdown
                            components={{
                              ul: ({ children }) => (
                                <ul className="list-disc space-y-1 pl-5">{children}</ul>
                              ),
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            }}
                          >
                            {aiResult}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <label className="mt-4 block">
                      <span className="field-label">Note</span>
                      <div className="overflow-hidden rounded-lg border border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                        <RichTextToolbar
                          editorRef={noteEditorRef}
                          onChange={(content) =>
                            setNoteForm({ ...noteForm, content })
                          }
                        />
                        <div
                          ref={noteEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="clinical-note-editor max-h-56 min-h-48 w-full overflow-y-auto px-3.5 py-3 text-sm outline-none"
                          onInput={(event) =>
                            setNoteForm({
                              ...noteForm,
                              content: event.currentTarget.innerHTML,
                            })
                          }
                          data-placeholder="Document the consultation, findings, and plan."
                        />
                      </div>
                    </label>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setNoteModal(null)}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-primary" disabled={noteSaving}>
                        {noteSaving ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-body max-w-6xl">
        <ErrorMessage error={error} />
        {message && (
          <div
            className={`mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition-opacity duration-300 ${messageVisible ? "opacity-100" : "opacity-0"}`}
          >
            {message}
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
              Clinical workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Care Cases
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Coordinate ongoing care with the doctors assigned to each patient.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={loadCreateOptions}
          >
            Create care case
          </button>
        </div>
        {cases.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cases.map((item) => (
              <Link
                key={item._id}
                to={`/doctor/cases/${item._id}`}
                className="card block transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-slate-900">{item.title}</h2>
                  <span className={`status-badge ${statusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Patient:{" "}
                  <span className="font-semibold text-slate-700">
                    {doctorName(item.patient)}
                  </span>
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <p className="text-slate-400">Primary doctor</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {doctorName(item.primaryDoctor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Care team</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {item.members.length} members
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Updated {formatDate(item.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state mt-8">
            <div className="empty-state-icon text-sky-600">
              <span className="text-2xl">+</span>
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              No care cases yet
            </h2>
            <p className="text-sm text-slate-500">
              Create a case to coordinate a patient's ongoing care.
            </p>
          </div>
        )}
        {showCreate && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-care-case-title"
          >
            <form
              onSubmit={createCase}
              className="card w-full max-w-xl shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="create-care-case-title"
                    className="text-xl font-bold text-slate-900"
                  >
                    Create Care Case
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use a patient connected to your appointments.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-slate-500"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
              {patientsLoading ? (
                <div className="page-loading min-h-32">Loading patients...</div>
              ) : (
                <>
                  {!patients.length && (
                    <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                      No patients are currently connected to you.
                    </p>
                  )}
                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="field-label">Patient</span>
                      <select
                        className="field-input"
                        value={form.patient}
                        onChange={(event) =>
                          setForm({ ...form, patient: event.target.value })
                        }
                        required
                        disabled={!patients.length}
                      >
                        <option value="">Select a patient</option>
                        {patients.map((patient) => (
                          <option key={patient._id} value={patient._id}>
                            {patient.name} · {patient.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="field-label">Case title</span>
                      <input
                        className="field-input"
                        value={form.title}
                        onChange={(event) =>
                          setForm({ ...form, title: event.target.value })
                        }
                        placeholder="e.g. Diabetes management"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Description</span>
                      <textarea
                        className="field-input"
                        rows="4"
                        value={form.description}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                        placeholder="Add the clinical care context for the team."
                      />
                    </label>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCreate(false);
                        setForm({ patient: "", title: "", description: "" });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={saving || !patients.length}
                    >
                      {saving ? "Creating..." : "Create Case"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
