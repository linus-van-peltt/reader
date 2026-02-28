import { base } from '$app/paths';
import type { GlossaryTerm } from '$lib/types';

let terms: GlossaryTerm[] | null = null;

async function load(): Promise<GlossaryTerm[]> {
	if (terms) return terms;
	const resp = await fetch(`${base}/data/glossary.json`);
	const data: Record<string, string> = await resp.json();
	terms = Object.entries(data).map(([term, definition]) => ({ term, definition }));
	return terms;
}

export async function getGlossaryTerms(): Promise<GlossaryTerm[]> {
	return load();
}

export async function searchGlossary(query: string): Promise<GlossaryTerm[]> {
	const all = await load();
	const q = query.toLowerCase();
	return all.filter(
		(t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
	);
}

export interface GlossaryMatcher {
	regex: RegExp;
	definitions: Map<string, string>;
}

let matcher: GlossaryMatcher | null = null;

export async function getGlossaryMatcher(): Promise<GlossaryMatcher> {
	if (matcher) return matcher;
	const all = await load();
	const sorted = [...all].sort((a, b) => b.term.length - a.term.length);
	const defs = new Map<string, string>();
	const patterns: string[] = [];
	for (const { term, definition } of sorted) {
		defs.set(term.toLowerCase(), definition);
		patterns.push(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	}
	const regex = new RegExp(
		`(?<![a-zA-Z\\u00C0-\\u024F])(${patterns.join('|')})(?![a-zA-Z\\u00C0-\\u024F])`,
		'gi'
	);
	matcher = { regex, definitions: defs };
	return matcher;
}
