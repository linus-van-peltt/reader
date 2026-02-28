import { base } from '$app/paths';

const DIMS = 768;

let embeddings: Float32Array | null = null;
let embeddingIds: string[] | null = null;

export async function initEmbeddings(): Promise<void> {
	if (embeddings) return;
	const [binResp, idsResp] = await Promise.all([
		fetch(`${base}/data/embeddings.bin`),
		fetch(`${base}/data/embedding_ids.json`)
	]);
	embeddings = new Float32Array(await binResp.arrayBuffer());
	embeddingIds = await idsResp.json();
}

export function isEmbeddingsReady(): boolean {
	return embeddings !== null;
}

export function searchSemantic(
	queryEmbedding: Float32Array,
	topK = 20
): { id: string; score: number }[] {
	if (!embeddings || !embeddingIds) return [];

	const scores: { id: string; score: number }[] = [];
	const numVectors = embeddingIds.length;

	for (let i = 0; i < numVectors; i++) {
		let dot = 0;
		const offset = i * DIMS;
		for (let d = 0; d < DIMS; d++) {
			dot += queryEmbedding[d] * embeddings[offset + d];
		}
		scores.push({ id: embeddingIds[i], score: dot });
	}

	scores.sort((a, b) => b.score - a.score);
	return scores.slice(0, topK);
}
