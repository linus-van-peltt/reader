<script lang="ts">
	import type { WordTimestamp } from '$lib/types';
	import { getAudioState, playSegment, seek } from '$lib/stores/audio.svelte';
	import { findWordAtTime } from '$lib/data/transcript';
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
		words?: WordTimestamp[];
		qaId?: string;
	}

	let { text, highlights, words = [], qaId = '' }: Props = $props();
	const audio = getAudioState();

	interface Segment {
		text: string;
		charStart: number;
		highlighted: boolean;
		noteIndices?: number[];
	}

	let segments = $derived.by(() => {
		if (!highlights.length) return [{ text, charStart: 0, highlighted: false }];

		const sorted = [...highlights].sort((a, b) => a.start - b.start);
		const merged: { start: number; end: number; noteIndices: number[] }[] = [];
		for (const h of sorted) {
			const last = merged[merged.length - 1];
			if (last && h.start <= last.end) {
				last.end = Math.max(last.end, h.end);
				if (h.noteIndex !== undefined && !last.noteIndices.includes(h.noteIndex)) {
					last.noteIndices.push(h.noteIndex);
				}
			} else {
				merged.push({
					start: h.start,
					end: h.end,
					noteIndices: h.noteIndex !== undefined ? [h.noteIndex] : []
				});
			}
		}

		const result: Segment[] = [];
		let cursor = 0;
		for (const { start, end, noteIndices } of merged) {
			if (cursor < start) {
				result.push({ text: text.slice(cursor, start), charStart: cursor, highlighted: false });
			}
			result.push({
				text: text.slice(start, end),
				charStart: start,
				highlighted: true,
				noteIndices: noteIndices.length > 0 ? noteIndices : undefined
			});
			cursor = end;
		}
		if (cursor < text.length) {
			result.push({ text: text.slice(cursor), charStart: cursor, highlighted: false });
		}
		return result;
	});

	// Build a map: character position in full text -> sequential word index
	// This matches how TimestampedText assigns indices (sequential regex match order)
	let wordAtCharPos = $derived.by(() => {
		if (!words.length) return null;
		const map = new Map<number, number>();
		const regex = /(\[.*?\])|(\S+)|(\s+)/g;
		let match: RegExpExecArray | null;
		let wordIdx = 0;
		while ((match = regex.exec(text)) !== null) {
			if (match[2]) {
				// Non-whitespace, non-bracket token = word
				if (wordIdx < words.length) {
					map.set(match.index, wordIdx);
				}
				wordIdx++;
			}
		}
		return map;
	});

	type Token =
		| { type: 'word'; value: string; wordIndex: number }
		| { type: 'space'; value: string }
		| { type: 'bracket'; value: string };

	function tokenize(segText: string, charStart: number): Token[] {
		if (!wordAtCharPos) return [];
		const result: Token[] = [];
		const regex = /(\[.*?\])|(\S+)|(\s+)/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(segText)) !== null) {
			if (match[1]) {
				result.push({ type: 'bracket', value: match[1] });
			} else if (match[2]) {
				const globalPos = charStart + match.index;
				const wi = wordAtCharPos.get(globalPos);
				if (wi !== undefined) {
					result.push({ type: 'word', value: match[2], wordIndex: wi });
				} else {
					result.push({ type: 'bracket', value: match[2] });
				}
			} else if (match[3]) {
				result.push({ type: 'space', value: match[3] });
			}
		}
		return result;
	}

	let isThisSegment = $derived(audio.currentSegmentId === qaId);

	let activeWordIndex = $derived.by(() => {
		if (!isThisSegment || !audio.isPlaying || !audio.followAlongEnabled) return -1;
		return findWordAtTime(words, audio.currentTime);
	});

	async function handleWordClick(wordIndex: number) {
		const w = words[wordIndex];
		if (!w) return;
		if (!isThisSegment) {
			await playSegment(qaId);
		}
		seek(w.start);
	}

	let hasWords = $derived(words.length > 0);
</script>

{#each segments as seg}{#if seg.highlighted}<mark
	class="rounded-sm bg-fuchsia-200/60 px-0.5 dark:bg-fuchsia-500/20"
>{#if hasWords}{#each tokenize(seg.text, seg.charStart) as token}{#if token.type === 'word'}<span
	class="cursor-pointer rounded-sm transition-colors duration-75 hover:bg-ra/10 {activeWordIndex === token.wordIndex ? 'bg-ra/20' : ''}"
	onclick={() => handleWordClick(token.wordIndex)}
	role="button"
	tabindex="-1"
>{token.value}</span>{:else if token.type === 'space'}{#if token.value.includes('\n\n')}<br /><br />{:else}{token.value}{/if}{:else}{token.value}{/if}{/each}{:else}{seg.text}{/if}{#if seg.noteIndices}{#each seg.noteIndices as ni}<sup
	class="ml-0.5 cursor-default text-[9px] font-semibold text-fuchsia-500 dark:text-fuchsia-400"
>{ni}</sup>{/each}{/if}</mark>{:else}{#if hasWords}{#each tokenize(seg.text, seg.charStart) as token}{#if token.type === 'word'}<span
	class="cursor-pointer rounded-sm transition-colors duration-75 hover:bg-ra/10 {activeWordIndex === token.wordIndex ? 'bg-ra/20' : ''}"
	onclick={() => handleWordClick(token.wordIndex)}
	role="button"
	tabindex="-1"
>{token.value}</span>{:else if token.type === 'space'}{#if token.value.includes('\n\n')}<br /><br />{:else}{token.value}{/if}{:else}{token.value}{/if}{/each}{:else}<GlossaryText text={seg.text} />{/if}{/if}{/each}
