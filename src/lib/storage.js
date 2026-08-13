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
