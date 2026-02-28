import type { SearchResult } from '$lib/types';

export function hybridSearch(
	textResults: SearchResult[],
	vectorResults: { id: string; score: number }[],
	k = 60
): SearchResult[] {
	const scores = new Map<string, number>();
	const resultMap = new Map<string, SearchResult>();

	textResults.forEach((r, rank) => {
		scores.set(r.id, (scores.get(r.id) || 0) + 1 / (rank + 1 + k));
		resultMap.set(r.id, r);
	});

	vectorResults.forEach((r, rank) => {
		scores.set(r.id, (scores.get(r.id) || 0) + 1 / (rank + 1 + k));
		if (!resultMap.has(r.id)) {
			resultMap.set(r.id, { id: r.id, score: 0 });
		}
	});

	return [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([id, score]) => ({
			...resultMap.get(id)!,
			score
		}));
}
