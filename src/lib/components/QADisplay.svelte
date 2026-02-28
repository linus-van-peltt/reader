<script lang="ts">
	import { base } from '$app/paths';
	import type { QAPair, Notebook, TextHighlight } from '$lib/types';
	import { playSegment, getAudioState, togglePlayback } from '$lib/stores/audio.svelte';
	import {
		getNotebooksState,
		loadNotebooks,
		addEntry,
		addHighlight
	} from '$lib/stores/notebooks.svelte';
	import { getSidebarState } from '$lib/stores/sidebar.svelte';
	import GlossaryText from '$lib/components/GlossaryText.svelte';
	import HighlightedText from '$lib/components/HighlightedText.svelte';
	import TimestampedText from '$lib/components/TimestampedText.svelte';
	import { highlightText } from '$lib/utils/highlight';
	import { getFieldTimestamps } from '$lib/data/transcript';
	import type { WordTimestamp } from '$lib/types';

	interface Props {
		qa: QAPair;
		highlightQuery?: string;
		highlights?: TextHighlight[];
	}

	let { qa, highlightQuery, highlights }: Props = $props();
	const audio = getAudioState();
	const nbState = getNotebooksState();
	const sidebar = getSidebarState();

	let isActive = $derived(sidebar.activeQaIndex === qa.qaIndex);
	let isSaved = $derived(nbState.savedQaIds.has(qa.id));

	let isCurrentlyPlaying = $derived(audio.currentSegmentId === qa.id && audio.isPlaying);
	let ref = $derived(`${qa.sessionNum}.${qa.qaIndex}`);
	let showNotebookMenu = $state(false);
	let addedTo = $state('');
	let copyStatus = $state('');
	let canShare = $state(false);

	// Highlight selection state
	let showHighlightMenu = $state(false);
	let highlightMenuPos = $state({ x: 0, y: 0 });
	let pendingHighlight = $state<{ field: 'question' | 'answer'; start: number; end: number; text: string } | null>(null);
	let highlightFeedback = $state('');
	let highlightPhase = $state<'notebook' | 'note'>('notebook');
	let selectedNotebook = $state<Notebook | null>(null);
	let pendingNote = $state('');

	let questionHighlights = $derived(
		highlights?.filter((h) => h.field === 'question') ?? []
	);
	let answerHighlights = $derived(
		highlights?.filter((h) => h.field === 'answer') ?? []
	);

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

	// Word-level timestamps for follow-along
	let questionWordTimestamps = $state<WordTimestamp[]>([]);
	let answerWordTimestamps = $state<WordTimestamp[]>([]);

	$effect(() => {
		const id = qa.id;
		getFieldTimestamps(id).then((result) => {
			if (result) {
				questionWordTimestamps = result.question;
				answerWordTimestamps = result.answer;
			} else {
				questionWordTimestamps = [];
				answerWordTimestamps = [];
			}
		});
	});

	$effect(() => {
		canShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	async function handleAddToNotebook(nb: Notebook) {
		await addEntry(nb.id, qa.id);
		addedTo = nb.title;
		showNotebookMenu = false;
		setTimeout(() => (addedTo = ''), 2000);
	}

	function openNotebookMenu() {
		loadNotebooks();
		showNotebookMenu = true;
	}

	async function handleCopy() {
		const url = `${window.location.origin}${base}/session/${qa.sessionNum}#${qa.qaIndex}`;
		await navigator.clipboard.writeText(url);
		copyStatus = 'Copied!';
		setTimeout(() => (copyStatus = ''), 2000);
	}

	async function handleShare() {
		const url = `${window.location.origin}${base}/session/${qa.sessionNum}#${qa.qaIndex}`;
		const title = `Law of One ${qa.sessionNum}.${qa.qaIndex}`;
		try {
			await navigator.share({ title, url });
		} catch {
			// User cancelled share sheet
		}
	}

	// --- Text selection highlighting ---

	// Get the visible text content (excluding tooltip definitions) before a given DOM position
	function getVisibleTextBefore(container: Element, node: Node, offset: number): string {
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
			acceptNode(n: Node) {
				if ((n as Text).parentElement?.closest('[role="tooltip"]'))
					return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			}
		});
		let text = '';
		let current: Text | null;
		while ((current = walker.nextNode() as Text | null)) {
			if (current === node) {
				text += current.textContent?.slice(0, offset) ?? '';
				break;
			}
			text += current.textContent ?? '';
		}
		return text;
	}

	// Map a visible-text offset to the corresponding raw-text offset.
	// Visible text may differ from raw text due to:
	// - TimestampedText rendering \n\n as <br> (characters missing from DOM)
	// - GlossaryText tooltip text (filtered out above)
	function mapToRawOffset(rawText: string, visiblePrefix: string): number {
		let rawIdx = 0;
		let visIdx = 0;
		while (visIdx < visiblePrefix.length && rawIdx < rawText.length) {
			if (visiblePrefix[visIdx] === rawText[rawIdx]) {
				visIdx++;
				rawIdx++;
			} else {
				// Raw text character not present in visible text (e.g. \n from <br>)
				rawIdx++;
			}
		}
		return rawIdx;
	}

	function handleMouseUp(e: MouseEvent) {
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.rangeCount) {
			return;
		}

		const range = sel.getRangeAt(0);

		// Find which field the selection is in
		const container = (range.startContainer.parentElement ?? range.startContainer) as Element;
		const fieldEl = container.closest?.('[data-qa-field]');
		if (!fieldEl) return;

		const field = fieldEl.getAttribute('data-qa-field') as 'question' | 'answer';
		if (!field) return;

		const rawText = field === 'question' ? qa.question : qa.answer;
		const visBefore1 = getVisibleTextBefore(fieldEl, range.startContainer, range.startOffset);
		const visBefore2 = getVisibleTextBefore(fieldEl, range.endContainer, range.endOffset);
		const start = mapToRawOffset(rawText, visBefore1);
		const end = mapToRawOffset(rawText, visBefore2);

		if (start === end) return;

		const adjustedStart = Math.min(start, end);
		const adjustedEnd = Math.max(start, end);
		const selectedText = rawText.slice(adjustedStart, adjustedEnd);

		if (!selectedText.trim()) return;

		pendingHighlight = {
			field,
			start: adjustedStart,
			end: adjustedEnd,
			text: selectedText
		};

		// Position the popover near the selection
		const rect = range.getBoundingClientRect();
		highlightMenuPos = {
			x: rect.left + rect.width / 2,
			y: rect.top
		};

		loadNotebooks();
		showHighlightMenu = true;
	}

	function selectNotebookForHighlight(nb: Notebook) {
		selectedNotebook = nb;
		highlightPhase = 'note';
		pendingNote = '';
	}

	function finishHighlight(feedbackMsg: string) {
		highlightFeedback = feedbackMsg;
		showHighlightMenu = false;
		highlightPhase = 'notebook';
		selectedNotebook = null;
		pendingHighlight = null;
		pendingNote = '';
		window.getSelection()?.removeAllRanges();
		setTimeout(() => (highlightFeedback = ''), 2000);
	}

	async function confirmHighlight() {
		if (!pendingHighlight || !selectedNotebook) return;
		const highlightData = pendingNote.trim()
			? { ...pendingHighlight, note: pendingNote.trim() }
			: pendingHighlight;
		await addHighlight(selectedNotebook.id, qa.id, highlightData);
		finishHighlight(`Highlighted in ${selectedNotebook.title}`);
	}

	async function skipNote() {
		if (!pendingHighlight || !selectedNotebook) return;
		await addHighlight(selectedNotebook.id, qa.id, pendingHighlight);
		finishHighlight(`Highlighted in ${selectedNotebook.title}`);
	}

	function dismissHighlightMenu() {
		showHighlightMenu = false;
		highlightPhase = 'notebook';
		selectedNotebook = null;
		pendingHighlight = null;
		pendingNote = '';
	}

	function autofocus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	id="qa-{qa.qaIndex}"
	class="scroll-mt-20 rounded-lg px-4 -mx-4 transition-colors duration-300 {isActive ? 'bg-stone-100/60 dark:bg-stone-800/40' : ''}"
	onmouseup={handleMouseUp}
