import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import axios from "../api";

export default function PublicProject() {
  const { shareToken } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const resolveFileUrl = (url) =>
    url?.startsWith("http") ? url : `${axios.defaults.baseURL}${url}`;

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await axios.get(`/api/projects/public/${shareToken}`);
        setProject(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.msg || "This project is no longer publicly available.");
      } finally {
        setLoading(false);
      }
    };
    loadProject();
  }, [shareToken]);

  if (loading) return <div className="page-loading min-h-screen">Loading public project...</div>;
  if (error) return <div className="page-shell"><div className="page-body max-w-3xl"><div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-bold text-slate-900">{error}</h1></div></div></div>;

  return (
    <div className="page-shell">
      <div className="page-body max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2"><span className="badge bg-sky-50 text-sky-700">Public Project</span><span className="badge bg-slate-100 text-slate-600">Read-only</span></div><h1 className="mt-4 text-3xl font-bold text-slate-900">{project.name}</h1></div>
          <p className="text-sm text-slate-500">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
        </div>
        {project.description !== undefined && <section className="card mt-8"><h2 className="text-lg font-bold text-slate-900">Project Overview</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{project.description || "No overview provided."}</p></section>}
        {project.readme !== undefined && <section className="card mt-6"><h2 className="text-lg font-bold text-slate-900">README</h2><div className="clinical-note-content mt-4 text-sm text-slate-600"><ReactMarkdown>{project.readme || "No README provided."}</ReactMarkdown></div></section>}
        {project.files !== undefined && <section className="card mt-6"><h2 className="text-lg font-bold text-slate-900">Files</h2>{project.files.length ? <div className="mt-4 divide-y divide-slate-100">{project.files.map((file) => <div key={file._id || file.url} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 flex-1 truncate text-slate-700">{file.name}</span><a href={resolveFileUrl(file.url)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm flex-shrink-0">View file</a></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No public files.</p>}</section>}
      </div>
    </div>
  );
}
