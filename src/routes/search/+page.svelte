<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		getSearchState,
		setSearchMode,
		setQuery,
		performSearch
	} from '$lib/stores/search.svelte';
	import { initSearch } from '$lib/search/fulltext';
	import type { SearchMode } from '$lib/stores/search.svelte';
	import QADisplay from '$lib/components/QADisplay.svelte';
	import QAPreviewLink from '$lib/components/sidebar/QAPreviewLink.svelte';

	const search = getSearchState();

	const PER_PAGE = 20;

	let currentPage = $state(1);
	let hasSearched = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let inputEl = $state<HTMLInputElement>();

	const modes: { value: SearchMode; label: string }[] = [
		{ value: 'fulltext', label: 'Text' },
		{ value: 'semantic', label: 'Semantic' },
		{ value: 'hybrid', label: 'Hybrid' }
	];

	let totalPages = $derived(Math.ceil(search.results.length / PER_PAGE));
	let pagedResults = $derived(
		search.results.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);

	// Read URL params on load
	$effect(() => {
		const q = page.url.searchParams.get('q') || '';
		const mode = page.url.searchParams.get('mode') as SearchMode | null;

		if (mode && ['fulltext', 'semantic', 'hybrid'].includes(mode)) {
			setSearchMode(mode);
		}

		if (q) {
			setQuery(q);
			runSearch(q);
		}
	});

	async function runSearch(q: string) {
		await initSearch();
		await performSearch(q);
		hasSearched = true;
		currentPage = 1;
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		setQuery(value);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateUrl(value, search.searchMode);
			runSearch(value);
		}, 300);
	}

	function handleModeChange(mode: SearchMode) {
		setSearchMode(mode);
		updateUrl(search.query, mode);
		if (search.query) {
			runSearch(search.query);
		}
	}

	function updateUrl(q: string, mode: SearchMode) {
		const url = new URL(page.url);
		if (q) {
			url.searchParams.set('q', q);
		} else {
			url.searchParams.delete('q');
		}
		url.searchParams.set('mode', mode);
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}
</script>

<svelte:head>
	<title>{search.query ? `"${search.query}" — Search` : 'Search'} — Ra Reader</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
	<!-- Search header -->
	<div class="mb-6">
		<h1 class="mb-4 text-2xl font-bold text-stone-900 dark:text-stone-100">Search</h1>

		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div class="relative flex-1">
				<svg
					class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					bind:this={inputEl}
					type="text"
					value={search.query}
					oninput={handleInput}
					placeholder="Search the Ra Material..."
					class="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder-stone-400 focus:border-ra focus:ring-1 focus:ring-ra dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
				/>
				{#if search.isSearching}
					<div
						class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-stone-300 border-t-ra"
					></div>
				{/if}
			</div>

			<div class="flex items-center gap-1">
				{#each modes as mode}
					<button
						onclick={() => handleModeChange(mode.value)}
						class="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
						class:bg-ra={search.searchMode === mode.value}
						class:text-white={search.searchMode === mode.value}
						class:text-stone-600={search.searchMode !== mode.value}
						class:hover:bg-stone-100={search.searchMode !== mode.value}
						class:dark:text-stone-400={search.searchMode !== mode.value}
						class:dark:hover:bg-stone-800={search.searchMode !== mode.value}
					>
						{mode.label}
					</button>
				{/each}
				{#if search.semanticLoading}
					<span class="ml-2 text-xs text-stone-400">Loading model...</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Results info -->
	{#if hasSearched && !search.isSearching}
		<div class="mb-4 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
			<span>
				{search.results.length} result{search.results.length !== 1 ? 's' : ''}
				{#if search.query}for "{search.query}"{/if}
			</span>
			{#if totalPages > 1}
				<span>Page {currentPage} of {totalPages}</span>
			{/if}
		</div>
	{/if}

	<!-- Results -->
	<div class="space-y-4">
		{#each pagedResults as result (result.id)}
			<div class="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900/60 sm:p-8">
				<!-- Score badge -->
				<div class="mb-4 flex items-center justify-between">
					<QAPreviewLink
						session={result.sessionNum ?? 0}
						qaIndex={result.qaIndex ?? 0}
						label="Session {result.sessionNum}, Q&A {result.qaIndex}"
						class="text-xs font-medium text-ra hover:underline"
					/>
					<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums text-stone-400 dark:bg-stone-800">
						{result.score.toFixed(2)}
					</span>
				</div>

				<QADisplay
					qa={{
						id: result.id,
						sessionNum: result.sessionNum ?? 0,
						qaIndex: result.qaIndex ?? 0,
						question: result.question ?? '',
						answer: result.answer ?? '',
						audioPath: '',
						machineTranscriptPath: '',
						questionWordCount: 0,
						answerWordCount: 0
					}}
					highlightQuery={search.query}
				/>
			</div>
		{/each}
	</div>

	<!-- Empty states -->
	{#if hasSearched && !search.isSearching && search.results.length === 0}
		<div class="py-16 text-center text-stone-400">
			<p class="text-lg">No results found</p>
			<p class="mt-1 text-sm">Try different keywords or switch search modes</p>
		</div>
	{/if}

	{#if !hasSearched && !search.query}
		<div class="py-16 text-center text-stone-400">
			<p class="text-lg">Search across all 106 sessions</p>
			<p class="mt-1 text-sm">Enter a query above to find relevant passages</p>
		</div>
	{/if}

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="mt-8 flex items-center justify-center gap-2">
			<button
				onclick={() => (currentPage = Math.max(1, currentPage - 1))}
				disabled={currentPage === 1}
				class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
			>
				Previous
			</button>

			{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
				{#if p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)}
					<button
						onclick={() => (currentPage = p)}
						class="rounded-lg px-3 py-1.5 text-sm transition-colors"
						class:bg-ra={currentPage === p}
						class:text-white={currentPage === p}
						class:text-stone-600={currentPage !== p}
						class:hover:bg-stone-100={currentPage !== p}
						class:dark:text-stone-400={currentPage !== p}
						class:dark:hover:bg-stone-800={currentPage !== p}
					>
						{p}
					</button>
				{:else if p === currentPage - 2 || p === currentPage + 2}
					<span class="px-1 text-stone-400">...</span>
				{/if}
			{/each}

			<button
				onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
				disabled={currentPage === totalPages}
				class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
			>
				Next
			</button>
		</div>
	{/if}
</div>
