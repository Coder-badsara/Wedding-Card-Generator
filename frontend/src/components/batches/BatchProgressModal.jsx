import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Download, X, RefreshCw } from 'lucide-react';
import { getBatchStatus, retryBatch } from '../../api/batchesApi';
import { formatMediaUrl } from '../../api/projectsApi';

export default function BatchProgressModal({ batchId, isOpen, onClose, onBatchFinished }) {
  const [statusData, setStatusData] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isOpen || !batchId) return;

    let isMounted = true;
    let timer = null;

    const pollStatus = async () => {
      try {
        const data = await getBatchStatus(batchId);
        if (!isMounted) return;

        setStatusData(data);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          onBatchFinished();
        } else {
          timer = setTimeout(pollStatus, 1000);
        }
      } catch (err) {
        console.error('Failed to poll status', err);
        if (isMounted) {
          timer = setTimeout(pollStatus, 2000);
        }
      }
    };

    pollStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [batchId, isOpen, onBatchFinished]);

  if (!isOpen) return null;

  const isCompleted = statusData?.status === 'COMPLETED';
  const isFailed = statusData?.status === 'FAILED';
  const isProcessing = statusData?.status === 'PROCESSING' || statusData?.status === 'PENDING';

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryBatch(batchId);
      setStatusData((prev) => ({ ...prev, status: 'PROCESSING', error_message: '' }));
    } catch (err) {
      console.error('Retry failed', err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isProcessing && <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />}
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {isFailed && <AlertTriangle className="w-5 h-5 text-red-600" />}

            <h3 className="text-base font-bold text-slate-900">
              {isProcessing && 'Generating Invitation Cards...'}
              {isCompleted && 'Batch Complete!'}
              {isFailed && 'Generation Failed'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2 font-medium">
            <span>
              Generated {statusData?.processed_guests || 0} of {statusData?.total_guests || 0} cards
            </span>
            <span className="font-bold text-slate-900">{statusData?.progress_percentage || 0}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              style={{ width: `${statusData?.progress_percentage || 0}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isFailed
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-amber-500 to-maroon-700'
              }`}
            />
          </div>
        </div>

        {/* Failed Error Details */}
        {isFailed && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl space-y-2">
            <p className="font-semibold">Error Message:</p>
            <p className="font-mono text-[11px] bg-red-100/60 p-2 rounded">{statusData?.error_message || 'Unknown error occurred.'}</p>
            <p className="text-[11px] text-red-600">You can adjust the bounding box or name length, then retry.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {isCompleted && statusData?.zip_url && (
            <a
              href={formatMediaUrl(statusData.zip_url)}
              download
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download All as ZIP
            </a>
          )}

          {isFailed && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Retry Batch from Scratch
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {isCompleted ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
