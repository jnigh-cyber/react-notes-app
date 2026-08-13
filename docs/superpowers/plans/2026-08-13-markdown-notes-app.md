# Markdown Notes App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-local markdown note-taking app with live split-view preview, debounced localStorage persistence, search, and a dark/light toggle.

**Architecture:** A single `useNotes` hook owns all note state and persistence; `App` wires hooks to presentational components and holds only UI state (search query, mobile drawer, mobile tab). Pure logic lives in `lib/notes.js`, and `lib/storage.js` is the only module that touches `localStorage`.

**Tech Stack:** Vite, React 19, Tailwind v4 (`@tailwindcss/vite`), `react-markdown`, `remark-gfm`, `@tailwindcss/typography`.

**Spec:** `docs/superpowers/specs/2026-08-13-markdown-notes-app-design.md`

## Global Constraints

- Project root is `workspace/play-a-round/react-notes-app`. All paths below are relative to it.
- Functional components and hooks only. No class components.
- Storage keys are exactly `react-notes-app.notes.v1` and `react-notes-app.theme`.
- Note shape is exactly `{ id, body, createdAt, updatedAt }`. **No stored `title` field** — title is always derived from `body`.
- The markdown preview is **never** debounced. Only the `localStorage` write is, at **500 ms**.
- `lib/storage.js` is the only module allowed to reference `localStorage`.
- Dark mode uses a `.dark` class on `<html>`, driven by `@custom-variant dark (&:where(.dark, .dark *));`.
- Below the `md` breakpoint (768px): sidebar is an off-canvas drawer; editor/preview become a tab toggle.
- Out of scope, do not build: export, folders, tags, pinning, markdown toolbar, keyboard shortcuts, sync, note history.

### Deviations from the spec (deliberate)

1. **`@tailwindcss/typography` is added** beyond the spec's dependency list. Tailwind's preflight resets all heading and list styles, so without it a rendered markdown preview is undifferentiated body text — which defeats the app's core feature. Applied as `prose dark:prose-invert`.
2. **No automated tests.** The spec calls for manual verification of this prototype. Each task therefore ends with explicit browser verification steps rather than a failing-test cycle.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json`, `vite.config.js`, `index.html` | Build config and HTML entry |
| `src/main.jsx` | React root mount |
| `src/index.css` | Tailwind import, dark variant, typography plugin |
| `src/lib/notes.js` | Pure note logic: create, derive title, search, sort, format date |
| `src/lib/storage.js` | The only `localStorage` boundary; safe reads and writes |
| `src/hooks/useDebouncedEffect.js` | Generic debounced effect |
| `src/hooks/useNotes.js` | Note state, CRUD, debounced persistence |
| `src/hooks/useTheme.js` | Theme state, `.dark` class sync, persistence |
| `src/components/Editor.jsx` | Textarea bound to the selected note's body |
| `src/components/Preview.jsx` | `react-markdown` + `remark-gfm` render |
| `src/components/SplitPane.jsx` | Editor \| preview layout, mobile tab switch |
| `src/components/SearchBar.jsx` | Controlled search input |
| `src/components/NoteListItem.jsx` | One note row with inline delete confirm |
| `src/components/Sidebar.jsx` | Search + list + new-note button + drawer shell |
| `src/components/ThemeToggle.jsx` | Sun/moon button |
| `src/components/EmptyState.jsx` | Empty-list and no-selection messaging |
| `src/App.jsx` | Layout and wiring only |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `src/main.jsx`, `src/index.css`, `src/App.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a running dev server; `src/index.css` exporting the `dark` custom variant that every later component's `dark:` classes depend on.

> Scaffolding is done by hand rather than `npm create vite`, because that command prompts interactively when the directory is non-empty (`docs/` already exists here) and would stall an automated run.

- [ ] **Step 1: Initialize the package and install dependencies**

```bash
cd "c:/Users/Taylor/Desktop/workspace/play-a-round/react-notes-app"
git init
npm init -y
npm install react react-dom react-markdown remark-gfm
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite @tailwindcss/typography
```

- [ ] **Step 2: Set the package scripts and module type**

Edit `package.json` so that the `name`, `type`, and `scripts` fields read exactly as below. Leave the generated `dependencies` and `devDependencies` blocks untouched.

```json
{
  "name": "react-notes-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notes</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules
dist
.DS_Store
*.local
```

