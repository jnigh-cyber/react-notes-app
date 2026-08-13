export default function EmptyState({ title, message }) {
  return (
    <div
      data-testid="empty-state"
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <svg
        className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {title}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-slate-400 dark:text-slate-500">
        {message}
      </p>
    </div>
  );
}
