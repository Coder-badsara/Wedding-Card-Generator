import React, { useState } from 'react';
import { Archive, Download, ChevronDown, ChevronUp, FileText, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { formatMediaUrl } from '../../api/projectsApi';
import { retryBatch } from '../../api/batchesApi';

export default function BatchHistoryList({ batches, onRefreshBatches, onSelectBatchToPoll }) {
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const toggleExpand = (batchId) => {
    setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
  };

  const handleRetry = async (batchId) => {
    setRetryingId(batchId);
    try {
      await retryBatch(batchId);
      onSelectBatchToPoll(batchId);
      onRefreshBatches();
    } catch (err) {
      console.error('Retry failed', err);
    } finally {
      setRetryingId(null);
    }
  };

  if (!batches || batches.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-slate-400 shadow-sm">
        <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
        <h4 className="text-sm font-bold text-slate-700 font-serif">No Batches Generated Yet</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Submit guest names above to generate your first batch of personalized wedding invitation cards.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
            <Archive className="w-4 h-4 text-rose-800" />
            Generation History & Batches
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Past batches remain preserved and can be downloaded anytime.
          </p>
        </div>

        <button
          onClick={onRefreshBatches}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition-colors cursor-pointer"
          title="Refresh batches"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {batches.map((batch) => {
          const isExpanded = expandedBatchId === batch.id;
          const zipDownloadUrl = formatMediaUrl(batch.zip_url);

          return (
            <div
              key={batch.id}
              className="border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-150 shadow-2xs"
            >
              {/* Batch Header Bar */}
              <div className="p-4 bg-slate-50/70 hover:bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-mono">
                    Batch {batch.batch_number}
                  </span>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-serif">
                      {(batch.batch_name || `Batch ${batch.batch_number}`).replace(/Batch\s*#\s*/i, 'Batch ')}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {batch.total_guests} {batch.total_guests === 1 ? 'card' : 'cards'} •{' '}
                      {new Date(batch.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {batch.status === 'COMPLETED' && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Completed
                    </span>
                  )}
                  {batch.status === 'PROCESSING' && (
                    <button
                      onClick={() => onSelectBatchToPoll(batch.id)}
                      className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer animate-pulse"
                    >
                      Processing ({batch.processed_guests}/{batch.total_guests})
                    </button>
                  )}
                  {batch.status === 'FAILED' && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">
                      Failed
                    </span>
                  )}

                  {/* ZIP Download Button */}
                  {batch.status === 'COMPLETED' && zipDownloadUrl && (
                    <a
                      href={zipDownloadUrl}
                      download
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download ZIP
                    </a>
                  )}

                  {/* Retry Button if Failed */}
                  {batch.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetry(batch.id)}
                      disabled={retryingId === batch.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${retryingId === batch.id ? 'animate-spin' : ''}`} />
                      Retry Batch
                    </button>
                  )}

                  {/* Accordion Toggle */}
                  <button
                    onClick={() => toggleExpand(batch.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Card List */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-white">
                  {batch.error_message && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Failure reason:</span> {batch.error_message}
                      </div>
                    </div>
                  )}

                  {batch.cards && batch.cards.length > 0 ? (
                    <div>
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                        Generated Guest PDFs ({batch.cards.length})
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                        {batch.cards.map((card) => {
                          const cardDownloadUrl = formatMediaUrl(card.download_url);
                          return (
                            <div
                              key={card.id}
                              className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-rose-800 shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-slate-900">{card.guest_name}</span>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">{card.file_name}</p>
                                </div>
                              </div>

                              {cardDownloadUrl && (
                                <a
                                  href={cardDownloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-500 hover:text-rose-900 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                  title="Download / View Card PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No card records available for this batch.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