- [ ] **Step 6: Create `src/index.css`**

The `@custom-variant` line is what rebinds `dark:` from the OS preference to a `.dark` class. Without it the theme toggle in Task 5 silently does nothing.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:where(.dark, .dark *));

html,
body,
#root {
  height: 100%;
}
```

- [ ] **Step 7: Create `src/main.jsx`**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Create a placeholder `src/App.jsx`**

```jsx
export default function App() {
  return (
    <div className="p-8 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
      Scaffold OK
    </div>
  );
}
```

- [ ] **Step 9: Verify the scaffold**

Run: `npm run dev`
Expected: Vite prints a `http://localhost:5173` URL with no errors. Open it — "Scaffold OK" renders large, bold, and green. Green-and-bold proves Tailwind is compiling; unstyled black text means the Vite plugin is not wired up.

- [ ] **Step 10: Verify the dark variant is active**

In the browser devtools console, run `document.documentElement.classList.add("dark")`.
Expected: nothing visibly changes yet (no `dark:` classes are in play beyond the text color, which should shift to a lighter green). If the text color does not change, the `@custom-variant` line is wrong — fix before continuing.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + tailwind v4"
```

---

### Task 2: Pure note logic

**Files:**
- Create: `src/lib/notes.js`

**Interfaces:**
- Consumes: nothing. This module is pure — no React, no storage, no DOM.
- Produces:
  - `createNote(): Note` where `Note = { id: string, body: string, createdAt: number, updatedAt: number }`
  - `deriveTitle(body: string): string`
  - `searchNotes(notes: Note[], query: string): Note[]`
  - `sortByUpdated(notes: Note[]): Note[]`
  - `formatDate(timestamp: number): string`

- [ ] **Step 1: Create `src/lib/notes.js`**

`newId` falls back to a timestamp-plus-random string because `crypto.randomUUID` is only defined in a secure context — it works on `localhost` but throws if the dev server is opened over plain HTTP on a LAN address.

```js
const TITLE_MAX = 60;

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNote() {
  const now = Date.now();
  return { id: newId(), body: "", createdAt: now, updatedAt: now };
}

export function deriveTitle(body) {
  const firstLine = (body || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return "Untitled";

  const stripped = firstLine.replace(/^#{1,6}\s*/, "").trim();
  if (!stripped) return "Untitled";

  return stripped.length > TITLE_MAX
    ? `${stripped.slice(0, TITLE_MAX)}\u2026`
    : stripped;
}

export function searchNotes(notes, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return notes;
  return notes.filter(
    (note) =>
      deriveTitle(note.body).toLowerCase().includes(q) ||
      (note.body || "").toLowerCase().includes(q)
  );
}

export function sortByUpdated(notes) {
  return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
```

- [ ] **Step 2: Verify in the browser console**

With `npm run dev` running, open the app and paste into the devtools console:

```js
const m = await import("/src/lib/notes.js");
console.log(m.deriveTitle("# Hello world\nrest"));  // "Hello world"
console.log(m.deriveTitle("   \n\nplain line"));    // "plain line"
console.log(m.deriveTitle(""));                      // "Untitled"
console.log(m.deriveTitle("###   "));                // "Untitled"
console.log(m.deriveTitle("x".repeat(80)).length);   // 61 (60 + ellipsis)
console.log(m.searchNotes(
  [{ body: "# Groceries" }, { body: "# Recipes" }], "gro"
).length);                                           // 1
console.log(m.createNote());                         // id/body/createdAt/updatedAt
```

Expected: each line matches the commented value.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add pure note logic"
```

---

### Task 3: Storage boundary

**Files:**
- Create: `src/lib/storage.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `loadNotes(): Note[]` — always returns an array, never throws
  - `saveNotes(notes: Note[]): void` — never throws
  - `loadTheme(): "dark" | "light" | null`
  - `saveTheme(theme: "dark" | "light"): void` — never throws

- [ ] **Step 1: Create `src/lib/storage.js`**

Every access is wrapped. A corrupt entry must not white-screen the app, and a failed write (quota exceeded, Safari private mode) must not propagate into render.

```js
const NOTES_KEY = "react-notes-app.notes.v1";
const THEME_KEY = "react-notes-app.theme";

function isValidNote(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.body === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

export function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidNote);
  } catch (error) {
    console.warn("Could not read notes from localStorage:", error);
    return [];
  }
}

export function saveNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn("Could not save notes to localStorage:", error);
  }
}

