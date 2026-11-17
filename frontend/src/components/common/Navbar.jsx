import React from 'react';
import { Sparkles, ArrowLeft, Heart, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentProject, onBackToDashboard }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          {currentProject ? (
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              All Cards
            </button>
          ) : null}

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-950 via-rose-900 to-amber-700 flex items-center justify-center text-amber-300 shadow-md ring-1 ring-amber-500/30">
            <Heart className="w-5 h-5 fill-amber-300/30 stroke-amber-300" />
          </div>

          <div>
            <h1
              style={{ fontFamily: "'Silver Editorial', 'Playfair Display', serif", fontStyle: 'italic' }}
              className="text-2xl text-slate-900 tracking-wide font-normal select-none"
            >
              Badsara <span className="text-rose-900">Studio</span>
            </h1>
            {currentProject && (
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md font-medium">
                Workspace: <span className="font-semibold text-rose-950">{currentProject.title}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
        </div>
      </div>
    </header>
  );
}
