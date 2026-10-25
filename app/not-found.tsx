import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sky-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600 mb-4 border border-sky-200">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h1 className="text-2xl font-bold mb-2 text-sky-950">Page Not Found</h1>
      <p className="text-slate-600 text-sm mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        prefetch={false}
        className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );
}
