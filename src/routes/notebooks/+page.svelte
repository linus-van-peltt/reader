<script lang="ts">
	import { base } from '$app/paths';
	import {
		getNotebooksState,
		loadNotebooks,
		createNotebook,
		deleteNotebook
	} from '$lib/stores/notebooks.svelte';

	const nbState = getNotebooksState();
	let newTitle = $state('');
	let loading = $state(true);

	$effect(() => {
		loadNotebooks().then(() => (loading = false));
	});

	async function handleCreate() {
		if (!newTitle.trim()) return;
		await createNotebook(newTitle.trim());
		newTitle = '';
	}

	async function handleDelete(id: string, title: string) {
		if (confirm(`Delete notebook "${title}"?`)) {
			await deleteNotebook(id);
		}
	}
</script>

<svelte:head>
	<title>Notebooks — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Notebooks</h1>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		Save and organize passages for study
	</p>
</div>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleCreate();
	}}
	class="mb-8 flex gap-2"
>
	<input
		type="text"
		bind:value={newTitle}
		placeholder="New notebook title..."
		class="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm focus:border-ra focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-900"
	/>
	<button
		type="submit"
		disabled={!newTitle.trim()}
		class="rounded-lg bg-ra px-4 py-2 text-sm font-medium text-white hover:bg-ra/90 disabled:opacity-50"
	>
		Create
	</button>
</form>

{#if loading}
	<div class="space-y-3">
		{#each Array(3) as _}
			<div class="h-20 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if nbState.notebooks.length === 0}
	<div class="rounded-lg border border-dashed border-stone-300 p-12 text-center dark:border-stone-700">
		<p class="text-stone-500 dark:text-stone-400">No notebooks yet</p>
		<p class="mt-1 text-sm text-stone-400 dark:text-stone-500">
			Create a notebook to start saving passages
		</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each nbState.notebooks as nb}
			<div class="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/50">
				<a href="{base}/notebooks/{nb.id}" class="min-w-0 flex-1">
					<h2 class="font-medium text-stone-900 hover:text-ra dark:text-stone-100">
						{nb.title}
					</h2>
					<p class="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
						{nb.entries.length} passages &middot; Updated {new Date(nb.updatedAt).toLocaleDateString()}
					</p>
				</a>
				<button
					onclick={() => handleDelete(nb.id, nb.title)}
					class="ml-4 rounded p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
					aria-label="Delete notebook"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
{/if}

<div class="mt-8">
	<a
		href="{base}/settings"
		class="text-sm text-stone-500 hover:text-ra dark:text-stone-400"
	>
		Backup &amp; Restore notebooks &rarr;
	</a>
</div>
