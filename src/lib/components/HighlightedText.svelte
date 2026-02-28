<script lang="ts">
	import GlossaryText from '$lib/components/GlossaryText.svelte';

	interface Props {
		text: string;
		highlights: { start: number; end: number }[];
	}

	let { text, highlights }: Props = $props();

	interface Segment {
		text: string;
		highlighted: boolean;
	}

	let segments = $derived.by(() => {
		if (!highlights.length) return [{ text, highlighted: false }];

		// Sort and merge overlapping ranges
		const sorted = [...highlights].sort((a, b) => a.start - b.start);
		const merged: { start: number; end: number }[] = [];
		for (const h of sorted) {
			const last = merged[merged.length - 1];
			if (last && h.start <= last.end) {
				last.end = Math.max(last.end, h.end);
			} else {
				merged.push({ start: h.start, end: h.end });
			}
		}

		// Split text into segments
		const result: Segment[] = [];
		let cursor = 0;
		for (const { start, end } of merged) {
			if (cursor < start) {
				result.push({ text: text.slice(cursor, start), highlighted: false });
			}
			result.push({ text: text.slice(start, end), highlighted: true });
			cursor = end;
		}
		if (cursor < text.length) {
			result.push({ text: text.slice(cursor), highlighted: false });
		}
		return result;
	});
</script>

{#each segments as seg}{#if seg.highlighted}<mark class="rounded-sm bg-fuchsia-200/60 px-0.5 dark:bg-fuchsia-500/20">{seg.text}</mark>{:else}<GlossaryText text={seg.text} />{/if}{/each}
