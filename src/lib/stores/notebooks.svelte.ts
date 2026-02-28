import { get, set, del, keys } from 'idb-keyval';
import type { Notebook, NotebookEntry, TextHighlight } from '$lib/types';

const NOTEBOOKS_PREFIX = 'nb:';

function nbKey(id: string): string {
	return `${NOTEBOOKS_PREFIX}${id}`;
}

let notebooks = $state<Notebook[]>([]);

/** Set of qaPairIds that are saved in at least one notebook */
let savedQaIds = $derived(
	new Set(notebooks.flatMap((nb) => nb.entries.map((e) => e.qaPairId)))
);

export function getNotebooksState() {
	return {
		get notebooks() {
			return notebooks;
		},
		get savedQaIds() {
			return savedQaIds;
		}
	};
}

export async function loadNotebooks(): Promise<void> {
	const allKeys = await keys();
	const nbKeys = (allKeys as string[]).filter((k) => k.startsWith(NOTEBOOKS_PREFIX));
	const loaded: Notebook[] = [];
	for (const k of nbKeys) {
		const nb = await get<Notebook>(k);
		if (nb) loaded.push(nb);
	}
	loaded.sort((a, b) => b.updatedAt - a.updatedAt);
	notebooks = loaded;
}

export async function createNotebook(title: string): Promise<Notebook> {
	const nb: Notebook = {
		id: crypto.randomUUID(),
		title,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		entries: []
	};
	await set(nbKey(nb.id), nb);
	notebooks = [nb, ...notebooks];
	return nb;
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
	return get<Notebook>(nbKey(id));
}

export async function updateNotebook(nb: Notebook): Promise<void> {
	nb.updatedAt = Date.now();
	await set(nbKey(nb.id), nb);
	notebooks = notebooks.map((n) => (n.id === nb.id ? nb : n));
}

export async function deleteNotebook(id: string): Promise<void> {
	await del(nbKey(id));
	notebooks = notebooks.filter((n) => n.id !== id);
}

export async function addEntry(
	notebookId: string,
	qaPairId: string,
	note = ''
): Promise<NotebookEntry | undefined> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;

	const entry: NotebookEntry = {
		id: crypto.randomUUID(),
		qaPairId,
		note,
		addedAt: Date.now()
	};
	nb.entries.push(entry);
	await updateNotebook(nb);
	return entry;
}

export async function removeEntry(notebookId: string, entryId: string): Promise<void> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;
	nb.entries = nb.entries.filter((e) => e.id !== entryId);
	await updateNotebook(nb);
}

export async function reorderEntries(notebookId: string, entryIds: string[]): Promise<void> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;
	const entryMap = new Map(nb.entries.map((e) => [e.id, e]));
	nb.entries = entryIds.map((id) => entryMap.get(id)!).filter(Boolean);
	await updateNotebook(nb);
}

export async function updateEntryNote(
	notebookId: string,
	entryId: string,
	note: string
): Promise<void> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;
	const entry = nb.entries.find((e) => e.id === entryId);
	if (entry) {
		entry.note = note;
		await updateNotebook(nb);
	}
}

export async function addHighlight(
	notebookId: string,
	qaPairId: string,
	highlight: Omit<TextHighlight, 'id' | 'createdAt'>
): Promise<void> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;

	let entry = nb.entries.find((e) => e.qaPairId === qaPairId);
	if (!entry) {
		entry = {
			id: crypto.randomUUID(),
			qaPairId,
			note: '',
			addedAt: Date.now(),
			highlights: []
		};
		nb.entries.push(entry);
	}
	if (!entry.highlights) entry.highlights = [];
	entry.highlights.push({
		...highlight,
		id: crypto.randomUUID(),
		createdAt: Date.now()
	});
	await updateNotebook(nb);
}

export async function removeHighlight(
	notebookId: string,
	entryId: string,
	highlightId: string
): Promise<void> {
	const nb = await getNotebook(notebookId);
	if (!nb) return;
	const entry = nb.entries.find((e) => e.id === entryId);
	if (entry?.highlights) {
		entry.highlights = entry.highlights.filter((h) => h.id !== highlightId);
		await updateNotebook(nb);
	}
}

export async function exportAll(): Promise<string> {
	const allKeys = await keys();
	const nbKeys = (allKeys as string[]).filter((k) => k.startsWith(NOTEBOOKS_PREFIX));
	const data: Notebook[] = [];
	for (const k of nbKeys) {
		const nb = await get<Notebook>(k);
		if (nb) data.push(nb);
	}
	return JSON.stringify({ version: 1, notebooks: data }, null, 2);
}

export async function importAll(json: string): Promise<number> {
	const data = JSON.parse(json);
	const nbs: Notebook[] = data.notebooks || [];
	for (const nb of nbs) {
		await set(nbKey(nb.id), nb);
	}
	await loadNotebooks();
	return nbs.length;
}
