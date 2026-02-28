<script lang="ts">
	import { getGlossaryTerms, searchGlossary } from '$lib/data/glossary';
	import type { GlossaryTerm } from '$lib/types';

	let allTerms = $state<GlossaryTerm[]>([]);
	let terms = $state<GlossaryTerm[]>([]);
	let filter = $state('');
	let loading = $state(true);
	let activeLetter = $state('');

	$effect(() => {
		getGlossaryTerms().then((t) => {
			allTerms = t;
			terms = t;
			loading = false;
		});
	});

	$effect(() => {
		if (filter) {
			searchGlossary(filter).then((t) => (terms = t));
		} else {
			terms = allTerms;
		}
	});

	let letters = $derived(
		[...new Set(allTerms.map((t) => t.term[0].toUpperCase()))].sort()
	);

	let groupedTerms = $derived(() => {
		const groups = new Map<string, GlossaryTerm[]>();
		for (const term of terms) {
			const letter = term.term[0].toUpperCase();
			if (!groups.has(letter)) groups.set(letter, []);
			groups.get(letter)!.push(term);
		}
		return groups;
	});

	function scrollToLetter(letter: string) {
		activeLetter = letter;
		const el = document.getElementById(`letter-${letter}`);
		el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Glossary — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Glossary</h1>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		{allTerms.length} terms from the Ra Material
	</p>
</div>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<input
		type="text"
		bind:value={filter}
		placeholder="Filter terms..."
		class="w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm focus:border-ra focus:ring-1 focus:ring-ra sm:w-80 dark:border-stone-700 dark:bg-stone-900"
	/>

	<div class="flex flex-wrap gap-1">
		{#each letters as letter}
			<button
				onclick={() => scrollToLetter(letter)}
				class="h-7 w-7 rounded text-center text-xs font-medium text-stone-500 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
				class:bg-ra={activeLetter === letter}
				class:text-white={activeLetter === letter}
			>
				{letter}
			</button>
		{/each}
	</div>
</div>

{#if loading}
	<div class="space-y-4">
		{#each Array(10) as _}
			<div class="h-16 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else}
	{#each [...groupedTerms().entries()] as [letter, letterTerms]}
		<div id="letter-{letter}" class="mb-8 scroll-mt-20">
			<h2 class="mb-3 border-b border-stone-200 pb-1 text-lg font-semibold text-ra dark:border-stone-800">
				{letter}
			</h2>
			<dl class="space-y-3">
				{#each letterTerms as term}
					<div class="rounded-lg border border-stone-100 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/50">
						<dt class="font-medium text-stone-900 dark:text-stone-100">
							{term.term}
						</dt>
						<dd class="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
							{term.definition}
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	{/each}

	{#if terms.length === 0}
		<div class="py-12 text-center text-sm text-stone-400">
			No terms matching "{filter}"
		</div>
	{/if}
{/if}
