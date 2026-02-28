<script lang="ts">
	import { getCategories } from '$lib/data/categories';
	import QAPreviewLink from '$lib/components/sidebar/QAPreviewLink.svelte';
	import type { Category } from '$lib/types';

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let error = $state('');
	let expandedCategory = $state<string | null>(null);
	let expandedSub = $state<string | null>(null);

	$effect(() => {
		getCategories()
			.then((c) => {
				categories = c;
				loading = false;
			})
			.catch((e) => {
				error = 'Categories data not yet available. Run: bun scripts/scrape-categories.ts';
				loading = false;
			});
	});

	function toggleCategory(id: string) {
		expandedCategory = expandedCategory === id ? null : id;
		expandedSub = null;
	}

	function toggleSub(id: string) {
		expandedSub = expandedSub === id ? null : id;
	}

	/** A category has real subcategories if it has more than one, or if the single sub has a different name */
	function hasSubcategories(cat: Category): boolean {
		return cat.subcategories.length > 1;
	}

	function totalRefs(cat: Category): number {
		return cat.subcategories.reduce((sum, s) => sum + s.references.length, 0);
	}
</script>

<svelte:head>
	<title>Categories — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Categories</h1>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		Browse the Law of One material by topic
	</p>
</div>

{#if loading}
	<div class="space-y-3">
		{#each Array(10) as _}
			<div class="h-12 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if error}
	<div class="rounded-lg border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/50">
		<p class="text-sm text-rose-800 dark:text-rose-200">{error}</p>
	</div>
{:else}
	<div class="space-y-2">
		{#each categories as category}
			<div class="rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900/50">
				<button
					onclick={() => toggleCategory(category.id)}
					class="flex w-full items-center justify-between px-4 py-3 text-left"
				>
					<span class="font-medium text-stone-900 dark:text-stone-100">{category.name}</span>
					<span class="flex items-center gap-2">
						{#if hasSubcategories(category)}
							<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
								{category.subcategories.length}
							</span>
						{/if}
						<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums text-stone-400 dark:bg-stone-800 dark:text-stone-500">
							{totalRefs(category)}
						</span>
						<svg
							class="h-4 w-4 text-stone-400 transition-transform duration-200"
							class:rotate-180={expandedCategory === category.id}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</span>
				</button>

				{#if expandedCategory === category.id}
					<div class="border-t border-stone-100 px-4 py-3 dark:border-stone-800">
						{#if hasSubcategories(category)}
							<!-- Category with subcategories -->
							<div class="space-y-1">
								{#each category.subcategories as sub}
									<div>
										<button
											onclick={() => toggleSub(sub.id)}
											class="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-200 hover:bg-stone-50 dark:hover:bg-stone-800/50"
										>
											<span class="text-stone-700 dark:text-stone-300">{sub.name}</span>
											<span class="flex items-center gap-1.5">
												<span class="text-xs tabular-nums text-stone-400 dark:text-stone-500">
													{sub.references.length}
												</span>
												<svg
													class="h-3 w-3 text-stone-300 transition-transform duration-200 dark:text-stone-600"
													class:rotate-90={expandedSub === sub.id}
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
													stroke-width="2.5"
												>
													<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
												</svg>
											</span>
										</button>

										{#if expandedSub === sub.id}
											<div class="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
												{#each sub.references as ref}
													<QAPreviewLink
														session={ref.session}
														qaIndex={ref.qaIndex}
														class="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium tabular-nums text-ra transition-colors hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra"
													/>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<!-- Category without subcategories — show refs directly -->
							<div class="flex flex-wrap gap-1.5">
								{#each category.subcategories[0]?.references ?? [] as ref}
									<QAPreviewLink
										session={ref.session}
										qaIndex={ref.qaIndex}
										class="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium tabular-nums text-ra transition-colors hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra"
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
