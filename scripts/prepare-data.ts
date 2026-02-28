#!/usr/bin/env bun
/**
 * Copy and transform static data files from sibling projects.
 * Run: bun scripts/prepare-data.ts
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const OUTPUT_DIR = join(ROOT, 'static', 'data');

// Source paths (sibling projects)
const GLOSSARY_SRC = join(import.meta.dirname, '..', '..', '..', 'source', 'ra-semantic', 'glossary', 'glossary.json');
const REFERENCES_SRC = join(import.meta.dirname, '..', '..', '..', 'source', 'ra-whisper', 'data', 'scrapedReferences.json');
const ARCANA_SRC = join(import.meta.dirname, '..', '..', '..', 'source', 'ra-whisper', 'data', 'arcana.json');

function copyGlossary() {
	if (!existsSync(GLOSSARY_SRC)) {
		console.warn(`Glossary not found at ${GLOSSARY_SRC}, skipping`);
		return;
	}
	const dest = join(OUTPUT_DIR, 'glossary.json');
	copyFileSync(GLOSSARY_SRC, dest);
	const data = JSON.parse(readFileSync(dest, 'utf-8'));
	const count = Object.keys(data).length;
	console.log(`Copied glossary.json (${count} terms)`);
}

function transformIndexTerms() {
	if (!existsSync(REFERENCES_SRC)) {
		console.warn(`ScrapedReferences not found at ${REFERENCES_SRC}, skipping`);
		return;
	}
	const raw = JSON.parse(readFileSync(REFERENCES_SRC, 'utf-8'));
	// Already in the right format: { "term": [{session, start, end}, ...] }
	const dest = join(OUTPUT_DIR, 'index-terms.json');
	writeFileSync(dest, JSON.stringify(raw, null, 2));
	const count = Object.keys(raw).length;
	const refCount = Object.values(raw).reduce((sum: number, refs: any) => sum + refs.length, 0);
	console.log(`Wrote index-terms.json (${count} terms, ${refCount} references)`);
}

function copyArcana() {
	if (!existsSync(ARCANA_SRC)) {
		console.warn(`Arcana not found at ${ARCANA_SRC}, skipping`);
		return;
	}
	const dest = join(OUTPUT_DIR, 'arcana.json');
	copyFileSync(ARCANA_SRC, dest);
	const data = JSON.parse(readFileSync(dest, 'utf-8'));
	const count = ['mind', 'body', 'spirit'].reduce(
		(sum, key) => sum + (data[key]?.arcana?.length ?? 0), 0
	);
	console.log(`Copied arcana.json (${count} cards)`);
}

console.log('Preparing static data files...\n');
copyGlossary();
transformIndexTerms();
copyArcana();
console.log('\nDone!');
