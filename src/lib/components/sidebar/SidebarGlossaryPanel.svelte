<script lang="ts">
	import { getGlossaryTerms, searchGlossary } from '$lib/data/glossary';
	import type { GlossaryTerm } from '$lib/types';

	let filter = $state('');
	let terms = $state<GlossaryTerm[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout>;

	$effect(() => {
		getGlossaryTerms().then((t) => {
			terms = t;
		});
	});

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		filter = value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (value.trim()) {
				searchGlossary(value.trim()).then((t) => {
					terms = t;
				});
			} else {
				getGlossaryTerms().then((t) => {
					terms = t;
				});
			}
		}, 150);
	}
</script>

<div class="flex flex-col">
	<div class="sticky top-0 z-10 bg-white p-2 dark:bg-stone-900">
		<input
			type="text"
			placeholder="Search glossary…"
			value={filter}
			oninput={handleInput}
			class="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-ra focus:outline-none focus:ring-1 focus:ring-ra dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
		/>
	</div>

	<dl class="space-y-3 p-2">
		{#each terms as term (term.term)}
			<div>
				<dt class="text-xs font-semibold text-stone-900 dark:text-stone-100">{term.term}</dt>
				<dd class="mt-0.5 line-clamp-3 text-xs text-stone-500 dark:text-stone-400">
					{term.definition}
				</dd>
			</div>
		{/each}
		{#if terms.length === 0}
			<p class="py-4 text-center text-xs text-stone-400">No terms found</p>
		{/if}
	</dl>
</div>
