<script lang="ts">
	import GlossaryText from '$lib/components/GlossaryText.svelte';

	interface HighlightInput {
		start: number;
		end: number;
		note?: string;
		noteIndex?: number;
	}

	interface Props {
		text: string;
		highlights: HighlightInput[];
	}

	let { text, highlights }: Props = $props();

	interface Segment {
		text: string;
		highlighted: boolean;
		noteIndex?: number;
	}

	let segments = $derived.by(() => {
		if (!highlights.length) return [{ text, highlighted: false }];

		// Sort highlights; preserve noteIndex through merge
		const sorted = [...highlights].sort((a, b) => a.start - b.start);
		const merged: { start: number; end: number; noteIndex?: number }[] = [];
		for (const h of sorted) {
			const last = merged[merged.length - 1];
			if (last && h.start <= last.end) {
				// Don't merge if both carry annotation markers
				if (last.noteIndex !== undefined && h.noteIndex !== undefined) {
					merged.push({ start: h.start, end: h.end, noteIndex: h.noteIndex });
					continue;
				}
				last.end = Math.max(last.end, h.end);
				if (last.noteIndex === undefined && h.noteIndex !== undefined) {
					last.noteIndex = h.noteIndex;
				}
			} else {
				merged.push({ start: h.start, end: h.end, noteIndex: h.noteIndex });
			}
		}

		const result: Segment[] = [];
		let cursor = 0;
		for (const { start, end, noteIndex } of merged) {
			if (cursor < start) {
				result.push({ text: text.slice(cursor, start), highlighted: false });
			}
			result.push({ text: text.slice(start, end), highlighted: true, noteIndex });
			cursor = end;
		}
		if (cursor < text.length) {
			result.push({ text: text.slice(cursor), highlighted: false });
		}
		return result;
	});
</script>

{#each segments as seg}{#if seg.highlighted}<mark class="rounded-sm bg-fuchsia-200/60 px-0.5 dark:bg-fuchsia-500/20">{seg.text}{#if seg.noteIndex !== undefined}<sup class="ml-0.5 cursor-default text-[9px] font-semibold text-fuchsia-500 dark:text-fuchsia-400">{seg.noteIndex}</sup>{/if}</mark>{:else}<GlossaryText text={seg.text} />{/if}{/each}
