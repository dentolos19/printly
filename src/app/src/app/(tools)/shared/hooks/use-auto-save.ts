/**
 * Shared auto-save hook for designer and imprinter
 * Implements debounced auto-save with optimistic updates
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type AutoSaveOptions<T> = {
  /**
   * ID of the current document (null for new documents)
   */
  id: string | null;

  /**
   * Current document name
   */
  name: string;

  /**
   * Function to serialize the current state to save
   */
  serialize: () => T;

  /**
   * Save function that returns the document ID
   */
  onSave?: (data: { name: string; data: string; currentId: string | null } & Partial<T>) => Promise<{ id: string }>;

  /**
   * Debounce delay in milliseconds (default: 3000)
   */
  delay?: number;

  /**
   * Callback when ID changes (for updating URL)
   */
  onIdChange?: (id: string) => void;
};

type AutoSaveReturn = {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  isDirty: boolean;
  triggerAutoSave: () => void;
  saveNow: () => Promise<string | null>;
  setId: (id: string | null) => void;
};

export function useAutoSave<T extends Record<string, unknown>>({
  id: initialId,
  name,
  serialize,
  onSave,
  delay = 3000,
  onIdChange,
}: AutoSaveOptions<T>): AutoSaveReturn {
  const [id, setId] = useState<string | null>(initialId);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savePromiseRef = useRef<Promise<string | null> | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  // Update ID when it changes externally
  useEffect(() => {
    if (initialId !== id) {
      setId(initialId);
    }
  }, [initialId, id]);

  const saveNow = useCallback(() => {
    // Early return if no save function
    if (!onSave) {
      return Promise.resolve(id);
    }

    // Prevent duplicate saves by returning existing promise
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    const promise = (async () => {
      try {
        setSaveStatus("saving");

        const serializedData = serialize();
        const dataString = JSON.stringify(serializedData);

        // Skip save if data hasn't changed (deduplication)
        if (lastSavedDataRef.current === dataString && id) {
          setSaveStatus("saved");
          return id;
        }

        const result = await onSave({ name, data: dataString, currentId: id, ...serializedData });

        lastSavedDataRef.current = dataString;

        // Update ID if this was a new document
        if (result.id && !id) {
          setId(result.id);
          onIdChange?.(result.id);
        }

        setSaveStatus("saved");
        setLastSavedAt(new Date());
        setIsDirty(false);

        return result.id || id;
      } catch (error) {
        console.error("Save failed:", error);
        setSaveStatus("error");
        return null;
      } finally {
        savePromiseRef.current = null;
      }
    })();

    savePromiseRef.current = promise;
    return promise;
  }, [id, name, onSave, onIdChange, serialize]);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setIsDirty(true);

    autoSaveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, delay);
  }, [delay, saveNow]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSavedAt,
    isDirty,
    triggerAutoSave,
    saveNow,
    setId,
  };
}
