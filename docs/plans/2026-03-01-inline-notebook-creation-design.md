# Inline Notebook Creation During Highlighting

## Problem

When highlighting text or saving a QA pair, the user must choose from existing notebooks. If no notebooks exist, they're sent to `/notebooks` — breaking the flow entirely. Even with existing notebooks, there's no way to create a new one without leaving.

## Design

Add an always-visible text input at the top of the notebook selection popover. Type a name, hit enter — notebook is created and the highlight/save is completed in one step.

### Flow

```
Select text → Popover: [New notebook input] + list notebooks
           → Type name + enter → creates notebook, saves highlight, moves to note phase
           → OR pick existing notebook → same as before
```

### Changes

Single file: `QADisplay.svelte`

- Add `newNotebookTitle` reactive variable
- Add text input at top of notebook list in both popovers (highlight and save)
- On submit: `createNotebook(title)` then `selectNotebookForHighlight(newNotebook)` (highlight flow) or `addEntry(newNotebook.id, qa.id)` (save flow)
- Remove the "Create a notebook" link to `/notebooks`
- No new components, no store changes
