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

  const deleteNote = useCallback(
    (id) => {
      // Computed outside the updater: state updaters must stay pure, since
      // React may call them twice under StrictMode.
      const remaining = rawNotes.filter((note) => note.id !== id);
      const fallbackId = sortByUpdated(remaining)[0]?.id ?? null;

      setRawNotes(remaining);
      setSelectedId((current) => (current === id ? fallbackId : current));
    },
    [rawNotes]
  );

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
