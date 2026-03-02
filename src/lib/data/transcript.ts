import { base } from '$app/paths';
import type { TranscriptData, WordTimestamp } from '$lib/types';
import { getQAPair } from '$lib/data/manifest';

const cache = new Map<string, TranscriptData | null>();

export async function getTranscript(id: string): Promise<TranscriptData | null> {
	if (cache.has(id)) return cache.get(id)!;

	for (const dir of ['aligned', 'machine']) {
		try {
			const resp = await fetch(`${base}/data/${dir}/${id}.json`);
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
 * Get question and answer word timestamps.
 * New aligned transcripts have explicit question/answer arrays.
 * Legacy transcripts with a flat `word` array fall back to word-count splitting.
 */
export async function getFieldTimestamps(
	id: string
): Promise<{ question: WordTimestamp[]; answer: WordTimestamp[] } | null> {
	const transcript = await getTranscript(id);
	if (!transcript?.timestamps) return null;

	const ts = transcript.timestamps;

	// New format: explicit question/answer arrays
	if (ts.question || ts.answer) {
		return {
			question: ts.question ?? [],
			answer: ts.answer ?? []
		};
	}

	// Legacy format: flat word array, split by questionWordCount
	if (!ts.word?.length) return null;

	const qa = await getQAPair(id);
	if (!qa) return null;

	if (qa.questionWordCount === 0) {
		return { question: [], answer: ts.word };
	}

	const splitIdx = qa.questionWordCount;
	if (splitIdx >= ts.word.length) {
		return { question: ts.word, answer: [] };
	}

	return {
		question: ts.word.slice(0, splitIdx),
		answer: ts.word.slice(splitIdx)
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
