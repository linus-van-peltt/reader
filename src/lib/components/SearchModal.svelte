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

	function getContextAroundMatch(
		text: string,
		query: string,
		contextLen = 200
	): { before: string; match: string; after: string } {
		if (!text || !query) return { before: '', match: '', after: '' };

		const words = query
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2);
		const lower = text.toLowerCase();

		let bestPos = -1;
		for (const word of words) {
			const pos = lower.indexOf(word);
			if (pos !== -1) {
				bestPos = pos;
				break;
			}
		}

		if (bestPos === -1) {
			return {
				before: '',
				match: text.slice(0, contextLen),
				after: text.length > contextLen ? '...' : ''
			};
		}

		const start = Math.max(0, bestPos - contextLen / 2);
		const end = Math.min(text.length, bestPos + contextLen / 2);
		const matchEnd = Math.min(text.length, bestPos + (words[0]?.length ?? 10));

		return {
			before: (start > 0 ? '...' : '') + text.slice(start, bestPos),
			match: text.slice(bestPos, matchEnd),
			after: text.slice(matchEnd, end) + (end < text.length ? '...' : '')
		};
	}

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
	<div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
		<!-- backdrop -->
		<button
			class="absolute inset-0 bg-black/50"
			onclick={closeSearch}
			aria-label="Close search"
			tabindex="-1"
		></button>

		<!-- modal -->
		<div
			class="relative mx-4 w-full max-w-3xl rounded-xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
		>
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
					placeholder="Search the Ra Material..."
					class="flex-1 border-0 bg-transparent py-3 text-sm text-stone-900 placeholder-stone-400 focus:ring-0 dark:text-stone-100"
				/>
				{#if search.isSearching}
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-ra"
					></div>
				{/if}
			</div>

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

			<div class="max-h-[60vh] overflow-y-auto p-2">
				{#if search.results.length > 0}
					{#each search.results as result, idx}
						{#if idx > 0}
							<div class="mx-3 border-t border-stone-100 dark:border-stone-800"></div>
						{/if}
						<button
							data-search-idx={idx}
							onclick={() => navigateToResult(idx)}
							class="w-full rounded-lg px-4 py-3.5 text-left transition-colors"
							class:bg-stone-100={search.selectedIndex === idx}
							class:dark:bg-stone-800={search.selectedIndex === idx}
							onmouseenter={() => setSelectedIndex(idx)}
						>
							<div class="mb-1.5 flex items-center gap-2">
								<span class="font-mono text-xs font-semibold tabular-nums text-ra"
									>{result.sessionNum}.{result.qaIndex}</span
								>
								<span class="text-[10px] text-stone-400">
									{result.score.toFixed(2)}
								</span>
							</div>
							{#if result.question}
								{@const ctx = getContextAroundMatch(result.question, search.query, 240)}
								<div class="mb-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
									<span class="font-medium text-questioner">Q:</span>
									<span>{ctx.before}</span><mark
										class="rounded bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25"
										>{ctx.match}</mark
									><span>{ctx.after}</span>
								</div>
							{/if}
							{#if result.answer}
								{@const ctx = getContextAroundMatch(result.answer, search.query, 320)}
								<div class="text-sm leading-relaxed text-stone-500 dark:text-stone-500">
									<span class="font-medium text-ra">Ra:</span>
									<span>{ctx.before}</span><mark
										class="rounded bg-fuchsia-300/40 px-0.5 dark:bg-fuchsia-500/25"
										>{ctx.match}</mark
									><span>{ctx.after}</span>
								</div>
							{/if}
						</button>
					{/each}
				{:else if search.query && !search.isSearching}
					<div class="py-8 text-center text-sm text-stone-400">No results found</div>
				{:else if !search.query}
					<div class="py-8 text-center text-sm text-stone-400">
						Type to search across all sessions
					</div>
				{/if}
			</div>

			{#if search.results.length > 0}
				<div
					class="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-xs text-stone-400 dark:border-stone-800"
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
					<span>
						<kbd class="rounded bg-stone-100 px-1 dark:bg-stone-800">↑↓</kbd> navigate
						<kbd class="ml-2 rounded bg-stone-100 px-1 dark:bg-stone-800">↵</kbd> select
						<kbd class="ml-2 rounded bg-stone-100 px-1 dark:bg-stone-800">esc</kbd> close
					</span>
				</div>
			{/if}
		</div>
	</div>
{/if}
