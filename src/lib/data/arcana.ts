import { base } from '$app/paths';
import type { ArcanaData, ArcanaCard } from '$lib/types';

let data: ArcanaData | null = null;

async function load(): Promise<ArcanaData> {
	if (data) return data;
	const resp = await fetch(`${base}/data/arcana.json`);
	data = (await resp.json()) as ArcanaData;
	return data;
}

export async function getArcanaData(): Promise<ArcanaData> {
	return load();
}

export async function getArcanaCards(): Promise<ArcanaCard[]> {
	const d = await load();
	return [...d.mind.arcana, ...d.body.arcana, ...d.spirit.arcana, d.thechoice];
}

const STAGES = ['matrix', 'potentiator', 'catalyst', 'experience', 'significator', 'transformation', 'great way'] as const;

export type Stage = (typeof STAGES)[number];

export { STAGES };

export async function getCardsByStage(): Promise<Map<Stage, { mind: ArcanaCard; body: ArcanaCard; spirit: ArcanaCard }>> {
	const d = await load();
	const map = new Map<Stage, { mind: ArcanaCard; body: ArcanaCard; spirit: ArcanaCard }>();

	for (const stage of STAGES) {
		const mind = d.mind.arcana.find((c) => c.stage === stage)!;
		const body = d.body.arcana.find((c) => c.stage === stage)!;
		const spirit = d.spirit.arcana.find((c) => c.stage === stage)!;
		map.set(stage, { mind, body, spirit });
	}

	return map;
}
