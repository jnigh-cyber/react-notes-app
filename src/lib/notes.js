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
    ? `${stripped.slice(0, TITLE_MAX)}…`
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
