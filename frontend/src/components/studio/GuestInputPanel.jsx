import React, { useState } from 'react';
import { Users, Send, Sparkles } from 'lucide-react';

export default function GuestInputPanel({ onGenerateBatch, generating }) {
  const [batchName, setBatchName] = useState('');
  const [rawGuestNames, setRawGuestNames] = useState(
    'राजेश शर्मा\nअमित शर्मा एवं सपरिवार\nराहुल शर्मा\nविकास शर्मा\nसुरेश शर्मा'
  );

  const guestLines = rawGuestNames
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const guestCount = guestLines.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (guestCount === 0) return;

    onGenerateBatch({
      batch_name: batchName.trim(),
      guest_names: rawGuestNames,
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
            <Users className="w-4 h-4 text-rose-800" />
            Generate Guest Cards
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Outputs 3-digit serial PDFs and an all-in-one ZIP archive.
          </p>
        </div>

        <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-200/80 shadow-2xs">
          {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Batch Label (Optional)
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. VIP Relatives & Close Friends"
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Guest Names (One per line)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Hindi & English Unicode Supported</span>
          </div>

          <textarea
            rows={5}
            value={rawGuestNames}
            onChange={(e) => setRawGuestNames(e.target.value)}
            placeholder="Type or paste guest names, one per line..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white resize-y"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Independent batch (never overwrites previous runs)
          </div>

          <button
            type="submit"
            disabled={generating || guestCount === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-900 via-rose-950 to-slate-950 hover:from-rose-800 hover:to-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-rose-950/20 active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {generating ? 'Queuing Batch...' : `Generate ${guestCount} ${guestCount === 1 ? 'Card' : 'Cards'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
