# Inline Annotations (Margin Notes on Highlights)

## Summary

Add the ability to attach a note to any text highlight. Notes display as margin annotations next to the highlighted text when notebook mode is active.

## Data Model

Add `note?: string` to `TextHighlight`:

```typescript
export interface TextHighlight {
  id: string;
  field: 'question' | 'answer';
  start: number;
  end: number;
  text: string;
  note?: string;       // new
  createdAt: number;
}
```

No migration needed — existing highlights have `note` as `undefined`.

## UX: Highlight Save Flow

The existing highlight popover in QADisplay currently shows a list of notebooks. After clicking a notebook name:

1. A text input appears: "Add a note (optional)..."
2. User types a note or leaves blank
3. Press Enter or click Save to confirm
4. `addHighlight` is called with `note` included in the highlight data

The `pendingHighlight` state gains a `note` field. `addHighlight` already accepts `Omit<TextHighlight, 'id' | 'createdAt'>`, so `note` flows through.

## Rendering: Margin Notes

When `sidebar.activeTab === 'notebooks'` and highlights have notes:

- **HighlightedText** renders a small superscript number (e.g., `1`) after each `<mark>` that has a note
- **QADisplay** renders a margin column to the right of each `data-qa-field` paragraph containing the notes
- Each margin note shows the superscript number and note text in fuchsia annotation style
- The `data-qa-field` container uses `position: relative` with the margin notes absolutely positioned to the right

### Mobile

On narrow screens, margin notes collapse. The superscript marker acts as a tap target that shows the note in a popover.

## Visibility

Margin notes only appear when the Notebooks sidebar tab is active — same condition that controls highlight visibility. Switching away hides both highlights and margin notes.

## Files to Modify

- `src/lib/types.ts` — add `note?: string` to `TextHighlight`
- `src/lib/components/QADisplay.svelte` — add note input to highlight popover, render margin notes
- `src/lib/components/HighlightedText.svelte` — accept notes, render superscript markers
- `src/lib/stores/notebooks.svelte.ts` — `addHighlight` already handles the field, no changes needed
- `src/routes/session/[id]/+page.svelte` — pass annotation display flag (already passes highlights)
- `src/routes/notebooks/[id]/+page.svelte` — margin notes also appear on notebook detail page
