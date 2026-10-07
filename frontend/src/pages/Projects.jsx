import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api";

const emptyForm = { name: "", description: "", readme: "" };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/projects");
      setProjects(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await axios.post("/api/projects", form);
      setForm(emptyForm);
      setShowCreate(false);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.response?.data?.msg || "Unable to create project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-body max-w-6xl">
        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Projects</h1>
            <p className="mt-2 text-sm text-slate-500">Create and share lightweight project workspaces.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
        </div>

        {loading ? (
          <div className="page-loading min-h-48">Loading projects...</div>
        ) : projects.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link key={project._id} to={`/projects/${project._id}`} className="card block transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-slate-900">{project.name}</h2>
                  <span className={`status-badge ${project.isPublic ? "status-confirmed" : "status-pending"}`}>
                    {project.isPublic ? "Public" : "Private"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-500">{project.description || "No project description yet."}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <div>
                    <p className="text-slate-400">Owner</p>
                    <p className="mt-1 font-medium text-slate-700">{project.owner?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Updated</p>
                    <p className="mt-1 font-medium text-slate-700">{new Date(project.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No projects yet.</div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={createProject} className="card w-full max-w-lg shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-xl font-bold text-slate-900">Create Project</h2><p className="mt-1 text-sm text-slate-500">Start a private project workspace.</p></div>
                <button type="button" className="text-sm text-slate-500" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
              <label className="mt-5 block"><span className="field-label">Project name</span><input className="field-input" placeholder="Diabetes Awareness Program" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="mt-4 block"><span className="field-label">Description</span><textarea className="field-input" rows="4" placeholder="A community health awareness initiative focused on diabetes prevention and education." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label className="mt-4 block"><span className="field-label">README</span><textarea className="field-input" rows="5" placeholder="# Diabetes Awareness Program&#10;&#10;## Objective&#10;&#10;Promote awareness about diabetes prevention, healthy lifestyle practices, and early screening.&#10;&#10;## Activities&#10;&#10;- Community awareness sessions&#10;- Educational resources&#10;- Health screening information&#10;- Preventive health guidance&#10;&#10;## Resources&#10;&#10;Educational materials and program documents are available in the project files." value={form.readme} onChange={(event) => setForm({ ...form, readme: event.target.value })} /></label>
              <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create Project"}</button></div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
