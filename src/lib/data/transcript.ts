import type { TranscriptData, WordTimestamp } from '$lib/types';
import { getQAPair } from '$lib/data/manifest';

const cache = new Map<string, TranscriptData | null>();

export async function getTranscript(id: string): Promise<TranscriptData | null> {
	if (cache.has(id)) return cache.get(id)!;

	for (const dir of ['aligned', 'machine']) {
		try {
			const resp = await fetch(`/data/${dir}/${id}.json`);
			if (resp.ok) {
				const data = (await resp.json()) as TranscriptData;
				cache.set(id, data);
				return data;
			}
		} catch {
			// try next
		}
	}

	cache.set(id, null);
	return null;
}

/**
 * Split word timestamps into question vs answer arrays.
 * Aligned transcripts contain the full combined text (question + answer),
 * so we split by the question's word count.
 * Machine transcripts contain only answer audio, so question timestamps are empty.
 */
export async function getFieldTimestamps(
	id: string
): Promise<{ question: WordTimestamp[]; answer: WordTimestamp[] } | null> {
	const transcript = await getTranscript(id);
	if (!transcript?.timestamps?.word?.length) return null;

	const qa = await getQAPair(id);
	if (!qa) return null;

	const words = transcript.timestamps.word;

	// Machine transcripts only cover Ra's answer — no question timestamps
	if (qa.questionWordCount === 0) {
		return { question: [], answer: words };
	}

	// Aligned transcripts contain question + answer text combined.
	// Split at the question word count boundary.
	const splitIdx = qa.questionWordCount;
	if (splitIdx >= words.length) {
		// All words are question (shouldn't normally happen)
		return { question: words, answer: [] };
	}

	return {
		question: words.slice(0, splitIdx),
		answer: words.slice(splitIdx)
	};
}

/** Binary search for the word active at `time`. Returns index or -1. */
export function findWordAtTime(words: WordTimestamp[], time: number): number {
	if (!words.length) return -1;

	let lo = 0;
	let hi = words.length - 1;

	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		const w = words[mid];
		if (time < w.start) {
			hi = mid - 1;
		} else if (time > w.end) {
			lo = mid + 1;
		} else {
			return mid;
		}
	}

	return -1;
}
