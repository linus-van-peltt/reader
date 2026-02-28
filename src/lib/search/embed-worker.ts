/// <reference lib="webworker" />

let pipeline: any = null;
let extractor: any = null;

async function loadModel() {
	if (extractor) return;
	const { pipeline: pipelineFn } = await import('@huggingface/transformers');
	pipeline = pipelineFn;
	extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
		quantized: true
	});
}

self.onmessage = async (e: MessageEvent) => {
	const { type, query, id } = e.data;

	if (type === 'embed') {
		try {
			if (!extractor) {
				self.postMessage({ type: 'status', status: 'loading', id });
				await loadModel();
			}
			self.postMessage({ type: 'status', status: 'embedding', id });

			const output = await extractor(`search_query: ${query}`, {
				pooling: 'mean',
				normalize: true
			});
			const embedding = new Float32Array(output.data);
			self.postMessage({ type: 'result', embedding, id }, [embedding.buffer]);
		} catch (err) {
			self.postMessage({ type: 'error', error: String(err), id });
		}
	}
};