export function loadTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch (error) {
    console.warn("Could not read theme from localStorage:", error);
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("Could not save theme to localStorage:", error);
  }
}
```

- [ ] **Step 2: Verify corrupt-data resilience**

In the devtools console:

```js
const s = await import("/src/lib/storage.js");
localStorage.setItem("react-notes-app.notes.v1", "{{{not json");
console.log(s.loadNotes());                   // [] plus a console warning
localStorage.setItem("react-notes-app.notes.v1", '{"a":1}');
console.log(s.loadNotes());                   // [] (object, not array)
localStorage.setItem("react-notes-app.notes.v1", '[{"id":"x"}]');
console.log(s.loadNotes());                   // [] (fails isValidNote)
localStorage.removeItem("react-notes-app.notes.v1");
console.log(s.loadTheme());                   // null
```

Expected: every call returns the commented value and none of them throws.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add safe localStorage boundary"
```

---

### Task 4: Note state hook

**Files:**
- Create: `src/hooks/useDebouncedEffect.js`, `src/hooks/useNotes.js`

**Interfaces:**
- Consumes: `createNote`, `sortByUpdated` from `lib/notes.js`; `loadNotes`, `saveNotes` from `lib/storage.js`.
- Produces: `useNotes()` returning
  `{ notes: Note[], selectedNote: Note | null, selectedId: string | null, addNote(): void, updateNoteBody(id: string, body: string): void, deleteNote(id: string): void, selectNote(id: string): void }`.
  `notes` is **already sorted** by `updatedAt` descending — consumers must not re-sort.

- [ ] **Step 1: Create `src/hooks/useDebouncedEffect.js`**

The callback is held in a ref so that a changing closure does not restart the timer; only the listed dependencies do.

```js
import { useEffect, useRef } from "react";

export function useDebouncedEffect(callback, deps, delay) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const timer = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
```

- [ ] **Step 2: Create `src/hooks/useNotes.js`**

```jsx
import { useCallback, useMemo, useState } from "react";
import { createNote, sortByUpdated } from "../lib/notes.js";
import { loadNotes, saveNotes } from "../lib/storage.js";
import { useDebouncedEffect } from "./useDebouncedEffect.js";

const SAVE_DELAY_MS = 500;

export function useNotes() {
  const [rawNotes, setRawNotes] = useState(loadNotes);
  const [selectedId, setSelectedId] = useState(
    () => sortByUpdated(loadNotes())[0]?.id ?? null
  );

  const notes = useMemo(() => sortByUpdated(rawNotes), [rawNotes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  useDebouncedEffect(() => saveNotes(rawNotes), [rawNotes], SAVE_DELAY_MS);

  const addNote = useCallback(() => {
    const note = createNote();
    setRawNotes((current) => [note, ...current]);
    setSelectedId(note.id);
  }, []);

  const updateNoteBody = useCallback((id, body) => {
    setRawNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, body, updatedAt: Date.now() } : note
      )
    );
  }, []);

  const deleteNote = useCallback((id) => {
    setRawNotes((current) => {
      const remaining = current.filter((note) => note.id !== id);
      setSelectedId((currentSelected) =>
        currentSelected === id
          ? sortByUpdated(remaining)[0]?.id ?? null
          : currentSelected
      );
      return remaining;
    });
  }, []);

  const selectNote = useCallback((id) => setSelectedId(id), []);

  return {
    notes,
    selectedNote,
    selectedId,
    addNote,
    updateNoteBody,
    deleteNote,
    selectNote,
  };
}
```

- [ ] **Step 3: Verify persistence with a temporary harness**

Replace `src/App.jsx` with this throwaway harness:

