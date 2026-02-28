import { base } from '$app/paths';
import type { Manifest, Session, QAPair } from '$lib/types';

let manifest: Manifest | null = null;
let sessionMap: Map<number, Session> | null = null;
let qaMap: Map<string, QAPair> | null = null;

async function load(): Promise<Manifest> {
	if (manifest) return manifest;
	const resp = await fetch(`${base}/data/manifest.json`);
	manifest = (await resp.json()) as Manifest;

	sessionMap = new Map();
	qaMap = new Map();
	for (const session of manifest.sessions) {
		sessionMap.set(session.sessionNumber, session);
		for (const seg of session.segments) {
			qaMap.set(seg.id, seg);
		}
	}
	return manifest;
}

export async function getSessions(): Promise<Session[]> {
	const m = await load();
	return m.sessions;
}

export async function getSession(num: number): Promise<Session | undefined> {
	await load();
	return sessionMap!.get(num);
}

export async function getQAPairs(sessionNum: number): Promise<QAPair[]> {
	const session = await getSession(sessionNum);
	return session?.segments ?? [];
}

export async function getQAPair(id: string): Promise<QAPair | undefined> {
	await load();
	return qaMap!.get(id);
}

export async function getAllQAPairs(): Promise<QAPair[]> {
	const m = await load();
	return m.sessions.flatMap((s) => s.segments);
}

export async function getSessionCount(): Promise<number> {
	const m = await load();
	return m.sessions.length;
}

export async function getTotalSegments(): Promise<number> {
	const m = await load();
	return m.sessions.reduce((sum, s) => sum + s.segments.length, 0);
}

export async function getRandomQAPair(): Promise<QAPair> {
	const all = await getAllQAPairs();
	return all[Math.floor(Math.random() * all.length)];
}
