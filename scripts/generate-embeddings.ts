#!/usr/bin/env bun
/**
 * Generate embeddings for all Q&A pairs using @huggingface/transformers.
 * Same model as the browser embed-worker: nomic-ai/nomic-embed-text-v1.5 (quantized).
 *
 * Outputs:
 *   static/data/embeddings.bin   (Float32Array, 768d per vector)
 *   static/data/embedding_ids.json (ordered segment IDs)
 *
 * Usage: bun scripts/generate-embeddings.ts
 */

import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MANIFEST_PATH = join(import.meta.dir, '..', 'static', 'data', 'manifest.json');
const OUTPUT_DIR = join(import.meta.dir, '..', 'static', 'data');
const DIMS = 768;
const BATCH_SIZE = 16;

interface Segment {
	id: string;
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

async function main() {
	console.log('Loading manifest...');
	const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

	const segments: { id: string; text: string }[] = [];
	for (const session of manifest.sessions) {
		for (const seg of session.segments) {
			const text = `${seg.question} ${seg.answer}`.trim();
			segments.push({ id: seg.id, text: `search_document: ${text}` });
		}
	}

	console.log(`Found ${segments.length} segments`);
	console.log('Loading model nomic-ai/nomic-embed-text-v1.5 (quantized)...');

	const extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
		quantized: true
	});

	console.log('Model loaded. Generating embeddings...');

	const allEmbeddings = new Float32Array(segments.length * DIMS);
	const ids: string[] = [];

	for (let i = 0; i < segments.length; i += BATCH_SIZE) {
		const batch = segments.slice(i, i + BATCH_SIZE);
		const texts = batch.map((s) => s.text);

		for (let j = 0; j < texts.length; j++) {
			const output = await extractor(texts[j], { pooling: 'mean', normalize: true });
			const embedding = new Float32Array(output.data as Float32Array);

			if (embedding.length !== DIMS) {
				throw new Error(`Expected ${DIMS} dims, got ${embedding.length}`);
			}

			allEmbeddings.set(embedding, (i + j) * DIMS);
			ids.push(batch[j].id);
		}

		const done = Math.min(i + BATCH_SIZE, segments.length);
		process.stdout.write(`\r  ${done}/${segments.length} (${((done / segments.length) * 100).toFixed(1)}%)`);
	}

	console.log('\nWriting output files...');

	const binPath = join(OUTPUT_DIR, 'embeddings.bin');
	writeFileSync(binPath, Buffer.from(allEmbeddings.buffer));
	const binSize = (allEmbeddings.byteLength / 1024 / 1024).toFixed(1);
	console.log(`  ${binPath} (${binSize} MB)`);

	const idsPath = join(OUTPUT_DIR, 'embedding_ids.json');
	writeFileSync(idsPath, JSON.stringify(ids));
	console.log(`  ${idsPath} (${ids.length} IDs)`);

	// Verify
	const loaded = new Float32Array(readFileSync(binPath).buffer);
	if (loaded.length !== allEmbeddings.length) {
		throw new Error('Verification failed: length mismatch');
	}
	console.log('Verification passed!');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
