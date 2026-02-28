<script lang="ts">
	import type { WordTimestamp } from '$lib/types';
	import { getAudioState, playSegment, seek } from '$lib/stores/audio.svelte';
	import { findWordAtTime } from '$lib/data/transcript';

	interface Props {
		text: string;
		words: WordTimestamp[];
		qaId: string;
	}

	let { text, words, qaId }: Props = $props();
	const audio = getAudioState();

	type Token =
		| { type: 'word'; value: string; wordIndex: number }
		| { type: 'space'; value: string }
		| { type: 'bracket'; value: string };

	let tokens = $derived.by(() => {
		const result: Token[] = [];
		const regex = /(\[.*?\])|(\S+)|(\s+)/g;
		let match: RegExpExecArray | null;
		let wordIdx = 0;

		while ((match = regex.exec(text)) !== null) {
			if (match[1]) {
				result.push({ type: 'bracket', value: match[1] });
			} else if (match[2]) {
				result.push({ type: 'word', value: match[2], wordIndex: wordIdx });
				wordIdx++;
			} else if (match[3]) {
				result.push({ type: 'space', value: match[3] });
			}
		}

		return result;
	});

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
</script>

{#each tokens as token}{#if token.type === 'word' && token.wordIndex < words.length}<span
			class="cursor-pointer rounded-sm transition-colors duration-75 hover:bg-ra/10 {activeWordIndex === token.wordIndex ? 'bg-ra/20' : ''}"
			onclick={() => handleWordClick(token.wordIndex)}
			role="button"
			tabindex="-1"
		>{token.value}</span>{:else if token.type === 'space'}{#if token.value.includes('\n\n')}<br /><br />{:else}{token.value}{/if}{:else}{token.value}{/if}{/each}
