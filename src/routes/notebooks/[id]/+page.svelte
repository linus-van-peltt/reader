<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		getNotebook,
		removeEntry,
		updateEntryNote,
		reorderEntries,
		deleteNotebook
	} from '$lib/stores/notebooks.svelte';
	import { getQAPair } from '$lib/data/manifest';
	import QADisplay from '$lib/components/QADisplay.svelte';
	import type { Notebook, QAPair } from '$lib/types';

	let notebook = $state<Notebook | undefined>();
	let qaCache = $state<Map<string, QAPair>>(new Map());
	let loading = $state(true);
	let editingNote = $state<string | null>(null);
	let noteText = $state('');

	let notebookId = $derived(page.params.id);

	$effect(() => {
		loadNotebook(notebookId);
	});

	async function loadNotebook(id: string) {
		loading = true;
		notebook = await getNotebook(id);
		if (notebook) {
			const cache = new Map<string, QAPair>();
			for (const entry of notebook.entries) {
				const qa = await getQAPair(entry.qaPairId);
				if (qa) cache.set(entry.qaPairId, qa);
			}
			qaCache = cache;
		}
		loading = false;
	}

	async function handleRemove(entryId: string) {
		if (!notebook) return;
		await removeEntry(notebook.id, entryId);
		notebook = await getNotebook(notebook.id);
	}

	function startEditNote(entryId: string, currentNote: string) {
		editingNote = entryId;
		noteText = currentNote;
	}

	async function saveNote(entryId: string) {
		if (!notebook) return;
		await updateEntryNote(notebook.id, entryId, noteText);
		notebook = await getNotebook(notebook.id);
		editingNote = null;
	}

	async function handleDelete() {
		if (!notebook) return;
		if (confirm(`Delete notebook "${notebook.title}"?`)) {
			await deleteNotebook(notebook.id);
			goto(`${base}/notebooks`);
		}
	}

	let copyStatus = $state('');
	let canShare = $state(false);

	$effect(() => {
		canShare = typeof navigator !== 'undefined' && !!navigator.share;
	});

	function getShareUrl() {
		if (!notebook || notebook.entries.length === 0) return '';
		const ids = notebook.entries.map((e) => e.qaPairId).join(',');
		return `${window.location.origin}${base}/notebooks/shared?title=${encodeURIComponent(notebook.title)}&entries=${ids}`;
	}

	async function handleCopy() {
		const url = getShareUrl();
		if (!url) return;
		await navigator.clipboard.writeText(url);
		copyStatus = 'Copied!';
		setTimeout(() => (copyStatus = ''), 2000);
	}

	async function handleShare() {
		if (!notebook) return;
		const url = getShareUrl();
		if (!url) return;
		try {
			await navigator.share({ title: notebook.title, url });
		} catch {
			// User cancelled share sheet
		}
	}

	let dragIdx = $state<number | null>(null);

	async function handleDrop(targetIdx: number) {
		if (dragIdx === null || !notebook || dragIdx === targetIdx) return;
		const ids = notebook.entries.map((e) => e.id);
		const [moved] = ids.splice(dragIdx, 1);
		ids.splice(targetIdx, 0, moved);
		await reorderEntries(notebook.id, ids);
		notebook = await getNotebook(notebook.id);
		dragIdx = null;
	}
</script>

<svelte:head>
	<title>{notebook?.title ?? 'Notebook'} — Ra Reader</title>
</svelte:head>

{#if loading}
	<div class="space-y-4">
		<div class="h-8 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
		{#each Array(3) as _}
			<div class="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if !notebook}
	<div class="py-12 text-center">
		<p class="text-lg text-stone-500">Notebook not found</p>
		<a href="{base}/notebooks" class="mt-2 inline-block text-sm text-ra hover:underline">
			Back to notebooks
		</a>
	</div>
{:else}
	<div class="mb-6 flex items-center justify-between">
		<div>
			<div class="flex items-center gap-2">
				<a href="{base}/notebooks" class="text-sm text-stone-400 hover:text-ra">&larr; Notebooks</a>
			</div>
			<h1 class="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">
				{notebook.title}
			</h1>
			<p class="text-sm text-stone-500 dark:text-stone-400">
				{notebook.entries.length} passages
			</p>
		</div>
		<div class="flex items-center gap-2">
			{#if copyStatus}
				<span class="text-xs text-green-600 dark:text-green-400">{copyStatus}</span>
			{/if}
			<button
				onclick={handleCopy}
				disabled={!notebook || notebook.entries.length === 0}
				class="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
				</svg>
				Copy Link
			</button>
			{#if canShare}
				<button
					onclick={handleShare}
					disabled={!notebook || notebook.entries.length === 0}
					class="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
					</svg>
					Share
				</button>
			{/if}
			<button
				onclick={handleDelete}
				class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
			>
				Delete
			</button>
		</div>
	</div>

	{#if notebook.entries.length === 0}
		<div class="rounded-lg border border-dashed border-stone-300 p-12 text-center dark:border-stone-700">
			<p class="text-stone-500 dark:text-stone-400">No passages saved yet</p>
			<p class="mt-1 text-sm text-stone-400">
				Use the search or browse sessions to add passages
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each notebook.entries as entry, idx (entry.id)}
				{@const qa = qaCache.get(entry.qaPairId)}
				<div
					class="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900/60 sm:p-8"
					draggable="true"
					ondragstart={() => (dragIdx = idx)}
					ondragover={(e) => e.preventDefault()}
					ondrop={() => handleDrop(idx)}
				>
					{#if entry.note && editingNote !== entry.id}
						<div class="mb-4 rounded-lg border-l-[3px] border-fuchsia-400 bg-fuchsia-50/50 px-4 py-3 dark:border-fuchsia-500 dark:bg-fuchsia-500/10">
							<p class="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{entry.note}</p>
						</div>
					{/if}

					{#if qa}
						<QADisplay {qa} highlights={entry.highlights} />
					{:else}
						<p class="text-sm text-stone-400">Passage {entry.qaPairId} not found</p>
					{/if}

					<div class="mt-4 flex items-center gap-1">
						{#if editingNote === entry.id}
							<div class="flex flex-1 gap-2">
								<input
									type="text"
									bind:value={noteText}
									class="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:border-ra focus:outline-none focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
									placeholder="Add a note…"
								/>
								<button
									onclick={() => saveNote(entry.id)}
									class="rounded-lg bg-ra px-3 py-1.5 text-xs font-medium text-white hover:bg-ra/90"
								>
									Save
								</button>
								<button
									onclick={() => (editingNote = null)}
									class="rounded-lg px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
								>
									Cancel
								</button>
							</div>
						{:else}
							<button
								onclick={() => startEditNote(entry.id, entry.note)}
								class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
							>
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
								</svg>
								{entry.note ? 'Edit note' : 'Add note'}
							</button>
							<button
								onclick={() => handleRemove(entry.id)}
								class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-stone-500 dark:hover:bg-red-950 dark:hover:text-red-400"
							>
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
								</svg>
								Remove
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}
