<script lang="ts">
	import {
		getSearchState,
		closeSearch,
		setQuery,
		setSearchMode,
		setSelectedIndex,
		performSearch
	} from '$lib/stores/search.svelte';
	import type { SearchMode } from '$lib/stores/search.svelte';
	import { goto } from '$app/navigation';
	import QADisplay from '$lib/components/QADisplay.svelte';

	const search = getSearchState();
	let inputEl: HTMLInputElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (search.isOpen && inputEl) {
			setTimeout(() => inputEl?.focus(), 0);
		}
	});

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		setQuery(value);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			performSearch(value);
		}, 150);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeSearch();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (search.selectedIndex < search.results.length - 1) {
				setSelectedIndex(search.selectedIndex + 1);
				scrollToSelected();
			}
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (search.selectedIndex > 0) {
				setSelectedIndex(search.selectedIndex - 1);
				scrollToSelected();
			}
		}
		if (e.key === 'Enter' && search.results.length > 0) {
			const result = search.results[search.selectedIndex];
			if (result?.sessionNum !== undefined) {
				goto(`/session/${result.sessionNum}#${result.qaIndex}`);
				closeSearch();
			}
		}
	}

	function scrollToSelected() {
		const el = document.querySelector(`[data-search-idx="${search.selectedIndex}"]`);
		el?.scrollIntoView({ block: 'nearest' });
	}

	function navigateToResult(idx: number) {
		const result = search.results[idx];
		if (result?.sessionNum !== undefined) {
			goto(`/session/${result.sessionNum}#${result.qaIndex}`);
			closeSearch();
		}
	}

	function truncate(text: string, len = 100): string {
		if (!text || text.length <= len) return text ?? '';
		return text.slice(0, len) + '...';
	}

	let selectedResult = $derived(
		search.results.length > 0 ? search.results[search.selectedIndex] : null
	);

	const modes: { value: SearchMode; label: string }[] = [
		{ value: 'fulltext', label: 'Text' },
		{ value: 'semantic', label: 'Semantic' },
		{ value: 'hybrid', label: 'Hybrid' }
	];
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (search.isOpen) {
				closeSearch();
			} else {
				import('$lib/stores/search.svelte').then((m) => m.openSearch());
			}
		}
	}}
/>

{#if search.isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- backdrop -->
		<button
			class="absolute inset-0 bg-black/50"
			onclick={closeSearch}
			aria-label="Close search"
			tabindex="-1"
		></button>

		<!-- panel modal -->
		<div
			class="relative flex max-h-[85vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
		>
			<!-- Left sidebar -->
			<div class="flex w-80 shrink-0 flex-col border-r border-stone-200 dark:border-stone-700">
				<!-- Search input -->
				<div class="flex items-center gap-3 border-b border-stone-200 px-4 dark:border-stone-700">
					<svg
						class="h-5 w-5 shrink-0 text-stone-400"
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
						onkeydown={handleKeydown}
						placeholder="Search..."
						class="flex-1 border-0 bg-transparent py-3 text-sm text-stone-900 placeholder-stone-400 focus:ring-0 dark:text-stone-100"
					/>
					{#if search.isSearching}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-ra"
						></div>
					{/if}
				</div>

				<!-- Mode toggle -->
				<div class="flex items-center gap-1 border-b border-stone-100 px-4 py-1.5 dark:border-stone-800">
					{#each modes as mode}
						<button
							onclick={() => {
								setSearchMode(mode.value);
								if (search.query) performSearch(search.query);
							}}
							class="rounded px-2 py-0.5 text-xs"
							class:bg-ra={search.searchMode === mode.value}
							class:text-white={search.searchMode === mode.value}
							class:text-stone-500={search.searchMode !== mode.value}
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

				<!-- Result list -->
				<div class="flex-1 overflow-y-auto">
					{#if search.results.length > 0}
						{#each search.results as result, idx}
							{#if idx > 0}
								<div class="mx-3 border-t border-stone-100 dark:border-stone-800"></div>
							{/if}
							<button
								data-search-idx={idx}
								onclick={() => setSelectedIndex(idx)}
								ondblclick={() => navigateToResult(idx)}
								class="w-full px-4 py-3 text-left transition-colors"
								class:bg-stone-100={search.selectedIndex === idx}
								class:dark:bg-stone-800={search.selectedIndex === idx}
								onmouseenter={() => setSelectedIndex(idx)}
							>
								<div class="mb-1 flex items-center gap-2">
									<span class="font-mono text-xs font-semibold tabular-nums text-ra"
										>{result.sessionNum}.{result.qaIndex}</span
									>
									<span class="text-[10px] text-stone-400">
										{result.score.toFixed(2)}
									</span>
								</div>
								<div class="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
									{truncate(result.answer ?? result.question ?? '', 100)}
								</div>
							</button>
						{/each}
					{:else if search.query && !search.isSearching}
						<div class="py-8 text-center text-sm text-stone-400">No results found</div>
					{:else if !search.query}
						<div class="py-8 text-center text-sm text-stone-400">
							Type to search
						</div>
					{/if}
				</div>

				<!-- Footer -->
				{#if search.results.length > 0}
					<div
						class="border-t border-stone-100 px-4 py-2 text-xs text-stone-400 dark:border-stone-800"
					>
						<span>
							{search.results.length} results
							<a
								href="/search?q={encodeURIComponent(search.query)}&mode={search.searchMode}"
								onclick={closeSearch}
								class="ml-2 text-ra hover:underline"
							>
								View all
							</a>
						</span>
						<div class="mt-1">
							<kbd class="rounded bg-stone-100 px-1 dark:bg-stone-800">↑↓</kbd> navigate
							<kbd class="ml-2 rounded bg-stone-100 px-1 dark:bg-stone-800">↵</kbd> go to session
							<kbd class="ml-2 rounded bg-stone-100 px-1 dark:bg-stone-800">esc</kbd> close
						</div>
					</div>
				{/if}
			</div>

			<!-- Right panel: full passage -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if selectedResult}
					<div class="mb-4">
						<a
							href="/session/{selectedResult.sessionNum}#{selectedResult.qaIndex}"
							onclick={closeSearch}
							class="text-sm font-medium text-ra hover:underline"
						>
							Session {selectedResult.sessionNum}, Q&A {selectedResult.qaIndex}
						</a>
					</div>
					<QADisplay
						qa={{
							id: selectedResult.id,
							sessionNum: selectedResult.sessionNum ?? 0,
							qaIndex: selectedResult.qaIndex ?? 0,
							question: selectedResult.question ?? '',
							answer: selectedResult.answer ?? '',
							audioPath: '',
							machineTranscriptPath: '',
							questionWordCount: 0,
							answerWordCount: 0
						}}
						highlightQuery={search.query}
					/>
				{:else if search.query && !search.isSearching && search.results.length === 0}
					<div class="flex h-full items-center justify-center text-sm text-stone-400">
						No results found
					</div>
				{:else}
					<div class="flex h-full items-center justify-center text-sm text-stone-400">
						{#if search.query && search.isSearching}
							Searching...
						{:else}
							Select a result to view the full passage
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
