import React, { useState } from 'react';
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { createProject } from '../../api/projectsApi';

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

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
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
        if (!title) {
          setTitle(droppedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
        }
        setError(null);
      } else {
        setError('Please upload a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required.');
      return;
    }
    if (!file) {
      setError('Please select a wedding card PDF.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('original_pdf', file);

    try {
      const newProject = await createProject(formData);
      onProjectCreated(newProject);
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.original_pdf?.[0] ||
        err.response?.data?.error ||
        err.message ||
        'Failed to upload PDF. Ensure it is unlocked and not password-protected.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create New Card Project</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a master wedding card PDF to create an independent workspace.</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Project Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Megha & Virendra Singh Wedding"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-maroon-600 focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Master Card PDF
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive
                  ? 'border-maroon-500 bg-maroon-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="pdf-upload"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">{file.name}</span>
                  <span className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <label
                    htmlFor="pdf-upload"
                    className="mt-3 text-xs font-semibold text-maroon-700 hover:text-maroon-800 cursor-pointer underline"
                  >
                    Replace with another PDF
                  </label>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Drag and drop your wedding card PDF here, or{' '}
                    <label htmlFor="pdf-upload" className="text-maroon-700 font-semibold cursor-pointer hover:underline">
                      browse
                    </label>
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Multi-page brochures or single cards supported (unlocked)</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-maroon-900/10"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processing Card...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
