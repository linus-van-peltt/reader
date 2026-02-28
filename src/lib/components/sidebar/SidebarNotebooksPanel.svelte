<script lang="ts">
	import { base } from '$app/paths';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { getSidebarState, setActiveNotebookId } from '$lib/stores/sidebar.svelte';
	import { getNotebooksState } from '$lib/stores/notebooks.svelte';
	import { getQAPair } from '$lib/data/manifest';
	import QAPreviewLink from './QAPreviewLink.svelte';
	import type { QAPair } from '$lib/types';

	const sidebar = getSidebarState();
	const nbState = getNotebooksState();

	let sessionNum = $derived(Number(page.params.id));
	let mode = $state<'session' | 'all'>('session');

	let qaCache = $state<Map<string, QAPair>>(new Map());
	let loading = $state(false);

	// Entries filtered by selected notebook
	let filteredNotebooks = $derived(
		sidebar.activeNotebookId
			? nbState.notebooks.filter((nb) => nb.id === sidebar.activeNotebookId)
			: nbState.notebooks
	);

	// Deduplicated entries with notebook info, filtered by mode
	let entries = $derived.by(() => {
		const seen = new Set<string>();
		const result: {
			qaPairId: string;
			qa: QAPair | undefined;
			noteCount: number;
			highlightCount: number;
		}[] = [];

		for (const nb of filteredNotebooks) {
			for (const entry of nb.entries) {
				if (seen.has(entry.qaPairId)) continue;
				const qa = qaCache.get(entry.qaPairId);
				if (mode === 'session' && qa?.sessionNum !== sessionNum) continue;
				seen.add(entry.qaPairId);

				// Count notes and highlights across all filtered notebooks
				let noteCount = 0;
				let highlightCount = 0;
				for (const nb2 of filteredNotebooks) {
					const e = nb2.entries.find((e) => e.qaPairId === entry.qaPairId);
					if (e?.note) noteCount++;
					if (e?.highlights) highlightCount += e.highlights.length;
				}

				result.push({ qaPairId: entry.qaPairId, qa, noteCount, highlightCount });
			}
		}
		return result;
	});

	let activeQa = $derived(sidebar.activeQaIndex);

	function isActiveRef(qa: QAPair): boolean {
		return qa.sessionNum === sessionNum && qa.qaIndex === activeQa;
	}

	function isCurrentSession(qa: QAPair): boolean {
		return qa.sessionNum === sessionNum;
	}

	// Load QA data for all notebook entries
	$effect(() => {
		const allQaPairIds = new Set<string>();
		for (const nb of nbState.notebooks) {
			for (const entry of nb.entries) {
				allQaPairIds.add(entry.qaPairId);
			}
		}

		if (allQaPairIds.size === 0) return;

		// Read cache without tracking to avoid infinite loop
		const currentCache = untrack(() => qaCache);
		const idsToLoad = [...allQaPairIds].filter((id) => !currentCache.has(id));
		if (idsToLoad.length === 0) return;

		loading = true;
		const newCache = new Map(currentCache);
		Promise.all(
			idsToLoad.map(async (id) => {
				const qa = await getQAPair(id);
				if (qa) newCache.set(id, qa);
			})
		).then(() => {
			qaCache = newCache;
			loading = false;
		});
	});
</script>

<div class="flex flex-col">
	<!-- Header: notebook selector + mode toggle -->
	<div class="sticky top-0 z-10 space-y-2 bg-white p-2 dark:bg-stone-900">
		<!-- Notebook selector -->
		<select
			value={sidebar.activeNotebookId ?? ''}
			onchange={(e) => setActiveNotebookId(e.currentTarget.value || null)}
			class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700 focus:border-ra focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
		>
			<option value="">All Notebooks</option>
			{#each nbState.notebooks as nb (nb.id)}
				<option value={nb.id}>{nb.title}</option>
			{/each}
		</select>

		<!-- Mode toggle -->
		<div class="flex items-center gap-1">
			<button
				onclick={() => (mode = 'session')}
				class="flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors {mode === 'session'
					? 'bg-ra/10 text-ra'
					: 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'}"
			>
				This Session
			</button>
			<button
				onclick={() => (mode = 'all')}
				class="flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors {mode === 'all'
					? 'bg-ra/10 text-ra'
					: 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'}"
			>
				All
			</button>
		</div>
	</div>

	{#if loading}
		<div class="space-y-2 p-2">
			{#each Array(6) as _}
				<div class="h-7 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
			{/each}
		</div>
	{:else if entries.length === 0}
		<div class="py-8 text-center">
			<p class="text-xs text-stone-400">
				{mode === 'session' ? 'No saved passages for this session' : 'No saved passages'}
			</p>
			<a href="{base}/notebooks" class="mt-2 inline-block text-xs text-ra hover:underline">
				Manage notebooks
			</a>
		</div>
	{:else}
		<div class="flex flex-col gap-0.5 p-2">
			{#each entries as entry (entry.qaPairId)}
				{@const qa = entry.qa}
				{#if qa}
					<div
						class="flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors {isActiveRef(qa)
							? 'bg-ra/5 dark:bg-ra/10'
							: 'hover:bg-stone-100 dark:hover:bg-stone-800'}"
					>
						<QAPreviewLink
							session={qa.sessionNum}
							qaIndex={qa.qaIndex}
							active={isActiveRef(qa)}
							class="rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors {isActiveRef(qa)
								? 'bg-ra text-white'
								: isCurrentSession(qa)
									? 'bg-stone-100 text-ra hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra'
									: 'bg-stone-50 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:bg-stone-800/50 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300'}"
						/>

						{#if entry.noteCount > 0}
							<svg
								class="h-3 w-3 shrink-0 text-fuchsia-400 dark:text-fuchsia-500"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
								/>
							</svg>
						{/if}

						{#if entry.highlightCount > 0}
							<span
								class="shrink-0 rounded-full bg-fuchsia-100 px-1.5 py-0 text-[10px] font-medium tabular-nums text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400"
							>
								{entry.highlightCount}
							</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
