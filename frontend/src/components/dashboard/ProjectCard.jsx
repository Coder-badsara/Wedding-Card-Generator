import React from 'react';
import { Calendar, Layers, FileText, Trash2, ArrowRight } from 'lucide-react';
import { formatMediaUrl } from '../../api/projectsApi';

export default function ProjectCard({ project, onOpen, onDelete }) {
  const previewSrc = formatMediaUrl(project.preview_url);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-rose-300/80 transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Thumbnail Aspect Box */}
      <div
        onClick={() => onOpen(project)}
        className="relative bg-slate-900 aspect-[16/11] overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-100 group-hover:opacity-95 transition-opacity"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={project.title}
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-slate-400 flex flex-col items-center">
            <FileText className="w-10 h-10 mb-2 stroke-1 text-slate-500" />
            <span className="text-xs">No preview available</span>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-slate-200/80">
          {project.total_pages} {project.total_pages === 1 ? 'Page' : 'Pages'}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3
            onClick={() => onOpen(project)}
            className="text-base font-bold text-slate-900 group-hover:text-rose-900 cursor-pointer transition-colors truncate font-serif"
            title={project.title}
          >
            {project.title}
          </h3>

          <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 font-medium">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              {project.batches_count} {project.batches_count === 1 ? 'batch' : 'batches'}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(project.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project);
            }}
            className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpen(project)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-rose-950 rounded-xl transition-all shadow-sm hover:gap-2 cursor-pointer"
          >
            Open Studio
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
