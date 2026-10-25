'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App-level error boundary caught an error:', error);
  }, [error]);

  return (
    <div id="app-error-boundary" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Something went wrong</h1>
      <p className="text-slate-600 text-sm mb-6 max-w-md">
        An unexpected error occurred. You can attempt to recover by reloading the view or returning to the home portal.
      </p>
      {error?.message && (
        <div className="mb-6 p-3 bg-rose-50/70 border border-rose-200 rounded-lg max-w-md text-xs text-rose-700 font-mono text-left break-words">
          {error.message}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          id="btn-error-retry"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          id="btn-error-home"
          onClick={() => {
            window.location.href = '/';
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Return Home
        </button>
      </div>
    </div>
  );
}
