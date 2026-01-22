# Shared Components and Hooks

This directory contains shared components and hooks used by both the Designer and Imprinter tools.

## Components

### SaveIndicator

A unified save status indicator component that displays the current save state with appropriate icons and tooltips.

**Usage:**

```tsx
import { SaveIndicator } from "@/app/(tools)/shared/components/save-indicator";

function MyToolbar() {
  const { saveStatus, lastSavedAt, isDirty } = useMyTool();

  return <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} isDirty={isDirty} />;
}
```

## Hooks

### useAutoSave

A unified auto-save hook with built-in deduplication and debouncing.

**Features:**

- Automatic debounced saves (default: 3 seconds)
- Save deduplication (skips saves if data hasn't changed)
- Prevents duplicate concurrent save requests
- Automatic ID management for new documents
- Optimistic updates

**Usage:**

```tsx
import { useAutoSave } from "@/app/(tools)/shared/hooks/use-auto-save";

function MyComponent() {
  const [data, setData] = useState(initialData);
  const [name, setName] = useState("Untitled");

  const serialize = useCallback(() => {
    return {
      /* serialized data */
    };
  }, [data]);

  const { saveStatus, lastSavedAt, isDirty, triggerAutoSave, saveNow } = useAutoSave({
    id: documentId,
    name,
    serialize,
    onSave: async (data) => {
      // Save to backend
      return { id: "new-doc-id" };
    },
    onIdChange: (newId) => {
      // Update URL or state with new ID
    },
  });

  // Trigger auto-save when data changes
  useEffect(() => {
    triggerAutoSave();
  }, [data, triggerAutoSave]);
}
```

## Benefits

### Vercel React Best Practices

The shared components follow Vercel React Best Practices:

1. **Functional setState** - All state updates use functional form to prevent stale closures
2. **Early returns** - Conditions checked before expensive computations
3. **Memoization** - Callbacks properly memoized with minimal dependencies
4. **Direct imports** - Avoiding barrel files for better tree-shaking
5. **Save deduplication** - Prevents unnecessary backend calls

### Code Deduplication

- Eliminates ~100 lines of duplicate save/load logic between Designer and Imprinter
- Consistent save behavior across all tools
- Single source of truth for save status UI

### Performance Improvements

- **Debouncing**: Reduces save frequency during rapid changes
- **Deduplication**: Skips saves when data hasn't changed
- **Promise reuse**: Prevents concurrent duplicate saves
- **Optimistic updates**: UI responds immediately while save is in progress
- **Lazy loading**: Full design data loaded only when needed (imprinter)
