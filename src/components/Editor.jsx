export default function Editor({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck="false"
      data-testid="editor"
      placeholder="# Start writing&#10;&#10;Your markdown renders live on the right."
      className="h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-600"
    />
  );
}