>
	<!-- Reference badge -->
	<div class="mb-4 flex items-center gap-2">
		<a
			href="{base}/session/{qa.sessionNum}#{qa.qaIndex}"
			class="font-mono text-sm font-semibold tabular-nums transition-colors duration-200 {isActive
				? 'text-ra'
				: 'text-stone-400 hover:text-ra dark:text-stone-500 dark:hover:text-ra'}"
		>
			{ref}
		</a>
		{#if isSaved}
			<svg class="h-3.5 w-3.5 text-ra/60" fill="currentColor" viewBox="0 0 24 24">
				<path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
			</svg>
		{/if}
	</div>

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

	<!-- Question -->
	{#if qa.question}
		<div class="mb-5 border-l-[3px] border-questioner/40 pl-4 dark:border-questioner/30">
			<div class="mb-1.5">
				<span class="text-xs font-medium tracking-wider text-questioner/70 uppercase dark:text-questioner/60">
					Questioner
				</span>
			</div>
			<div class="prose prose-stone relative max-w-none dark:prose-invert">
				<p class="leading-relaxed" data-qa-field="question">
					{#if highlightQuery}
						{#each highlightText(qa.question, highlightQuery) as seg}
							{#if seg.highlight}<mark class="rounded-sm bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25">{seg.text}</mark>{:else}{seg.text}{/if}
						{/each}
					{:else if questionHighlightsWithNotes.length > 0}
						<HighlightedText text={qa.question} highlights={questionHighlightsWithNotes} />
					{:else if questionWordTimestamps.length > 0}
						<TimestampedText text={qa.question} words={questionWordTimestamps} qaId={qa.id} />
					{:else}
						<GlossaryText text={qa.question} />
					{/if}
				</p>
				{@render marginNotes(questionAnnotations)}
			</div>
		</div>
	{/if}

	<!-- Answer -->
	<div class="border-l-[3px] border-ra/40 pl-4 dark:border-ra/30">
		<div class="mb-1.5">
			<span class="text-xs font-medium tracking-wider text-ra/70 uppercase dark:text-ra/60">
				Ra
			</span>
		</div>
		<div class="prose prose-stone relative max-w-none dark:prose-invert">
			<p class="whitespace-pre-line leading-relaxed" data-qa-field="answer">
				{#if highlightQuery}
					{#each highlightText(qa.answer, highlightQuery) as seg}
						{#if seg.highlight}<mark class="rounded-sm bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25">{seg.text}</mark>{:else}{seg.text}{/if}
					{/each}
				{:else if answerHighlightsWithNotes.length > 0}
					<HighlightedText text={qa.answer} highlights={answerHighlightsWithNotes} />
				{:else if answerWordTimestamps.length > 0}
					<TimestampedText text={qa.answer} words={answerWordTimestamps} qaId={qa.id} />
				{:else}
					<GlossaryText text={qa.answer} />
				{/if}
			</p>
			{@render marginNotes(answerAnnotations)}
		</div>
	</div>

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
						<a href="{base}/notebooks" class="text-ra hover:underline">Create a notebook</a> first
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
						use:autofocus
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

	<!-- Actions toolbar -->
	<div class="mt-4 flex items-center gap-1">
		<!-- Play -->
		<button
			onclick={() => (isCurrentlyPlaying ? togglePlayback() : playSegment(qa.id))}
			class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-200 {isCurrentlyPlaying
				? 'bg-ra/10 text-ra'
				: 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300'}"
			aria-label={isCurrentlyPlaying ? 'Pause audio' : 'Play audio'}
		>
			{#if isCurrentlyPlaying}
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
					<rect x="6" y="4" width="4" height="16" rx="1" />
					<rect x="14" y="4" width="4" height="16" rx="1" />
				</svg>
				Playing
			{:else}
				<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
				Play
			{/if}
		</button>

		<!-- Save to notebook -->
		<div class="relative">
			<button
				onclick={openNotebookMenu}
				class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-200 {isSaved
					? 'text-ra hover:bg-ra/10'
					: 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300'}"
				aria-label="Save to notebook"
			>
				{#if isSaved}
					<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z" />
					</svg>
					Saved
				{:else}
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					Save
				{/if}
			</button>

			{#if showNotebookMenu}
				<button
					class="fixed inset-0 z-40"
					onclick={() => (showNotebookMenu = false)}
					aria-label="Close menu"
					tabindex="-1"
				></button>
				<div
					class="absolute bottom-full left-0 z-50 mb-1.5 w-48 rounded-xl border border-stone-200/60 bg-white/95 py-1.5 shadow-lg backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-900/95"
				>
					{#if nbState.notebooks.length === 0}
						<div class="px-3 py-2 text-xs text-stone-400">
							<a href="{base}/notebooks" class="text-ra hover:underline">Create a notebook</a> first
						</div>
					{:else}
						{#each nbState.notebooks as nb}
							<button
								onclick={() => handleAddToNotebook(nb)}
								class="block w-full px-3 py-1.5 text-left text-xs text-stone-600 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
							>
								{nb.title}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Copy link -->
		<button
			onclick={handleCopy}
			class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-stone-400 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
			aria-label="Copy link"
		>
			<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.022a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
			</svg>
			Copy
		</button>

		<!-- Share (native) -->
		{#if canShare}
			<button
				onclick={handleShare}
				class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-stone-400 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
				aria-label="Share passage"
			>
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
				</svg>
				Share
			</button>
		{/if}

		<!-- Feedback -->
		{#if addedTo || copyStatus || highlightFeedback}
			<span class="ml-2 text-xs text-stone-400 dark:text-stone-500">
				{highlightFeedback || (addedTo ? `Saved to ${addedTo}` : copyStatus)}
			</span>
		{/if}
	</div>
</div>