```jsx
import { useNotes } from "./hooks/useNotes.js";

export default function App() {
  const { notes, selectedNote, addNote, updateNoteBody, deleteNote } = useNotes();
  return (
    <div className="p-6 space-y-3">
      <button onClick={addNote} className="rounded bg-blue-600 px-3 py-1 text-white">
        Add
      </button>
      <textarea
        className="block w-full border p-2"
        value={selectedNote?.body ?? ""}
        onChange={(e) => updateNoteBody(selectedNote.id, e.target.value)}
        disabled={!selectedNote}
      />
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            {note.id.slice(0, 6)} — {JSON.stringify(note.body.slice(0, 20))}
            <button onClick={() => deleteNote(note.id)} className="ml-2 text-red-600">
              del
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Run through this sequence in the browser:
1. Click **Add**, type `hello` in the textarea. The list entry updates as you type.
2. Wait ~1 second, then reload. `hello` is still there — persistence works.
3. Click **Add** again and type `second`. The new note jumps to the top of the list — sorting works.
4. Delete the currently selected note. Selection falls to the remaining note rather than going blank.
5. Delete the last note. The textarea goes empty and disabled without an error.
6. Run `localStorage.getItem("react-notes-app.notes.v1")` — the value reflects the final state.

Expected: all six behave as described.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add note state hook with debounced persistence"
```

---

### Task 5: Theme

**Files:**
- Create: `src/hooks/useTheme.js`, `src/components/ThemeToggle.jsx`

**Interfaces:**
- Consumes: `loadTheme`, `saveTheme` from `lib/storage.js`.
- Produces:
  - `useTheme(): [theme: "dark" | "light", toggleTheme: () => void]`
  - `<ThemeToggle theme={string} onToggle={() => void} />`

- [ ] **Step 1: Create `src/hooks/useTheme.js`**

```jsx
import { useCallback, useEffect, useState } from "react";
import { loadTheme, saveTheme } from "../lib/storage.js";

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function useTheme() {
  const [theme, setTheme] = useState(
    () => loadTheme() ?? (systemPrefersDark() ? "dark" : "light")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    []
  );

  return [theme, toggleTheme];
}
```

- [ ] **Step 2: Create `src/components/ThemeToggle.jsx`**

```jsx
export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {isDark ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Verify with a temporary harness**

Add to the top of the Task 4 harness `App.jsx` — import `useTheme` and `ThemeToggle`, call `const [theme, toggleTheme] = useTheme();`, and render `<ThemeToggle theme={theme} onToggle={toggleTheme} />` plus a `<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4">probe</div>`.

1. Click the toggle. The probe div inverts and the icon swaps between sun and moon.
2. Reload. The chosen theme survives.
3. Run `localStorage.removeItem("react-notes-app.theme")` and reload. The theme now matches your OS setting.

Expected: all three hold.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add theme hook and toggle"
```

---

### Task 6: Editor, preview, and split pane

**Files:**
- Create: `src/components/Editor.jsx`, `src/components/Preview.jsx`, `src/components/SplitPane.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks; all three are presentational.
- Produces:
  - `<Editor value={string} onChange={(body: string) => void} />`
  - `<Preview body={string} />`
  - `<SplitPane body={string} onChange={(body: string) => void} />` — owns its own `"editor" | "preview"` mobile tab state.

- [ ] **Step 1: Create `src/components/Editor.jsx`**

```jsx
export default function Editor({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck="false"
      placeholder="# Start writing&#10;&#10;Your markdown renders live on the right."
      className="h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-600"
    />
  );
}
```

- [ ] **Step 2: Create `src/components/Preview.jsx`**

```jsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Preview({ body }) {
  if (!body.trim()) {
    return (
      <div className="p-6 text-sm italic text-slate-400 dark:text-slate-600">
        Nothing to preview yet.
      </div>
    );
  }

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none p-6 prose-headings:font-semibold prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/SplitPane.jsx`**

`min-h-0` on every flex child is what allows the inner panes to scroll instead of stretching the page — without it a long note pushes the layout past the viewport.

```jsx
import { useState } from "react";
import Editor from "./Editor.jsx";
import Preview from "./Preview.jsx";

const TABS = [
  { id: "editor", label: "Editor" },
  { id: "preview", label: "Preview" },
];

export default function SplitPane({ body, onChange }) {
  const [activeTab, setActiveTab] = useState("editor");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-slate-200 md:hidden dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 flex-1 overflow-y-auto md:block ${
            activeTab === "editor" ? "block" : "hidden"
          }`}
        >
          <Editor value={body} onChange={onChange} />
        </div>

        <div className="hidden w-px shrink-0 bg-slate-200 md:block dark:bg-slate-800" />

        <div
          className={`min-h-0 flex-1 overflow-y-auto md:block ${
            activeTab === "preview" ? "block" : "hidden"
          }`}
        >
          <Preview body={body} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Point the temporary harness at `<SplitPane body={selectedNote?.body ?? ""} onChange={(b) => updateNoteBody(selectedNote.id, b)} />`, then:

