import { base } from '$app/paths';
import MiniSearch from 'minisearch';
import type { SearchResult } from '$lib/types';

let index: MiniSearch | null = null;

export async function initSearch(): Promise<void> {
	if (index) return;
	const resp = await fetch(`${base}/data/search-index.json`);
	const data = await resp.text();
	index = MiniSearch.loadJSON(data, {
		fields: ['question', 'answer'],
		storeFields: ['sessionNum', 'qaIndex', 'question', 'answer']
	});
}

export function isSearchReady(): boolean {
	return index !== null;
}

export function searchFullText(query: string, limit?: number): SearchResult[] {
	if (!index) return [];
	const raw = index.search(query, {
		boost: { answer: 2 },
		prefix: true
	});
	const sliced = limit ? raw.slice(0, limit) : raw;
	return sliced.map((r) => ({
		id: String(r.id),
		score: r.score,
		sessionNum: r.sessionNum as number,
		qaIndex: r.qaIndex as number,
		question: r.question as string,
		answer: r.answer as string
	}));
}
