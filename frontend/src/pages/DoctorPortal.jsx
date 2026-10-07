import React, { useContext, useEffect, useState } from "react";
import axios from "../api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

const emptyProfile = {
  specialization: "",
  qualification: "",
  experience: "",
  fees: "",
  phone: "",
  clinic: "",
  bio: "",
  workingHours: {
    days: [],
    start: "",
    end: "",
    breakStart: "",
    breakEnd: "",
    duration: 30,
  },
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });

const formatMessageTime = (value) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function DoctorPortal() {
  const { user, setUser } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const section = useLocation().pathname.split("/")[2] || "dashboard";
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [doctorThreads, setDoctorThreads] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadThreads = async () => {
    try {
      const response = await axios.get("/api/messages/conversations");
      const nextThreads = response.data || [];
      setDoctorThreads(nextThreads);
      if (!selectedPatientId && nextThreads.length) {
        setSelectedPatientId(nextThreads[0].patientId);
      }
    } catch (requestError) {
      console.error("Could not load doctor threads", requestError);
      setDoctorThreads([]);
    }
  };

  const openConversation = async (patientId) => {
    if (!patientId) {
      setThreadMessages([]);
      return;
    }

    try {
      const response = await axios.get(`/api/messages/conversation/${patientId}`);
      setThreadMessages(response.data || []);
    } catch (requestError) {
      console.error("Could not load conversation", requestError);
      setThreadMessages([]);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "doctor") {
      navigate("/");
      return;
    }

    Promise.all([
      axios.get("/api/appointments/my"),
      axios.get("/api/doctors/me/profile"),
      axios.get("/api/notifications").catch(() => ({ data: [] })),
      axios.get("/api/messages/conversations").catch(() => ({ data: [] })),
    ])
      .then(([appointmentsResponse, profileResponse, notifResponse, threadsResponse]) => {
        const nextProfile = { ...emptyProfile, ...profileResponse.data };
        setAppointments(appointmentsResponse.data || []);
        setNotifications(notifResponse.data || []);
        setDoctorThreads(threadsResponse.data || []);
        if (threadsResponse.data?.length) {
          setSelectedPatientId(threadsResponse.data[0].patientId);
        }
        setProfile(profileResponse.data);
        setForm({
          ...nextProfile,
          name: profileResponse.data.user?.name || user.name || "",
          email: profileResponse.data.user?.email || user.email || "",
          phone: profileResponse.data.user?.phone || user.phone || "",
        });
      })
      .catch((requestError) =>
        setError(
          requestError.response?.data?.msg ||
            "Could not load your doctor portal.",
        ),
      )
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedPatientId) {
      setThreadMessages([]);
      return;
    }
    openConversation(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    if (section === "messages" && !selectedPatientId && doctorThreads.length) {
      setSelectedPatientId(doctorThreads[0].patientId);
    }
  }, [section, selectedPatientId, doctorThreads]);

  const updateStatus = async (id, status) => {
    setError("");
    try {
      const response = await axios.patch(
        `/api/appointments/doctor/${id}/status`,
        { status },
      );
      setAppointments((current) =>
        current.map((item) =>
          item._id === id ? { ...item, ...response.data } : item,
        ),
      );
      showToast(`Appointment status updated to ${status}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg ||
          "Could not update appointment status.",
      );
    }
  };

  const handleSendReply = async () => {
    if (!selectedPatientId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await axios.post("/api/messages/send", {
        patientId: selectedPatientId,
        text: replyText.trim(),
      });
      setReplyText("");
      await loadThreads();
      await openConversation(selectedPatientId);
      showToast("Reply sent.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg ||
          "Could not send the reply.",
      );
    } finally {
      setSendingReply(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await axios.put("/api/doctors/me/profile", form);
      setProfile(response.data);
      setForm({
        ...emptyProfile,
        ...response.data,
        name: response.data.user?.name || form.name,
        email: response.data.user?.email || form.email,
        phone: response.data.user?.phone || form.phone,
      });
      if (response.data.user)
        setUser((current) => ({
          ...current,
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone || "",
        }));
      showToast("Doctor profile saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.msg || "Could not save doctor profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const updateHours = (name, value) =>
    setForm((current) => ({
      ...current,
      workingHours: { ...current.workingHours, [name]: value },
    }));

  const toggleDay = (day) =>
    setForm((current) => ({
      ...current,
      workingHours: {
        ...current.workingHours,
        days: current.workingHours.days.includes(day)
          ? current.workingHours.days.filter((item) => item !== day)
          : [...current.workingHours.days, day],
      },
    }));

  const today = new Date();
  const todayKey = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const todaysAppointments = appointments
    .filter((item) => {
      const date = new Date(item.date);
      return (
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ).getTime() === todayKey
      );
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = appointments.filter(
    (item) =>
      new Date(item.date) >= today &&
      item.status !== "cancelled" &&
      item.status !== "rejected",
  );
  const completed = appointments.filter((item) => item.status === "completed");
  const patientCount = new Set(
    appointments.map((item) => item.patient?._id || item.patient),
  ).size;
  const missingProfile = !profile?.specialization;

  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading doctor portal...</span>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="min-w-0 w-full">
        <header className="border-b border-slate-200 bg-white">
          <div className="container-max flex min-h-16 items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section}
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                Dr. {user?.name || "Doctor"}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                setUser(null);
                navigate("/login");
              }}
              className="btn btn-ghost btn-sm text-red-600"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="container-max py-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {section === "dashboard" && (
            <Dashboard
              profile={profile}
              user={user}
              today={todaysAppointments}
              upcoming={upcoming}
              completed={completed}
              patientCount={patientCount}
              missingProfile={missingProfile}
              updateStatus={updateStatus}
              notifications={notifications}
            />
          )}
          {section === "messages" && (
            <MessagesSection
              threads={doctorThreads}
              selectedPatientId={selectedPatientId}
              onSelectPatient={(patientId) => setSelectedPatientId(patientId)}
              activeMessages={threadMessages}
              replyText={replyText}
              setReplyText={setReplyText}
              onSendReply={handleSendReply}
              sendingReply={sendingReply}
            />
          )}
          {section === "appointments" && (
            <Appointments
              appointments={appointments}
              updateStatus={updateStatus}
            />
          )}
          {section === "patients" && <Patients appointments={appointments} />}
          {section === "profile" && (
            <ProfileForm
              form={form}
              updateField={updateField}
              saveProfile={saveProfile}
              saving={saving}
            />
          )}
          {section === "availability" && (
            <Availability
              form={form}
              updateHours={updateHours}
              toggleDay={toggleDay}
              saveProfile={saveProfile}
              saving={saving}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Dashboard({
  profile,
  user,
  today,
  upcoming,
  completed,
  patientCount,
  missingProfile,
  updateStatus,
  notifications = [],
}) {
  const name = (profile?.user?.name || user?.name || "Doctor").replace(
    /^(Dr\.\s*)+/i,
    "",
  );
  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-medium text-sky-600">Clinical workspace</p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">
          Good morning, Dr. {name}
        </h2>
        <p className="mt-2 text-slate-500">
          Your professional workspace and care schedule.
        </p>
      </div>
      {missingProfile && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50 px-5 py-4">
          <div>
            <p className="font-semibold text-slate-900">
              Complete your doctor profile
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Add your specialization, qualification and availability to
              complete your profile.
            </p>
          </div>
          <Link to="/doctor/profile" className="btn btn-primary btn-sm">
            Complete Profile
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Patients", patientCount],
          ["Upcoming Appointments", upcoming.length],
          ["Completed Appointments", completed.length],
          ["Notifications", notifications.length],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      {notifications.length > 0 && (
        <section className="card mt-6">
          <h3 className="mb-3 text-lg font-bold text-slate-900">
            Recent Notifications
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n._id}
                className="rounded-lg border border-sky-100 bg-sky-50/60 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="card mt-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Today&apos;s appointments
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {today.length} scheduled today
            </p>
          </div>
          <Link
            to="/doctor/appointments"
            className="text-sm font-semibold text-sky-600"
          >
            Manage all
          </Link>
        </div>
        <AppointmentTable
          appointments={today}
          updateStatus={updateStatus}
          emptyMessage="No appointments scheduled for today."
        />
      </section>
    </>
  );
}

function MessagesSection({
  threads = [],
  selectedPatientId,
  onSelectPatient,
  activeMessages = [],
  replyText,
  setReplyText,
  onSendReply,
  sendingReply,
}) {
  const selectedThread =
    threads.find((thread) => thread.patientId === selectedPatientId) || threads[0];

  return (
    <section className="card overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
        <p className="mt-1 text-sm text-slate-500">
          Patient conversations and direct replies.
        </p>
      </div>

      <div className="grid min-h-[620px] lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="max-h-[620px] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                No conversations available yet.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  type="button"
                  key={thread.patientId}
                  onClick={() => onSelectPatient(thread.patientId)}
                  className={`w-full border-b border-slate-100 p-4 text-left transition-colors ${
                    selectedThread?.patientId === thread.patientId
                      ? "bg-sky-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {thread.patientName}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {thread.lastMessage}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {formatMessageTime(thread.lastMessageAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-[620px] flex-col bg-white">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">
              Select a patient to open the conversation.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedThread.patientName}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeChatMeta(selectedThread)}
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                {activeMessages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  activeMessages.map((message) => {
                    const isDoctorMessage = String(message.from) === String(message.doctorId || "");
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isDoctorMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            isDoctorMessage
                              ? "bg-sky-600 text-white"
                              : "bg-white text-slate-800"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">
                            {message.text}
                          </p>
                          <p
                            className={`mt-2 text-[10px] ${
                              isDoctorMessage ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-white p-4">
                <div className="flex gap-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Reply to patient..."
                    className="field-input min-h-[88px] flex-1 resize-none"
                  />
                  <button
                    type="button"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={onSendReply}
                    className="btn btn-primary self-end"
                  >
                    {sendingReply ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function activeChatMeta(thread) {
  return thread?.unreadCount > 0
    ? `${thread.unreadCount} unread message${thread.unreadCount === 1 ? "" : "s"}`
    : "Conversation synced";
}

function Appointments({ appointments, updateStatus }) {
  return (
    <section className="card">
      <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
      <p className="mt-1 text-sm text-slate-500">
        Appointments assigned to your account.
      </p>
      <div className="mt-6">
        <AppointmentTable
          appointments={appointments}
          updateStatus={updateStatus}
        />
      </div>
    </section>
  );
}

function AppointmentTable({
  appointments,
  updateStatus,
  emptyMessage = "No appointments assigned yet.",
}) {
  if (!appointments.length)
    return (
      <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Patient</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((item) => (
            <tr key={item._id}>
              <td>
                <div className="font-medium text-slate-900">
                  {formatTime(item.date)}
                </div>
                <div className="text-xs text-slate-400">
                  {formatDate(item.date)}
                </div>
              </td>
              <td>
                <div className="font-medium text-slate-900">
                  {item.patient?.name || "Patient"}
                </div>
                <div className="text-xs text-slate-400">
                  {item.patient?.email || ""}
                </div>
              </td>
              <td>{item.reason || "Consultation"}</td>
              <td>
                <span
                  className={`status-badge ${item.status === "confirmed" ? "status-confirmed" : item.status === "completed" ? "status-confirmed" : item.status === "cancelled" || item.status === "rejected" ? "bg-red-100 text-red-700" : "status-pending"}`}
                >
                  {item.status}
                </span>
              </td>
              <td>
                <div className="flex flex-wrap gap-1.5">
                  {item.status === "requested" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "confirmed")}
                        className="btn btn-primary btn-sm"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "cancelled")}
                        className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {item.status === "confirmed" && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "waiting")}
                        className="btn btn-secondary btn-sm"
                      >
                        Waiting
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "completed")}
                        className="btn btn-primary btn-sm"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "cancelled")}
                        className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {item.status === "waiting" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus(item._id, "in_consultation")
                        }
                        className="btn btn-primary btn-sm"
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(item._id, "cancelled")}
                        className="btn btn-sm bg-red-100 text-red-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {item.status === "in_consultation" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(item._id, "completed")}
                      className="btn btn-primary btn-sm"
                    >
                      Complete
                    </button>
                  )}
                  {(item.status === "completed" ||
                    item.status === "cancelled" ||
                    item.status === "rejected") && (
                    <span className="text-xs font-medium text-slate-400">
                      Finalized
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Patients({ appointments }) {
  const patients = [
    ...new Map(
      appointments
        .filter((item) => item.patient?._id)
        .map((item) => [item.patient._id, item.patient]),
    ).values(),
  ];
  return (
    <section className="card">
      <h2 className="text-2xl font-bold text-slate-900">Patients</h2>
      <p className="mt-1 text-sm text-slate-500">
        Patients connected to your appointments.
      </p>
      <div className="mt-6">
        {patients.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {patients.map((patient) => (
              <div
                key={patient._id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <h3 className="font-semibold text-slate-900">{patient.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{patient.email}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            No patients assigned yet.
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileForm({ form, updateField, saveProfile, saving }) {
  return (
    <form onSubmit={saveProfile} className="card max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900">Doctor Profile</h2>
      <p className="mt-1 text-sm text-slate-500">
        Complete your professional information.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {[
          ["name", "Full Name", "text"],
          ["email", "Email", "email"],
          ["phone", "Phone", "tel"],
          ["specialization", "Specialization", "text"],
          ["qualification", "Qualification", "text"],
          ["experience", "Experience (years)", "number"],
          ["fees", "Consultation Fee", "number"],
          ["clinic", "Hospital / Clinic", "text"],
        ].map(([name, label, type]) => (
          <label key={name} className="block">
            <span className="field-label">{label}</span>
            <input
              name={name}
              type={type}
              min={type === "number" ? 0 : undefined}
              required={[
                "name",
                "specialization",
                "experience",
                "fees",
              ].includes(name)}
              value={form[name] ?? ""}
              onChange={updateField}
              readOnly={name === "email"}
              className="field-input read-only:bg-slate-50"
            />
          </label>
        ))}
        <label className="block sm:col-span-2">
          <span className="field-label">About / Bio</span>
          <textarea
            name="bio"
            rows="5"
            value={form.bio || ""}
            onChange={updateField}
            className="field-input"
          />
        </label>
      </div>
      <button type="submit" disabled={saving} className="btn btn-primary mt-6">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}

function Availability({ form, updateHours, toggleDay, saveProfile, saving }) {
  const hours = form.workingHours || emptyProfile.workingHours;
  return (
    <form onSubmit={saveProfile} className="card max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900">
        Availability &amp; Working Hours
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Configure the schedule shown to patients.
      </p>
      <p className="field-label mt-6">Working days</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day) => (
          <button
            type="button"
            key={day}
            onClick={() => toggleDay(day)}
            className={`rounded-lg border px-3 py-2 text-sm ${hours.days.includes(day) ? "border-sky-600 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500"}`}
          >
            {day}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {[
          ["start", "Start time"],
          ["end", "End time"],
          ["duration", "Consultation minutes"],
        ].map(([name, label]) => (
          <label key={name}>
            <span className="field-label">{label}</span>
            <input
              type={name === "duration" ? "number" : "time"}
              min={name === "duration" ? 10 : undefined}
              value={hours[name] || ""}
              onChange={(event) =>
                updateHours(
                  name,
                  name === "duration"
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
              className="field-input"
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={saving} className="btn btn-primary mt-6">
        {saving ? "Saving..." : "Save Availability"}
      </button>
    </form>
  );
}
