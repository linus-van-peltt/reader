<script lang="ts">
	import { exportAll, importAll } from '$lib/stores/notebooks.svelte';

	let importStatus = $state('');
	let exportStatus = $state('');

	async function handleExport() {
		try {
			const json = await exportAll();
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ra-reader-backup-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			exportStatus = 'Backup downloaded!';
			setTimeout(() => (exportStatus = ''), 3000);
		} catch (e) {
			exportStatus = `Export failed: ${e}`;
		}
	}

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const count = await importAll(text);
			importStatus = `Imported ${count} notebooks!`;
			setTimeout(() => (importStatus = ''), 3000);
		} catch (err) {
			importStatus = `Import failed: ${err}`;
		}
		input.value = '';
	}
</script>

<svelte:head>
	<title>Settings — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Settings</h1>
</div>

<div class="max-w-xl space-y-8">
	<section class="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900/50">
		<h2 class="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
			Backup &amp; Restore
		</h2>
		<p class="mb-4 text-sm text-stone-500 dark:text-stone-400">
			Your notebooks are stored locally in your browser. Export a backup to keep your data safe.
		</p>

		<div class="space-y-4">
			<div>
				<button
					onclick={handleExport}
					class="rounded-lg bg-ra px-4 py-2 text-sm font-medium text-white hover:bg-ra/90"
				>
					Export Notebooks
				</button>
				{#if exportStatus}
					<span class="ml-2 text-sm text-green-600 dark:text-green-400">{exportStatus}</span>
				{/if}
			</div>

			<div>
				<label class="block">
					<span class="text-sm font-medium text-stone-700 dark:text-stone-300">
						Import from backup
					</span>
					<input
						type="file"
						accept=".json"
						onchange={handleImport}
						class="mt-1 block w-full text-sm text-stone-500 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200 dark:text-stone-400 dark:file:bg-stone-800 dark:file:text-stone-300"
					/>
				</label>
				{#if importStatus}
					<p class="mt-1 text-sm text-green-600 dark:text-green-400">{importStatus}</p>
				{/if}
			</div>
		</div>
	</section>

	<section class="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900/50">
		<h2 class="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
			About
		</h2>
		<p class="text-sm text-stone-500 dark:text-stone-400">
			Ra Reader is a study companion for the Law of One material.
		</p>
		<div class="mt-3">
			<a href="/about" class="text-sm text-ra hover:underline">Learn more about Ra Reader</a>
		</div>
	</section>

	<section class="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900/50">
		<h2 class="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
			Keyboard Shortcuts
		</h2>
		<div class="mt-3 space-y-2 text-sm">
			<div class="flex justify-between">
				<span class="text-stone-600 dark:text-stone-400">Open search</span>
				<kbd class="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">⌘K</kbd>
			</div>
			<div class="flex justify-between">
				<span class="text-stone-600 dark:text-stone-400">Close modal</span>
				<kbd class="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">Esc</kbd>
			</div>
			<div class="flex justify-between">
				<span class="text-stone-600 dark:text-stone-400">Navigate results</span>
				<kbd class="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">↑↓</kbd>
			</div>
			<div class="flex justify-between">
				<span class="text-stone-600 dark:text-stone-400">Select result</span>
				<kbd class="rounded bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-800">Enter</kbd>
			</div>
		</div>
	</section>
</div>