1. Type this into the editor:

```markdown
# Heading

Some **bold** and *italic* text.

| Item | Qty |
| ---- | --- |
| Tea  | 2   |

- [ ] unchecked
- [x] checked

~~struck~~
```

2. The preview updates **on every keystroke** with no perceptible lag — headings are visibly larger, the table renders with borders, and the checkboxes render as checkboxes. Table, task list, and strikethrough rendering all confirm `remark-gfm` is active.
3. Clear the editor. The preview shows "Nothing to preview yet."
4. Paste ~200 lines of text. Each pane scrolls independently and the page itself does not grow a scrollbar.
5. Narrow the window below 768px. The panes collapse to Editor/Preview tabs; switching tabs swaps the visible pane.

Expected: all five hold.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add editor, markdown preview, and split pane"
```

---

### Task 7: Sidebar

**Files:**
- Create: `src/components/SearchBar.jsx`, `src/components/NoteListItem.jsx`, `src/components/EmptyState.jsx`, `src/components/Sidebar.jsx`

**Interfaces:**
- Consumes: `deriveTitle`, `formatDate` from `lib/notes.js`.
- Produces:
  - `<SearchBar value={string} onChange={(q: string) => void} />`
  - `<NoteListItem note={Note} isSelected={boolean} onSelect={(id: string) => void} onDelete={(id: string) => void} />`
  - `<EmptyState title={string} message={string} />`
  - `<Sidebar notes={Note[]} selectedId={string|null} query={string} onQueryChange={fn} onSelect={fn} onDelete={fn} onAdd={fn} isOpen={boolean} onClose={fn} />`

- [ ] **Step 1: Create `src/components/SearchBar.jsx`**

```jsx
export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search notes"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/NoteListItem.jsx`**

Delete uses an inline two-step confirm rather than `window.confirm`, per the spec. `confirming` state resets whenever the user cancels or the item is re-rendered as a different note.

