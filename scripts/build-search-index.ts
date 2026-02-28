#!/usr/bin/env bun
/**
 * Build MiniSearch index from manifest.json.
 * Run: bun scripts/build-search-index.ts
 * Output: static/data/search-index.json
 */

import MiniSearch from 'minisearch';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const MANIFEST_PATH = join(ROOT, 'static', 'data', 'manifest.json');
const OUTPUT_PATH = join(ROOT, 'static', 'data', 'search-index.json');

interface Segment {
	id: string;
	sessionNum: number;
	qaIndex: number;
	question: string;
	answer: string;
}

interface Session {
	sessionNumber: number;
	segments: Segment[];
}

interface Manifest {
	sessions: Session[];
}

const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

const documents: Segment[] = [];
for (const session of manifest.sessions) {
	for (const seg of session.segments) {
		documents.push({
			id: seg.id,
			sessionNum: seg.sessionNum,
			qaIndex: seg.qaIndex,
			question: seg.question,
			answer: seg.answer
		});
	}
}

console.log(`Indexing ${documents.length} segments...`);

const miniSearch = new MiniSearch({
	fields: ['question', 'answer'],
	storeFields: ['sessionNum', 'qaIndex', 'question', 'answer'],
	searchOptions: {
		boost: { answer: 2 },
		fuzzy: 0.2,
		prefix: true
	}
});

miniSearch.addAll(documents);

const json = JSON.stringify(miniSearch);
writeFileSync(OUTPUT_PATH, json);

const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
console.log(`Wrote ${OUTPUT_PATH} (${sizeMB} MB, ${documents.length} documents)`);

// Verify: load and test a query
const loaded = MiniSearch.loadJSON(json, {
	fields: ['question', 'answer'],
	storeFields: ['sessionNum', 'qaIndex', 'question', 'answer']
});

const results = loaded.search('Law of One');
console.log(`Verification: "Law of One" returned ${results.length} results`);
if (results.length > 0) {
	console.log(`  Top result: ${results[0].id} (score: ${results[0].score.toFixed(2)})`);
}
