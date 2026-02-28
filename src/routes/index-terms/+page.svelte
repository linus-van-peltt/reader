<script lang="ts">
	import { getIndexTerms, searchIndexTerms } from '$lib/data/index-terms';
	import QAPreviewLink from '$lib/components/sidebar/QAPreviewLink.svelte';
	import type { IndexTerm } from '$lib/types';

	let allTerms = $state<IndexTerm[]>([]);
	let terms = $state<IndexTerm[]>([]);
	let filter = $state('');
	let loading = $state(true);
	let expandedTerm = $state<string | null>(null);

	$effect(() => {
		getIndexTerms().then((t) => {
			allTerms = t;
			terms = t;
			loading = false;
		});
	});

	$effect(() => {
		if (filter) {
			searchIndexTerms(filter).then((t) => (terms = t));
		} else {
			terms = allTerms;
		}
	});

	function toggleTerm(term: string) {
		expandedTerm = expandedTerm === term ? null : term;
	}

	function formatRef(session: number, start: number, end: number): string {
		if (start === end) return `${session}.${start}`;
		return `${session}.${start}-${end}`;
	}
</script>

<svelte:head>
	<title>Index — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Index</h1>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		{allTerms.length} terms with {allTerms.reduce((s, t) => s + t.references.length, 0)} references
	</p>
</div>

<div class="mb-6">
	<input
		type="text"
		bind:value={filter}
		placeholder="Filter terms..."
		class="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm focus:border-ra focus:ring-1 focus:ring-ra sm:w-80 dark:border-stone-700 dark:bg-stone-900"
	/>
</div>

{#if loading}
	<div class="space-y-2">
		{#each Array(20) as _}
			<div class="h-10 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else}
	<div class="space-y-1">
		{#each terms as term}
			<div class="rounded-lg border border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900/50">
				<button
					onclick={() => toggleTerm(term.term)}
					class="flex w-full items-center justify-between px-4 py-2.5 text-left"
				>
					<span class="font-medium text-stone-900 dark:text-stone-100">{term.term}</span>
					<span class="flex items-center gap-2">
						<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
							{term.references.length}
						</span>
						<svg
							class="h-4 w-4 text-stone-400 transition-transform"
							class:rotate-180={expandedTerm === term.term}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</span>
				</button>

				{#if expandedTerm === term.term}
					<div class="flex flex-wrap gap-1.5 border-t border-stone-100 px-4 py-3 dark:border-stone-800">
						{#each term.references as ref}
							<QAPreviewLink
								session={ref.session}
								qaIndex={ref.start}
								label={formatRef(ref.session, ref.start, ref.end)}
								class="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-ra hover:bg-ra hover:text-white dark:bg-stone-800 dark:hover:bg-ra"
							/>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if terms.length === 0}
		<div class="py-12 text-center text-sm text-stone-400">
			No terms matching "{filter}"
		</div>
	{/if}
{/if}
