import { initSearch, searchFullText } from '$lib/search/fulltext';
import { initEmbeddings, searchSemantic } from '$lib/search/semantic';
import { hybridSearch } from '$lib/search/hybrid';
import { getQAPair } from '$lib/data/manifest';
import type { SearchResult } from '$lib/types';

export type SearchMode = 'fulltext' | 'semantic' | 'hybrid';

let isOpen = $state(false);
let query = $state('');
let results = $state<SearchResult[]>([]);
let isSearching = $state(false);
let selectedIndex = $state(0);
let searchMode = $state<SearchMode>('fulltext');
let fulltextReady = $state(false);
let semanticReady = $state(false);
let semanticLoading = $state(false);

let worker: Worker | null = null;
let pendingResolve: ((embedding: Float32Array) => void) | null = null;

export function getSearchState() {
	return {
		get isOpen() {
			return isOpen;
		},
		get query() {
			return query;
		},
		get results() {
			return results;
		},
		get isSearching() {
			return isSearching;
		},
		get selectedIndex() {
			return selectedIndex;
		},
		get searchMode() {
			return searchMode;
		},
		get fulltextReady() {
			return fulltextReady;
		},
		get semanticReady() {
			return semanticReady;
		},
		get semanticLoading() {
			return semanticLoading;
		}
	};
}

export async function openSearch(): Promise<void> {
	isOpen = true;
	if (!fulltextReady) {
		await initSearch();
		fulltextReady = true;
	}
}

export function closeSearch(): void {
	isOpen = false;
	query = '';
	results = [];
	selectedIndex = 0;
}

export function setQuery(q: string): void {
	query = q;
	selectedIndex = 0;
}

export function setSearchMode(mode: SearchMode): void {
	searchMode = mode;
}

export function setSelectedIndex(idx: number): void {
	selectedIndex = idx;
}

async function getQueryEmbedding(q: string): Promise<Float32Array> {
	if (!worker) {
		worker = new Worker(new URL('$lib/search/embed-worker.ts', import.meta.url), {
			type: 'module'
		});
		worker.onmessage = (e) => {
			if (e.data.type === 'result' && pendingResolve) {
				semanticLoading = false;
				pendingResolve(e.data.embedding);
				pendingResolve = null;
			} else if (e.data.type === 'status') {
				if (e.data.status === 'loading') {
					semanticLoading = true;
				} else if (e.data.status === 'embedding') {
					semanticLoading = false;
				}
			} else if (e.data.type === 'error') {
				console.error('Embed worker error:', e.data.error);
				pendingResolve = null;
			}
		};
	}

	return new Promise((resolve) => {
		pendingResolve = resolve;
		worker!.postMessage({ type: 'embed', query: q, id: Date.now() });
	});
}

export async function performSearch(q: string, limit?: number): Promise<void> {
	if (!q.trim()) {
		results = [];
		return;
	}

	isSearching = true;

	try {
		if (searchMode === 'fulltext') {
			results = searchFullText(q, limit);
		} else if (searchMode === 'semantic') {
			if (!semanticReady) {
				await initEmbeddings();
				semanticReady = true;
				semanticLoading = false;
			}
			const semanticLimit = limit ?? 100;
			const embedding = await getQueryEmbedding(q);
			const vectorResults = searchSemantic(embedding, semanticLimit);
			results = await enrichResults(vectorResults);
		} else {
			// hybrid
			const hybridLimit = limit ?? 100;
			const poolSize = Math.max(50, hybridLimit * 2);
			const textResults = searchFullText(q, poolSize);

			if (!semanticReady) {
				await initEmbeddings();
				semanticReady = true;
				semanticLoading = false;
			}
			const embedding = await getQueryEmbedding(q);
			const vectorResults = searchSemantic(embedding, poolSize);

			const hybrid = hybridSearch(textResults, vectorResults);
			results = await enrichResults(hybrid.slice(0, hybridLimit));
		}
	} finally {
		isSearching = false;
	}
}

export async function enrichResults(items: { id: string; score: number }[]): Promise<SearchResult[]> {
	const enriched: SearchResult[] = [];
	for (const item of items) {
		const qa = await getQAPair(item.id);
		if (qa) {
			enriched.push({
				id: item.id,
				score: item.score,
				sessionNum: qa.sessionNum,
				qaIndex: qa.qaIndex,
				question: qa.question,
				answer: qa.answer
			});
		}
	}
	return enriched;
}
