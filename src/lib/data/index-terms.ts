import type { IndexTerm, IndexReference } from '$lib/types';

let terms: IndexTerm[] | null = null;

async function load(): Promise<IndexTerm[]> {
	if (terms) return terms;
	const resp = await fetch('/data/index-terms.json');
	const data: Record<string, IndexReference[]> = await resp.json();
	terms = Object.entries(data)
		.map(([term, references]) => ({ term, references }))
		.sort((a, b) => a.term.localeCompare(b.term));
	return terms;
}

export async function getIndexTerms(): Promise<IndexTerm[]> {
	return load();
}

export async function searchIndexTerms(query: string): Promise<IndexTerm[]> {
	const all = await load();
	const q = query.toLowerCase();
	return all.filter((t) => t.term.toLowerCase().includes(q));
}

/** Get index terms that have references overlapping a given session, optionally filtered to specific QA indices. */
export async function getIndexTermsForSession(
	sessionNum: number,
	qaIndices?: number[]
): Promise<IndexTerm[]> {
	const all = await load();
	const indexSet = qaIndices ? new Set(qaIndices) : null;

	return all.filter((t) =>
		t.references.some((r) => {
			if (r.session !== sessionNum) return false;
			if (!indexSet) return true;
			// Check if the reference range overlaps any visible QA index
			for (const idx of indexSet) {
				if (idx >= r.start && idx <= r.end) return true;
			}
			return false;
		})
	);
}
