<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getQAPair } from '$lib/data/manifest';
	import { createNotebook, addEntry } from '$lib/stores/notebooks.svelte';
	import QADisplay from '$lib/components/QADisplay.svelte';
	import type { QAPair } from '$lib/types';

	let title = $state('Shared Notebook');
	let passages = $state<QAPair[]>([]);
	let loading = $state(true);
	let saveStatus = $state('');

	$effect(() => {
		const t = page.url.searchParams.get('title');
		const entriesParam = page.url.searchParams.get('entries');

		if (t) title = t;

		if (entriesParam) {
			const ids = entriesParam.split(',').filter(Boolean);
			loadPassages(ids);
		} else {
			passages = [];
			loading = false;
		}
	});

	async function loadPassages(ids: string[]) {
		loading = true;
		const results: QAPair[] = [];
		for (const id of ids) {
			const qa = await getQAPair(id);
			if (qa) results.push(qa);
		}
		passages = results;
		loading = false;
	}

	async function saveToNotebooks() {
		const nb = await createNotebook(title);
		for (const qa of passages) {
			await addEntry(nb.id, qa.id);
		}
		saveStatus = 'Saved!';
		setTimeout(() => goto(`/notebooks/${nb.id}`), 500);
	}
</script>

<svelte:head>
	<title>{title} — Ra Reader</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6">
		<a href="/notebooks" class="text-sm text-stone-400 hover:text-ra">&larr; Notebooks</a>
	</div>

	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">{title}</h1>
			<p class="text-sm text-stone-500 dark:text-stone-400">
				{passages.length} passages · Shared collection
			</p>
		</div>
		<button
			onclick={saveToNotebooks}
			disabled={!!saveStatus || passages.length === 0}
			class="flex items-center gap-1.5 rounded-lg bg-ra px-4 py-2 text-sm font-medium text-white hover:bg-ra/90 disabled:opacity-50"
		>
			{#if saveStatus}
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				{saveStatus}
			{:else}
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				Save to My Notebooks
			{/if}
		</button>
	</div>

	{#if loading}
		<div class="space-y-4">
			{#each Array(3) as _}
				<div class="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
			{/each}
		</div>
	{:else if passages.length === 0}
		<div class="rounded-lg border border-dashed border-stone-300 p-12 text-center dark:border-stone-700">
			<p class="text-stone-500 dark:text-stone-400">No passages in this shared notebook</p>
			<p class="mt-1 text-sm text-stone-400">
				The link may be invalid or the passages could not be found
			</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each passages as qa (qa.id)}
				<div class="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900/60 sm:p-8">
					<QADisplay {qa} />
				</div>
			{/each}
		</div>
	{/if}
</div>
