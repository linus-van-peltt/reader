# Inline Annotations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Attach margin notes to text highlights that display as academic marginalia when notebook mode is active.

**Architecture:** Add `note?: string` to `TextHighlight`. The highlight save popover gains a second phase for note input. `HighlightedText` renders superscript markers on annotated highlights. `QADisplay` renders margin notes positioned to the right of text fields. On narrow screens, clicking a superscript shows the note in a popover.

**Tech Stack:** Svelte 5 (runes), Tailwind CSS, idb-keyval

---

### Task 1: Add `note` field to TextHighlight type

**Files:**
- Modify: `src/lib/types.ts:42-49`

**Step 1: Add the field**

In `src/lib/types.ts`, add `note?: string` to `TextHighlight`:

```typescript
export interface TextHighlight {
	id: string;
	field: 'question' | 'answer';
	start: number;
	end: number;
	text: string;
	note?: string;
	createdAt: number;
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: succeeds (no consumers break — field is optional)

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add note field to TextHighlight type"
```

---

### Task 2: Two-phase highlight popover in QADisplay

**Files:**
- Modify: `src/lib/components/QADisplay.svelte:39-43` (state), `src/lib/components/QADisplay.svelte:192-205` (handlers), `src/lib/components/QADisplay.svelte:281-309` (popover template)

**Step 1: Add state for two-phase popover**

In QADisplay's script, update the highlight state block (around line 39-43):

```typescript
// Highlight selection state
let showHighlightMenu = $state(false);
let highlightMenuPos = $state({ x: 0, y: 0 });
let pendingHighlight = $state<{ field: 'question' | 'answer'; start: number; end: number; text: string } | null>(null);
let highlightFeedback = $state('');
let highlightPhase = $state<'notebook' | 'note'>('notebook');
let selectedNotebook = $state<Notebook | null>(null);
let pendingNote = $state('');
```

**Step 2: Update handlers**

Replace `handleHighlightToNotebook` (line 192-200) with a two-phase flow:

```typescript
function selectNotebookForHighlight(nb: Notebook) {
	selectedNotebook = nb;
	highlightPhase = 'note';
	pendingNote = '';
}

async function confirmHighlight() {
	if (!pendingHighlight || !selectedNotebook) return;
	const highlightData = pendingNote.trim()
		? { ...pendingHighlight, note: pendingNote.trim() }
		: pendingHighlight;
	await addHighlight(selectedNotebook.id, qa.id, highlightData);
	highlightFeedback = `Highlighted in ${selectedNotebook.title}`;
	showHighlightMenu = false;
	highlightPhase = 'notebook';
	selectedNotebook = null;
	pendingHighlight = null;
	pendingNote = '';
	window.getSelection()?.removeAllRanges();
	setTimeout(() => (highlightFeedback = ''), 2000);
}

async function skipNote() {
	if (!pendingHighlight || !selectedNotebook) return;
	await addHighlight(selectedNotebook.id, qa.id, pendingHighlight);
	highlightFeedback = `Highlighted in ${selectedNotebook.title}`;
	showHighlightMenu = false;
	highlightPhase = 'notebook';
	selectedNotebook = null;
	pendingHighlight = null;
	pendingNote = '';
	window.getSelection()?.removeAllRanges();
	setTimeout(() => (highlightFeedback = ''), 2000);
}
```

Update `dismissHighlightMenu` to reset phase:

```typescript
function dismissHighlightMenu() {
	showHighlightMenu = false;
	highlightPhase = 'notebook';
	selectedNotebook = null;
	pendingHighlight = null;
	pendingNote = '';
}
```

**Step 3: Update popover template**

Replace the highlight popover section (lines 281-309) with:

```svelte
<!-- Highlight popover -->
{#if showHighlightMenu}
	<button
		class="fixed inset-0 z-40"
		onclick={dismissHighlightMenu}
		aria-label="Close highlight menu"
		tabindex="-1"
	></button>
	<div
		class="fixed z-50 -translate-x-1/2 rounded-xl border border-stone-200/60 bg-white/95 py-1.5 shadow-lg backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-900/95"
		style="left: {highlightMenuPos.x}px; top: {highlightMenuPos.y}px; transform: translate(-50%, calc(-100% - 8px));"
	>
		{#if highlightPhase === 'notebook'}
			<div class="px-3 py-1 text-[10px] font-medium tracking-wider text-stone-400 uppercase">Highlight in</div>
			{#if nbState.notebooks.length === 0}
				<div class="px-3 py-2 text-xs text-stone-400">
					<a href="/notebooks" class="text-ra hover:underline">Create a notebook</a> first
				</div>
			{:else}
				{#each nbState.notebooks as nb}
					<button
						onclick={() => selectNotebookForHighlight(nb)}
						class="block w-full px-3 py-1.5 text-left text-xs text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
					>
						{nb.title}
					</button>
				{/each}
			{/if}
		{:else}
			<div class="px-3 py-1 text-[10px] font-medium tracking-wider text-stone-400 uppercase">
				Add a note
			</div>
			<div class="px-2 pb-1.5">
				<input
					type="text"
					bind:value={pendingNote}
					class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
					placeholder="Optional annotation..."
					onkeydown={(e) => { if (e.key === 'Enter') confirmHighlight(); }}
				/>
				<div class="mt-1.5 flex gap-1.5">
					<button
						onclick={confirmHighlight}
						class="flex-1 rounded-md bg-fuchsia-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-fuchsia-600"
					>
						Save
					</button>
					<button
						onclick={skipNote}
						class="rounded-md px-2 py-1 text-[11px] font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
					>
						Skip
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
```

**Step 4: Autofocus the input**

Add `use:action` or a simple `$effect` to focus the input when phase changes to 'note'. The simplest approach — add an action function in the script:

```typescript
function autofocus(node: HTMLInputElement) {
	node.focus();
}
```

Then on the input element, add: `use:autofocus`

**Step 5: Verify build**

Run: `bun run build`

**Step 6: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: two-phase highlight popover with note input"
```

---

### Task 3: HighlightedText superscript markers

**Files:**
- Modify: `src/lib/components/HighlightedText.svelte`

**Step 1: Update props and segment logic**

Replace the full component content:

```svelte
<script lang="ts">
	import GlossaryText from '$lib/components/GlossaryText.svelte';

	interface HighlightInput {
		start: number;
		end: number;
		note?: string;
		noteIndex?: number;
	}

	interface Props {
		text: string;
		highlights: HighlightInput[];
	}

	let { text, highlights }: Props = $props();

	interface Segment {
		text: string;
		highlighted: boolean;
		noteIndex?: number;
	}

	let segments = $derived.by(() => {
		if (!highlights.length) return [{ text, highlighted: false }];

		// Sort highlights; preserve noteIndex through merge
		const sorted = [...highlights].sort((a, b) => a.start - b.start);
		const merged: { start: number; end: number; noteIndex?: number }[] = [];
		for (const h of sorted) {
			const last = merged[merged.length - 1];
			if (last && h.start <= last.end) {
				last.end = Math.max(last.end, h.end);
				// Keep the first noteIndex if merging
				if (last.noteIndex === undefined && h.noteIndex !== undefined) {
					last.noteIndex = h.noteIndex;
				}
			} else {
				merged.push({ start: h.start, end: h.end, noteIndex: h.noteIndex });
			}
		}

		const result: Segment[] = [];
		let cursor = 0;
		for (const { start, end, noteIndex } of merged) {
			if (cursor < start) {
				result.push({ text: text.slice(cursor, start), highlighted: false });
			}
			result.push({ text: text.slice(start, end), highlighted: true, noteIndex });
			cursor = end;
		}
		if (cursor < text.length) {
			result.push({ text: text.slice(cursor), highlighted: false });
		}
		return result;
	});
