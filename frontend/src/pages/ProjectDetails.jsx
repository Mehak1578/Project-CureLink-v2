import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import axios from "../api";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const defaultSettings = { overview: true, readme: true, files: false };

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", readme: "" });
  const [share, setShare] = useState({ isPublic: false, publicContentSettings: defaultSettings });
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isOwner = useMemo(() => user?.role === "admin", [user]);
  const isMember = isOwner;
  const publicLink = project?.publicShareToken ? `${window.location.origin}/public/projects/${project.publicShareToken}` : "";
  const resolveFileUrl = (fileId) => `${axios.defaults.baseURL}/api/projects/${id}/files/${fileId}/download`;

  const loadProject = async () => {
    try {
      setError("");
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
      setForm({ name: response.data.name, description: response.data.description || "", readme: response.data.readme || "" });
      setShare({ isPublic: response.data.isPublic, publicContentSettings: { ...defaultSettings, ...response.data.publicContentSettings } });
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to load project.");
    }
  };

  useEffect(() => { loadProject(); }, [id]);

  const updateProject = async (event, successMessage = "Project updated.") => {
    event?.preventDefault();
    try {
      setSaving(true);
      setError("");
      await axios.put(`/api/projects/${id}`, form);
      showToast(successMessage);
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to update project.");
    } finally { setSaving(false); }
  };

  const updateSharing = async (isPublic = share.isPublic) => {
    try {
      setSaving(true);
      const response = await axios.post(`/api/projects/${id}/share`, { isPublic, publicContentSettings: share.publicContentSettings });
      setShare({ isPublic: response.data.isPublic, publicContentSettings: response.data.publicContentSettings });
      setProject((current) => ({ ...current, isPublic: response.data.isPublic, publicShareToken: response.data.publicShareToken }));
      showToast(isPublic ? "Public link generated." : "Project is private.");
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to update project sharing.");
    } finally { setSaving(false); }
  };

  const copyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      showToast("Public link copied.");
    } catch {
      setError("Unable to copy the public link.");
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      await axios.post(`/api/projects/${id}/files`, data);
      await loadProject();
      showToast("File uploaded.");
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to upload file.");
    } finally { setUploading(false); event.target.value = ""; }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`/api/projects/${id}/files/${fileId}`);
      await loadProject();
      showToast("File deleted.");
    } catch (requestError) { setError(requestError.response?.data?.msg || "Unable to delete file."); }
  };

  const deleteProject = async () => {
    try {
      setSaving(true);
      await axios.delete(`/api/projects/${id}`);
      setDeleteConfirmOpen(false);
      showToast("Project deleted successfully.");
      navigate("/projects");
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to delete project.");
    } finally {
      setSaving(false);
    }
  };

  if (!project && error) return <div className="page-shell"><div className="page-body max-w-4xl"><div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div></div></div>;
  if (!project) return <div className="page-loading min-h-screen">Loading project...</div>;

  return (
    <div className="page-shell">
      {deleteConfirmOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"><div className="card w-full max-w-md shadow-xl"><h2 className="text-xl font-bold text-slate-900">Delete Project?</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmOpen(false)} disabled={saving}>Cancel</button><button type="button" className="btn btn-danger btn-sm border border-red-200" onClick={deleteProject} disabled={saving}>{saving ? "Deleting..." : "Delete Project"}</button></div></div></div>}
      <div className="page-body max-w-5xl">
        <Link to="/projects" className="text-sm font-semibold text-sky-600 hover:text-sky-700">← Back to Projects</Link>
        {error && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className={`status-badge ${project.isPublic ? "status-confirmed" : "status-pending"}`}>{project.isPublic ? "Public" : "Private"}</span></div><h1 className="mt-2 text-3xl font-bold text-slate-900">{project.name}</h1><p className="mt-2 text-sm text-slate-500">Owned by {project.owner?.name || "Unknown"} · Updated {new Date(project.updatedAt).toLocaleDateString()}</p></div>{isOwner && <button type="button" className="btn btn-secondary" onClick={() => setShareOpen(true)}>Share Project</button>}</div>

        <form onSubmit={updateProject} className="card mt-8"><h2 className="text-lg font-bold text-slate-900">Project Overview</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block"><span className="field-label">Project name</span><input className="field-input" value={form.name} disabled={!isMember} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="block"><span className="field-label">Description</span><textarea className="field-input" rows="3" value={form.description} disabled={!isMember} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div>{isMember && <button className="btn btn-primary mt-5" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>}</form>

        <section className="card mt-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-bold text-slate-900">README</h2><span className="text-xs text-slate-400">Markdown supported</span></div><textarea className="field-input mt-4 font-mono text-sm" rows="10" value={form.readme} disabled={!isMember} onChange={(event) => setForm({ ...form, readme: event.target.value })} />{isMember && <button type="button" className="btn btn-primary mt-4" onClick={() => updateProject(undefined, "README saved.")} disabled={saving}>Save README</button>}{form.readme && <div className="clinical-note-content mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600"><ReactMarkdown>{form.readme}</ReactMarkdown></div>}</section>

        <section className="card mt-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Files</h2><p className="mt-1 text-sm text-slate-500">Project files are private unless explicitly shared.</p></div>{isMember && <label className="btn btn-secondary btn-sm cursor-pointer">{uploading ? "Uploading..." : "Upload file"}<input type="file" className="hidden" onChange={uploadFile} disabled={uploading} /></label>}</div>{project.files.length ? <div className="mt-5 divide-y divide-slate-100">{project.files.map((file) => <div key={file._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><a href={resolveFileUrl(file._id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-sky-700 hover:text-sky-800">{file.name}</a><div className="flex flex-shrink-0 items-center gap-3"><span className="text-xs text-slate-400">{Math.ceil(file.size / 1024)} KB</span>{isMember && <button type="button" className="btn btn-danger btn-sm border border-red-200" onClick={() => deleteFile(file._id)}>Delete</button>}</div></div>)}</div> : <p className="mt-5 text-sm text-slate-500">No files uploaded.</p>}</section>

        <section className="card mt-6"><h2 className="text-lg font-bold text-slate-900">Members</h2><div className="mt-4 divide-y divide-slate-100"><div className="py-3 text-sm"><p className="font-semibold text-slate-900">{project.owner?.name}</p><p className="text-slate-500">Owner</p></div>{project.members.map((member) => <div key={member._id} className="py-3 text-sm"><p className="font-semibold text-slate-900">{member.name}</p><p className="text-slate-500">{member.email}</p></div>)}</div></section>
        {isOwner && <div className="mt-8 border-t border-slate-200 pt-6"><button type="button" className="btn btn-danger btn-sm border border-red-200" onClick={() => setDeleteConfirmOpen(true)}>Delete Project</button></div>}

        {shareOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"><div className="card w-full max-w-md shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Share Project</h2><p className="mt-1 text-sm text-slate-500">Choose exactly what visitors can view.</p></div><button type="button" className="text-sm text-slate-500" onClick={() => setShareOpen(false)}>Close</button></div><fieldset className="mt-5"><legend className="field-label">Visibility</legend><div className="flex gap-5 text-sm text-slate-700"><label className="flex items-center gap-2"><input type="radio" checked={!share.isPublic} onChange={() => setShare({ ...share, isPublic: false })} />Private</label><label className="flex items-center gap-2"><input type="radio" checked={share.isPublic} onChange={() => setShare({ ...share, isPublic: true })} />Public</label></div></fieldset><fieldset className="mt-5"><legend className="field-label">Public content</legend>{[["overview", "Project Overview"], ["readme", "README"], ["files", "Files"]].map(([key, label]) => <label key={key} className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={share.publicContentSettings[key]} onChange={(event) => setShare({ ...share, publicContentSettings: { ...share.publicContentSettings, [key]: event.target.checked } })} />{label}</label>)}</fieldset><div className="mt-6 flex flex-wrap justify-end gap-3">{project.isPublic && <button type="button" className="btn btn-secondary" onClick={() => updateSharing(false)} disabled={saving}>Make Private</button>}{project.isPublic && publicLink && <button type="button" className="btn btn-secondary" onClick={copyLink}>Copy Link</button>}<button type="button" className="btn btn-primary" onClick={() => updateSharing(true)} disabled={saving}>{saving ? "Saving..." : "Generate Public Link"}</button></div>{project.isPublic && publicLink && <p className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{publicLink}</p>}</div></div>}
      </div>
    </div>
  );
}
