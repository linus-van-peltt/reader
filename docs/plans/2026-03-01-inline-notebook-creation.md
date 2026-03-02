# Inline Notebook Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users create a new notebook on the fly when highlighting text or saving a QA pair, without leaving the current page.

**Architecture:** Single-file change to `QADisplay.svelte`. Add an always-visible text input at the top of both notebook-selection popovers (highlight flow and save flow). On submit, create the notebook and immediately complete the action. No store or type changes needed.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript

---

### Task 1: Add createNotebook import and state variable

**Files:**
- Modify: `src/lib/components/QADisplay.svelte:5-10,35-47`

**Step 1: Add `createNotebook` to the import**

In the import block at line 5-10, add `createNotebook` to the existing notebooks import:

```svelte
import {
	getNotebooksState,
	loadNotebooks,
	createNotebook,
	addEntry,
	addHighlight
} from '$lib/stores/notebooks.svelte';
```

**Step 2: Add reactive state variable**

After line 47 (`let pendingNote = $state('');`), add:

```typescript
let newNotebookTitle = $state('');
```

**Step 3: Verify no syntax errors**

Run: `cd /Users/chrxn/src/ra-reader && npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors in QADisplay.svelte

**Step 4: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: add createNotebook import and state for inline notebook creation"
```

---

### Task 2: Add inline create to the highlight popover

**Files:**
- Modify: `src/lib/components/QADisplay.svelte:374-389`

**Step 1: Replace the notebook selection phase in the highlight popover**

Replace lines 374-389 (the `highlightPhase === 'notebook'` block) with:

```svelte
{#if highlightPhase === 'notebook'}
	<div class="px-3 py-1 text-[10px] font-medium tracking-wider text-stone-400 uppercase">Highlight in</div>
	<div class="px-2 pb-1.5">
		<form onsubmit={async (e) => {
			e.preventDefault();
			const title = newNotebookTitle.trim();
			if (!title) return;
			const nb = await createNotebook(title);
			newNotebookTitle = '';
			selectNotebookForHighlight(nb);
		}}>
			<input
				type="text"
				bind:value={newNotebookTitle}
				class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-ra focus:outline-none focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
				placeholder="New notebook..."
			/>
		</form>
	</div>
	{#each nbState.notebooks as nb}
		<button
			onclick={() => selectNotebookForHighlight(nb)}
			class="block w-full px-3 py-1.5 text-left text-xs text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
		>
			{nb.title}
		</button>
	{/each}
```

Key changes:
- Removed the empty-notebooks special case (the input handles it)
- Added text input at top with form submit handler
- Creates notebook and calls `selectNotebookForHighlight` in one step
- Existing notebook buttons remain below

**Step 2: Verify no syntax errors**

Run: `cd /Users/chrxn/src/ra-reader && npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: add inline notebook creation to highlight popover"
```

---

### Task 3: Add inline create to the save-to-notebook popover

**Files:**
- Modify: `src/lib/components/QADisplay.svelte:476-491` (approximate after Task 2 edits)

**Step 1: Replace the notebook list in the save popover**

Replace the content inside the save popover `<div>` (the `{#if nbState.notebooks.length === 0}...{/if}` block) with:

```svelte
<div class="px-2 py-1.5">
	<form onsubmit={async (e) => {
		e.preventDefault();
		const title = newNotebookTitle.trim();
		if (!title) return;
		const nb = await createNotebook(title);
		newNotebookTitle = '';
		await handleAddToNotebook(nb);
	}}>
		<input
			type="text"
			bind:value={newNotebookTitle}
			class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-ra focus:outline-none focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
			placeholder="New notebook..."
		/>
	</form>
</div>
{#each nbState.notebooks as nb}
	<button
		onclick={() => handleAddToNotebook(nb)}
		class="block w-full px-3 py-1.5 text-left text-xs text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
	>
		{nb.title}
	</button>
{/each}
```

Key changes:
- Same pattern as highlight popover but calls `handleAddToNotebook` instead
- Removed empty-notebooks special case

**Step 2: Verify no syntax errors**

Run: `cd /Users/chrxn/src/ra-reader && npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: add inline notebook creation to save popover"
```

---

### Task 4: Reset newNotebookTitle on popover dismiss

**Files:**
- Modify: `src/lib/components/QADisplay.svelte` — `dismissHighlightMenu` function and save menu close

**Step 1: Clear state in dismissHighlightMenu**

Add `newNotebookTitle = '';` to the `dismissHighlightMenu` function body.

**Step 2: Clear state when save menu closes**

In the save menu's backdrop button `onclick`, change from:
```svelte
onclick={() => (showNotebookMenu = false)}
```
to:
```svelte
onclick={() => { showNotebookMenu = false; newNotebookTitle = ''; }}
```

**Step 3: Verify no syntax errors**

Run: `cd /Users/chrxn/src/ra-reader && npx svelte-check --threshold error 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: reset new notebook input on popover dismiss"
```

---

### Task 5: Manual testing

**Step 1: Run dev server**

Run: `cd /Users/chrxn/src/ra-reader && npm run dev`

**Step 2: Test highlight flow**

1. Navigate to a session page
2. Select text in a question or answer
3. Verify popover shows text input at top + existing notebooks below
4. Type a new notebook name, press Enter
5. Verify it moves to the note phase
6. Confirm or skip note
7. Verify highlight is saved and feedback shows

**Step 3: Test save flow**

1. Click "Save" button on a QA pair
2. Verify popover shows text input at top + existing notebooks below
3. Type a new notebook name, press Enter
4. Verify QA pair is saved to new notebook and feedback shows

**Step 4: Test with no existing notebooks**

1. Delete all notebooks
2. Try both flows — should work with just the input, no "Create a notebook" link

**Step 5: Test dismiss**

1. Open either popover, type something in the input
2. Click outside to dismiss
3. Reopen — input should be empty
