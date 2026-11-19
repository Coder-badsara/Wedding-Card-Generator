import React, { useEffect, useState } from 'react';
import { UploadCloud, Sparkles, FolderOpen, AlertCircle, Loader2, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { getProjects, createProject, deleteProject, formatMediaUrl } from '../api/projectsApi';
import ConfirmModal from '../components/common/ConfirmModal';

export default function ProjectsDashboard({ onSelectProject }) {
  const [projects, setProjects] = useState(() => {
    try {
      const cached = localStorage.getItem('wedding_cached_projects_list');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('wedding_cached_projects_list');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete Project',
    isLoading: false,
    onConfirm: null,
  });

  const fetchProjects = async (isBackground = false) => {
    if (!isBackground && projects.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
      try {
        localStorage.setItem('wedding_cached_projects_list', JSON.stringify(data));
      } catch (e) {}
    } catch (err) {
      // If we already have projects from browser cache, don't disrupt the user with a blocking error
      setProjects((current) => {
        if (!current || current.length === 0) {
          setError('Connecting to card workspace... Getting things ready.');
          // Quietly auto-retry after 4s
          setTimeout(() => fetchProjects(true), 4000);
        }
        return current;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(projects.length > 0);
  }, []);

  const handleUploadFile = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      alert('Please upload a valid PDF file.');
      return;
    }

    setUploading(true);
    setError(null);

    const title = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('original_pdf', file);

    try {
      const newProject = await createProject(formData);
      setProjects((prev) => {
        const updated = [newProject, ...prev];
        try {
          localStorage.setItem('wedding_cached_projects_list', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      // Immediately open workspace!
      onSelectProject(newProject);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.original_pdf?.[0] ||
        'Failed to process card PDF. Ensure it is unlocked and not password-protected.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (e, project) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: `Delete Project?`,
      message: `Are you sure you want to delete "${project.title}" and all its generated batches and cards? This action cannot be undone.`,
      confirmText: 'Delete Project',
      confirmVariant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await deleteProject(project.id);
          setProjects((prev) => {
            const updated = prev.filter((p) => p.id !== project.id);
            try {
              localStorage.setItem('wedding_cached_projects_list', JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
          try {
            localStorage.removeItem(`wedding_cached_project_${project.id}`);
          } catch (e) {}
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          alert('Failed to delete project.');
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Direct Upload Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-200/80 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-rose-700" />
          <span>Wedding Card Bulk Personalized PDF Generator</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">
          Upload Your Wedding Invitation Card
        </h1>
      </div>

      {/* Prominent Drag & Drop Card Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative max-w-2xl mx-auto bg-white rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 shadow-sm ${
          dragActive
            ? 'border-rose-600 bg-rose-50/40 ring-4 ring-rose-100'
            : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <input
          type="file"
          id="quick-card-upload"
          accept=".pdf,application/pdf"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUploadFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {uploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-rose-800 animate-spin" />
            <h4 className="text-base font-bold text-slate-800">Processing Master Card...</h4>
            <p className="text-xs text-slate-400">Extracting vector layers and generating 150 DPI preview</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-800 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="quick-card-upload"
                className="text-base font-bold text-slate-900 hover:text-rose-900 cursor-pointer underline underline-offset-4 decoration-rose-300 transition-colors"
              >
                Click to browse wedding card PDF
              </label>
              <p className="text-xs text-slate-400">or drag and drop your PDF card here</p>
            </div>

            <span className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
              Single cards or multi-page card
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Existing Workspaces List */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Recent Card Workspaces</h2>
            <p className="text-xs text-slate-500">Revisit previous cards anytime to add more guests.</p>
          </div>

          <span className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700 shadow-2xs">
            {projects.length} {projects.length === 1 ? 'Workspace' : 'Workspaces'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-800" />
            <span className="text-xs">Loading workspaces...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
            <h4 className="text-sm font-bold text-slate-700">No Card Workspaces Yet</h4>
            <p className="text-xs text-slate-400 mt-1">Upload your wedding card above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => {
              const previewSrc = formatMediaUrl(p.preview_url);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p)}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
                >
                  <div className="relative bg-slate-900 aspect-[16/10] overflow-hidden flex items-center justify-center border-b border-slate-100">
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={p.title}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <FileText className="w-8 h-8 text-slate-500 stroke-1" />
                    )}

                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-slate-200">
                      {p.total_pages} Pages
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-900 transition-colors truncate font-serif">
                        {p.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {p.batches_count} {p.batches_count === 1 ? 'batch' : 'batches'} • {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={(e) => handleDelete(e, p)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-950 group-hover:translate-x-0.5 transition-transform">
                        Open Workspace
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant="danger"
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
