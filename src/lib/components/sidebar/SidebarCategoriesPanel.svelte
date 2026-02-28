<script lang="ts">
	import { page } from '$app/state';
	import { getCategoriesForSession } from '$lib/data/categories';
	import { getSidebarState } from '$lib/stores/sidebar.svelte';
	import QAPreviewLink from './QAPreviewLink.svelte';
	import type { Category } from '$lib/types';

	const sidebar = getSidebarState();

	let sessionNum = $derived(Number(page.params.id));
	let allCategories = $state<Category[]>([]);
	let viewCategories = $state<Category[]>([]);
	let loading = $state(true);
	let manualExpanded = $state<Record<string, true>>({});
	let manualCollapsed = $state<Record<string, true>>({});
	let mode = $state<'view' | 'session'>('view');

	let categories = $derived(mode === 'view' ? viewCategories : allCategories);
	let activeQa = $derived(sidebar.activeQaIndex);

	// Load all categories for the session
	$effect(() => {
		const num = sessionNum;
		loading = true;
		getCategoriesForSession(num).then((c) => {
			allCategories = c;
			loading = false;
			manualExpanded = {};
			manualCollapsed = {};
		});
	});

	// Update view-filtered categories when visible QA indices change
	$effect(() => {
		const num = sessionNum;
		const indices = sidebar.visibleQaIndices;
		if (indices.length === 0) {
			viewCategories = [];
			return;
		}
		getCategoriesForSession(num, indices).then((c) => {
			viewCategories = c;
		});
	});

	function hasSubcategories(cat: Category): boolean {
		return cat.subcategories.length > 1;
	}

	function totalRefs(cat: Category): number {
		return cat.subcategories.reduce((sum, s) => sum + s.references.length, 0);
	}

	function catContainsActive(cat: Category): boolean {
		if (activeQa === null) return false;
		return cat.subcategories.some((s) =>
			s.references.some((r) => r.session === sessionNum && r.qaIndex === activeQa)
		);
	}

	function isCurrentSession(ref: { session: number; qaIndex: number }): boolean {
		return ref.session === sessionNum;
	}

	function isActiveRef(ref: { session: number; qaIndex: number }): boolean {
		return ref.session === sessionNum && ref.qaIndex === activeQa;
	}

	function isExpanded(cat: Category): boolean {
		const containsActive = catContainsActive(cat);
		// Manual override takes precedence
		if (cat.id in manualCollapsed) return false;
		if (cat.id in manualExpanded) return true;
		// Auto-expand if contains active QA
		return containsActive;
	}

	function toggleCategory(catId: string, currentlyExpanded: boolean) {
		if (currentlyExpanded) {
			const { [catId]: _, ...restExpanded } = manualExpanded;
			manualExpanded = restExpanded;
			manualCollapsed = { ...manualCollapsed, [catId]: true };
		} else {
			const { [catId]: _, ...restCollapsed } = manualCollapsed;
			manualCollapsed = restCollapsed;
			manualExpanded = { ...manualExpanded, [catId]: true };
		}
	}

</script>

<div class="flex flex-col">
	<!-- Mode toggle -->
	<div class="sticky top-0 z-10 flex items-center gap-1 bg-white p-2 dark:bg-stone-900">
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

	{#if loading}
		<div class="space-y-2 p-2">
			{#each Array(6) as _}
				<div class="h-7 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
			{/each}
		</div>
	{:else if categories.length === 0}
		<p class="py-8 text-center text-xs text-stone-400">
			{mode === 'view' ? 'No categories for visible passages' : 'No categories for this session'}
		</p>
	{:else}
		<div class="flex flex-col gap-0.5 p-2">
			{#each categories as cat (cat.id)}
				{@const hasSubs = hasSubcategories(cat)}
				{@const containsActive = catContainsActive(cat)}
				{@const expanded = isExpanded(cat)}
				<div>
					<button
						onclick={() => toggleCategory(cat.id, expanded)}
						class="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors {containsActive
							? 'bg-ra/5 dark:bg-ra/10'
							: 'hover:bg-stone-100 dark:hover:bg-stone-800'}"
					>
						<span class="font-medium {containsActive ? 'text-ra' : 'text-stone-700 dark:text-stone-300'}">{cat.name}</span>
						<span class="flex items-center gap-1.5">
							<span class="tabular-nums {containsActive ? 'text-ra/60' : 'text-stone-400 dark:text-stone-500'}">
								{totalRefs(cat)}
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
							{#if hasSubs}
								{#each cat.subcategories as sub}
									<div class="mb-1">
										<div class="px-1 py-0.5 text-[10px] font-medium tracking-wider uppercase {sub.references.some(isActiveRef) ? 'text-ra/70' : 'text-stone-400 dark:text-stone-500'}">
											{sub.name}
										</div>
										<div class="flex flex-wrap gap-1 px-1">
											{#each sub.references as ref}
												<QAPreviewLink
													session={ref.session}
													qaIndex={ref.qaIndex}
													active={isActiveRef(ref)}
													class="rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors {isActiveRef(ref)
														? 'bg-ra text-white'
														: isCurrentSession(ref)
															? 'bg-stone-100 text-ra hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra'
															: 'bg-stone-50 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:bg-stone-800/50 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300'}"
												/>
											{/each}
										</div>
									</div>
								{/each}
							{:else}
								<div class="flex flex-wrap gap-1 px-1 py-0.5">
									{#each cat.subcategories[0]?.references ?? [] as ref}
										<QAPreviewLink
											session={ref.session}
											qaIndex={ref.qaIndex}
											active={isActiveRef(ref)}
											class="rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors {isActiveRef(ref)
												? 'bg-ra text-white'
												: isCurrentSession(ref)
													? 'bg-stone-100 text-ra hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra'
													: 'bg-stone-50 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:bg-stone-800/50 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-300'}"
										/>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