</script>

{#each segments as seg}{#if seg.highlighted}<mark class="rounded-sm bg-fuchsia-200/60 px-0.5 dark:bg-fuchsia-500/20">{seg.text}{#if seg.noteIndex !== undefined}<sup class="ml-0.5 cursor-default text-[9px] font-semibold text-fuchsia-500 dark:text-fuchsia-400">{seg.noteIndex}</sup>{/if}</mark>{:else}<GlossaryText text={seg.text} />{/if}{/each}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: succeeds (existing callers pass `{ start, end }` without `note`/`noteIndex`, which is fine since both are optional)

**Step 3: Commit**

```bash
git add src/lib/components/HighlightedText.svelte
git commit -m "feat: superscript markers on annotated highlights"
```

---

### Task 4: Margin notes rendering in QADisplay

**Files:**
- Modify: `src/lib/components/QADisplay.svelte:231-255` (question block), `src/lib/components/QADisplay.svelte:257-279` (answer block)

This is the core visual change. Margin notes render as absolutely positioned boxes to the right of each text field.

**Step 1: Add derived state for annotated highlights**

In QADisplay's script section, after the existing `questionHighlights`/`answerHighlights` derivations (around line 45-50), add:

```typescript
// Annotated highlights with sequential numbering
let annotatedHighlights = $derived.by(() => {
	const all: { field: 'question' | 'answer'; start: number; end: number; note: string; noteIndex: number }[] = [];
	let idx = 1;
	const sorted = [...(highlights ?? [])].sort((a, b) => {
		if (a.field !== b.field) return a.field === 'question' ? -1 : 1;
		return a.start - b.start;
	});
	for (const h of sorted) {
		if (h.note) {
			all.push({ field: h.field, start: h.start, end: h.end, note: h.note, noteIndex: idx++ });
		}
	}
	return all;
});

let questionHighlightsWithNotes = $derived(
	questionHighlights.map((h) => {
		const ann = annotatedHighlights.find((a) => a.field === 'question' && a.start === h.start && a.end === h.end);
		return { ...h, noteIndex: ann?.noteIndex };
	})
);

let answerHighlightsWithNotes = $derived(
	answerHighlights.map((h) => {
		const ann = annotatedHighlights.find((a) => a.field === 'answer' && a.start === h.start && a.end === h.end);
		return { ...h, noteIndex: ann?.noteIndex };
	})
);

let questionAnnotations = $derived(annotatedHighlights.filter((a) => a.field === 'question'));
let answerAnnotations = $derived(annotatedHighlights.filter((a) => a.field === 'answer'));
```

**Step 2: Create a margin notes snippet**

This markup renders the margin column. It will be used inside both the question and answer blocks. Create a `{#snippet}` in QADisplay's template (before the Question section):

```svelte
{#snippet marginNotes(annotations: typeof questionAnnotations)}
	{#if annotations.length > 0}
		<div class="absolute -right-2 top-0 hidden w-36 translate-x-full space-y-2 lg:block">
			{#each annotations as ann}
				<div class="border-l-2 border-fuchsia-300 pl-2 dark:border-fuchsia-600">
					<span class="text-[9px] font-semibold text-fuchsia-500 dark:text-fuchsia-400">{ann.noteIndex}</span>
					<p class="text-[11px] leading-snug text-stone-500 dark:text-stone-400">{ann.note}</p>
				</div>
			{/each}
		</div>
	{/if}
{/snippet}
```

**Step 3: Update question block**

Replace the question `<div class="prose ...">` wrapper (lines 239-253) to add `relative` positioning and the margin notes:

```svelte
<div class="prose prose-stone relative max-w-none dark:prose-invert">
	<p class="leading-relaxed" data-qa-field="question">
		{#if highlightQuery}
			{#each highlightText(qa.question, highlightQuery) as seg}
				{#if seg.highlight}<mark class="rounded-sm bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25">{seg.text}</mark>{:else}{seg.text}{/if}
			{/each}
		{:else if questionHighlights.length > 0}
			<HighlightedText text={qa.question} highlights={questionHighlightsWithNotes} />
		{:else if questionWordTimestamps.length > 0}
			<TimestampedText text={qa.question} words={questionWordTimestamps} qaId={qa.id} />
		{:else}
			<GlossaryText text={qa.question} />
		{/if}
	</p>
	{@render marginNotes(questionAnnotations)}
</div>
```

Note: the only changes from the original are:
1. `relative` added to the outer div's class
2. `questionHighlightsWithNotes` instead of `questionHighlights` passed to HighlightedText
3. `{@render marginNotes(questionAnnotations)}` added after `</p>`

**Step 4: Update answer block**

Same pattern for the answer `<div class="prose ...">` (lines 264-278):

```svelte
<div class="prose prose-stone relative max-w-none dark:prose-invert">
	<p class="whitespace-pre-line leading-relaxed" data-qa-field="answer">
		{#if highlightQuery}
			{#each highlightText(qa.answer, highlightQuery) as seg}
				{#if seg.highlight}<mark class="rounded-sm bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25">{seg.text}</mark>{:else}{seg.text}{/if}
			{/each}
		{:else if answerHighlights.length > 0}
			<HighlightedText text={qa.answer} highlights={answerHighlightsWithNotes} />
		{:else if answerWordTimestamps.length > 0}
			<TimestampedText text={qa.answer} words={answerWordTimestamps} qaId={qa.id} />
		{:else}
			<GlossaryText text={qa.answer} />
		{/if}
	</p>
	{@render marginNotes(answerAnnotations)}
</div>
```

**Step 5: Verify build**

Run: `bun run build`

**Step 6: Commit**

```bash
git add src/lib/components/QADisplay.svelte
git commit -m "feat: render margin notes for annotated highlights"
```

---

### Task 5: Margin notes on notebook detail page

**Files:**
- Modify: `src/routes/notebooks/[id]/+page.svelte:202-203`

The notebook detail page already passes `highlights={entry.highlights}` to QADisplay. Since QADisplay now handles margin notes internally when highlights have `note` fields, no changes are needed — it works automatically.

**Step 1: Verify by reading the code**

Confirm that line 203 passes highlights: `<QADisplay {qa} highlights={entry.highlights} />`

The margin notes will render on this page because `QADisplay` renders them whenever `highlights` contains items with `note` fields, regardless of sidebar state. But wait — the design says margin notes should only show in notebook mode (sidebar tab === 'notebooks').

On the notebook detail page, there is no sidebar — it's a standalone page. The highlights should always show margin notes here since the user is explicitly viewing a notebook.

**Step 2: Update QADisplay margin note visibility**

The `annotatedHighlights` derived should only include notes when appropriate. On the notebook detail page, `highlights` are always passed. On the session page, they're only passed when notebook mode is active. So the condition is: if highlights are passed AND they have notes, show margin notes. This is already what the derived does — no extra condition needed.

**Step 3: Verify build**

Run: `bun run build`

**Step 4: Commit (if any changes were needed)**

No commit needed — this works automatically.

---

### Task 6: Final build verification

**Step 1: Full build**

Run: `bun run build`
Expected: clean build, no new warnings

**Step 2: Manual verification checklist**

1. Select text on session page → highlight popover shows notebook list
2. Click a notebook → popover transitions to note input
3. Type a note → click Save → highlight saved with note
4. Click Skip → highlight saved without note
5. Press Enter in note field → same as Save
6. Switch to Notebooks tab → highlights appear with superscript markers
7. Margin notes appear to the right of highlighted text (on wide screens)
8. Superscript numbering is sequential across question and answer
9. Navigate to notebook detail page → same highlights with margin notes
10. Dark mode renders correctly

**Step 3: Final commit if any fixes needed**
