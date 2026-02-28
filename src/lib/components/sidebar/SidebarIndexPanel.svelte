<script lang="ts">
	import { page } from '$app/state';
	import { getIndexTermsForSession, searchIndexTerms } from '$lib/data/index-terms';
	import { getSidebarState } from '$lib/stores/sidebar.svelte';
	import QAPreviewLink from './QAPreviewLink.svelte';
	import type { IndexTerm, IndexReference } from '$lib/types';

	const sidebar = getSidebarState();

	let sessionNum = $derived(Number(page.params.id));
	let allTerms = $state<IndexTerm[]>([]);
	let viewTerms = $state<IndexTerm[]>([]);
	let loading = $state(true);
	let manualExpanded = $state<Record<string, true>>({});
	let manualCollapsed = $state<Record<string, true>>({});
	let mode = $state<'view' | 'session'>('view');
	let filter = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	let activeQa = $derived(sidebar.activeQaIndex);
	let baseTerms = $derived(mode === 'view' ? viewTerms : allTerms);
	let terms = $derived(
		filter.trim()
			? baseTerms.filter((t) => t.term.toLowerCase().includes(filter.trim().toLowerCase()))
			: baseTerms
	);

	// Load all terms for the session
	$effect(() => {
		const num = sessionNum;
		loading = true;
		getIndexTermsForSession(num).then((t) => {
			allTerms = t;
			loading = false;
			manualExpanded = {};
			manualCollapsed = {};
		});
	});

	// Update view-filtered terms when visible QA indices change
	$effect(() => {
		const num = sessionNum;
		const indices = sidebar.visibleQaIndices;
		if (indices.length === 0) {
			viewTerms = [];
			return;
		}
		getIndexTermsForSession(num, indices).then((t) => {
			viewTerms = t;
		});
	});

	function refContainsActive(ref: IndexReference): boolean {
		if (activeQa === null) return false;
		return ref.session === sessionNum && activeQa >= ref.start && activeQa <= ref.end;
	}

	function termContainsActive(term: IndexTerm): boolean {
		if (activeQa === null) return false;
		return term.references.some(refContainsActive);
	}

	function isCurrentSession(ref: IndexReference): boolean {
		return ref.session === sessionNum;
	}

	function isExpanded(term: IndexTerm): boolean {
		const containsActive = termContainsActive(term);
		if (term.term in manualCollapsed) return false;
		if (term.term in manualExpanded) return true;
		return containsActive;
	}

	function toggleTerm(termName: string, currentlyExpanded: boolean) {
		if (currentlyExpanded) {
			const { [termName]: _, ...restExpanded } = manualExpanded;
			manualExpanded = restExpanded;
			manualCollapsed = { ...manualCollapsed, [termName]: true };
		} else {
			const { [termName]: _, ...restCollapsed } = manualCollapsed;
			manualCollapsed = restCollapsed;
			manualExpanded = { ...manualExpanded, [termName]: true };
		}
	}

	function formatRef(ref: IndexReference): string {
		if (ref.start === ref.end) return `${ref.session}.${ref.start}`;
		return `${ref.session}.${ref.start}-${ref.end}`;
	}

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		filter = value;
	}
</script>

<div class="flex flex-col">
	<!-- Mode toggle + search -->
	<div class="sticky top-0 z-10 flex flex-col gap-1.5 bg-white p-2 dark:bg-stone-900">
		<div class="flex items-center gap-1">
			<button
				onclick={() => (mode = 'view')}
				class="flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors {mode === 'view'
					? 'bg-ra/10 text-ra'
					: 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'}"
			>
				In View
			</button>
			<button
				onclick={() => (mode = 'session')}
				class="flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors {mode === 'session'
					? 'bg-ra/10 text-ra'
					: 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'}"
			>
				Full Session
			</button>
		</div>
		<input
			type="text"
			placeholder="Filter terms…"
			value={filter}
			oninput={handleInput}
			class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-ra focus:outline-none focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
		/>
	</div>

	{#if loading}
		<div class="space-y-2 p-2">
			{#each Array(6) as _}
				<div class="h-7 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
			{/each}
		</div>
	{:else if terms.length === 0}
		<p class="py-8 text-center text-xs text-stone-400">
			{filter.trim() ? 'No matching terms' : mode === 'view' ? 'No index terms for visible passages' : 'No index terms for this session'}
		</p>
	{:else}
		<div class="flex flex-col gap-0.5 p-2">
			{#each terms as term (term.term)}
				{@const containsActive = termContainsActive(term)}
				{@const expanded = isExpanded(term)}
				<div>
					<button
						onclick={() => toggleTerm(term.term, expanded)}
						class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors {containsActive
							? 'bg-ra/5 dark:bg-ra/10'
							: 'hover:bg-stone-100 dark:hover:bg-stone-800'}"
					>
						<span class="truncate font-medium {containsActive ? 'text-ra' : 'text-stone-700 dark:text-stone-300'}">{term.term}</span>
						<span class="flex items-center gap-1.5">
							<span class="tabular-nums {containsActive ? 'text-ra/60' : 'text-stone-400 dark:text-stone-500'}">
								{term.references.length}
							</span>
							<svg
								class="h-3 w-3 transition-transform duration-200 {containsActive ? 'text-ra/40' : 'text-stone-300 dark:text-stone-600'}"
								class:rotate-90={expanded}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</span>
					</button>

					{#if expanded}
						<div class="ml-2 mt-0.5 border-l pl-2 {containsActive ? 'border-ra/30' : 'border-stone-200 dark:border-stone-700'}">
							<div class="flex flex-wrap gap-1 px-1 py-0.5">
								{#each term.references as ref}
									<QAPreviewLink
										session={ref.session}
										qaIndex={ref.start}
										label={formatRef(ref)}
										active={refContainsActive(ref)}
										class="rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors {refContainsActive(ref)
											? 'bg-ra text-white'
											: isCurrentSession(ref)
												? 'bg-stone-100 text-ra hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra'
												: 'bg-stone-50 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:bg-stone-800/50 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300'}"
									/>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
