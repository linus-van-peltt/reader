<script lang="ts">
	import { getGlossaryMatcher } from '$lib/data/glossary';

	interface Props {
		text: string;
	}

	type Segment =
		| { type: 'text'; value: string }
		| { type: 'term'; value: string; definition: string };

	let { text }: Props = $props();

	let segments = $state<Segment[]>([{ type: 'text', value: text }]);

	$effect(() => {
		const t = text;
		getGlossaryMatcher().then((m) => {
			m.regex.lastIndex = 0;
			const result: Segment[] = [];
			let last = 0;
			let match: RegExpExecArray | null;
			while ((match = m.regex.exec(t)) !== null) {
				if (match.index > last) {
					result.push({ type: 'text', value: t.slice(last, match.index) });
				}
				const key = match[1].toLowerCase();
				result.push({
					type: 'term',
					value: match[1],
					definition: m.definitions.get(key) ?? ''
				});
				last = match.index + match[1].length;
			}
			if (last < t.length) {
				result.push({ type: 'text', value: t.slice(last) });
			}
			if (result.length) segments = result;
		});
	});
</script>

{#each segments as seg}{#if seg.type === 'text'}{seg.value}{:else}<span
			class="glossary-term group/tip relative"
			><span
				class="cursor-help border-b border-dotted border-stone-400 dark:border-stone-500"
				>{seg.value}</span
			><span
				class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-xs leading-relaxed text-stone-700 opacity-0 shadow-lg transition-opacity group-hover/tip:pointer-events-auto group-hover/tip:opacity-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
				role="tooltip"
				><span class="whitespace-pre-line">{seg.definition}</span></span
			></span
		>{/if}{/each}