```jsx
import { useState } from "react";
import { deriveTitle, formatDate } from "../lib/notes.js";

export default function NoteListItem({ note, isSelected, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const preview = note.body
    .split("\n")
    .slice(1)
    .find((line) => line.trim().length > 0);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(note.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(note.id);
          }
        }}
        className={`group cursor-pointer rounded-lg px-3 py-2.5 transition ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-950/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`truncate text-sm font-medium ${
              isSelected
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {deriveTitle(note.body)}
          </h3>

          {confirming ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(note.id);
                }}
                className="rounded px-1.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirming(false);
                }}
                className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Delete ${deriveTitle(note.body)}`}
              onClick={(event) => {
                event.stopPropagation();
                setConfirming(true);
              }}
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          <span>{formatDate(note.updatedAt)}</span>
          {preview ? <span className="ml-2">{preview}</span> : null}
        </p>
      </div>
    </li>
  );
}
```

- [ ] **Step 3: Create `src/components/EmptyState.jsx`**

```jsx
export default function EmptyState({ title, message }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <svg className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/Sidebar.jsx`**

The backdrop and the `-translate-x-full` transform only apply below `md`; `md:translate-x-0 md:static` pins the sidebar open on desktop regardless of `isOpen`.

```jsx
import NoteListItem from "./NoteListItem.jsx";
import SearchBar from "./SearchBar.jsx";

export default function Sidebar({
  notes,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onDelete,
  onAdd,
  isOpen,
  onClose,
}) {
  return (
    <>
      {isOpen ? (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New note
          </button>
          <SearchBar value={query} onChange={onQueryChange} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-600">
              {query ? "No notes match your search." : "No notes yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {notes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 5: Verify**

This task's components are wired up fully in Task 8; verify there. For now confirm `npm run dev` compiles with no import or syntax errors.

Run: `npm run dev`
Expected: no build errors in the terminal or browser console.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add sidebar, search, note list, and empty state"
```

---

### Task 8: App wiring

**Files:**
- Modify: `src/App.jsx` (replaces the temporary harness entirely)

**Interfaces:**
- Consumes: `useNotes`, `useTheme`, `searchNotes`, and every component from Tasks 5–7.
- Produces: the finished application.

- [ ] **Step 1: Replace `src/App.jsx`**

`App` holds only UI state — search query and drawer visibility. All note logic stays in `useNotes`. Selecting a note closes the mobile drawer so the user lands on the editor.

```jsx
import { useMemo, useState } from "react";
import EmptyState from "./components/EmptyState.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SplitPane from "./components/SplitPane.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { useTheme } from "./hooks/useTheme.js";
import { searchNotes } from "./lib/notes.js";

export default function App() {
  const {
    notes,
    selectedNote,
    selectedId,
    addNote,
    updateNoteBody,
    deleteNote,
    selectNote,
  } = useNotes();

  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const visibleNotes = useMemo(() => searchNotes(notes, query), [notes, query]);

  const handleSelect = (id) => {
    selectNote(id);
    setDrawerOpen(false);
  };

  const handleAdd = () => {
    addNote();
    setQuery("");
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open note list"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="flex-1 truncate text-sm font-semibold tracking-tight">
          Notes
        </h1>

        <span className="hidden text-xs text-slate-400 sm:inline dark:text-slate-600">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>

        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          notes={visibleNotes}
          selectedId={selectedId}
          query={query}
          onQueryChange={setQuery}
          onSelect={handleSelect}
          onDelete={deleteNote}
          onAdd={handleAdd}
          isOpen={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          {selectedNote ? (
            <SplitPane
              key={selectedNote.id}
              body={selectedNote.body}
              onChange={(body) => updateNoteBody(selectedNote.id, body)}
            />
          ) : (
            <EmptyState
              title={notes.length === 0 ? "No notes yet" : "No note selected"}
              message={
                notes.length === 0
                  ? "Create your first note to start writing."
                  : "Pick a note from the list to open it."
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
```

> `key={selectedNote.id}` on `SplitPane` resets the mobile Editor/Preview tab to "Editor" when the user switches notes, which is the expected behavior when opening a different note.

- [ ] **Step 2: Verify the full application**

Run: `npm run dev`, then work through every spec requirement:

1. **Create** — click "New note". An "Untitled" entry appears, selected, with the editor focused on an empty body.
2. **Edit** — type `# Shopping list`. The sidebar title updates live to "Shopping list".
3. **Live preview** — the right pane renders the heading immediately, with no lag while typing.
4. **Auto-save** — wait ~1s, reload the page. The note and its content survive.
5. **Multiple notes** — create a second note. It appears at the top of the list; editing the first moves it back to the top.
6. **Search** — type part of one note's text into the search box. The list filters to matching notes only. Clear it and all notes return.
7. **Search miss** — type `zzzzz`. The list shows "No notes match your search."
8. **Delete** — hover a note, click the trash icon, confirm. It disappears and selection falls to another note.
9. **Delete cancel** — start a delete and click Cancel. Nothing is deleted.
10. **Delete all** — remove every note. The main pane shows "No notes yet".
11. **Theme** — toggle dark mode. The whole UI inverts, including the markdown preview (`prose-invert`). Reload; the theme persists.
12. **Responsive** — narrow to under 768px. The sidebar collapses behind the hamburger; opening it shows a backdrop; selecting a note closes it; the editor/preview switch to tabs.

Expected: all twelve pass.

- [ ] **Step 3: Verify the production build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire up notes app"
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| Create / edit / delete notes | 4, 7, 8 |
| Live split-view preview | 6 |
| Debounced localStorage auto-save | 3, 4 |
| Sidebar with title and date | 7 |
| Search filtering | 2, 8 |
| Dark/light toggle | 1, 5 |
| Derived title, no stored field | 2 |
| Storage keys `react-notes-app.*` | 3 |
| Corrupt-data and write-failure handling | 3 |
| Selection fallback after delete | 4 |
| Inline delete confirm, not `window.confirm` | 7 |
| Responsive drawer + mobile tabs | 6, 7, 8 |
| `crypto.randomUUID` secure-context fallback | 2 |

No gaps.

**Type consistency** — `deriveTitle`, `formatDate`, `searchNotes`, `sortByUpdated`, and `createNote` are named identically at definition (Task 2) and at every call site (Tasks 4, 7, 8). `useNotes` returns the same seven keys that Task 8 destructures. `useTheme` returns a tuple, consumed as a tuple.

**Placeholder scan** — every code step contains complete, runnable code. No TBDs.
