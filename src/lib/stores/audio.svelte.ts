import { base } from '$app/paths';
import { getQAPair } from '$lib/data/manifest';
import type { QAPair } from '$lib/types';

const AUDIO_BASE_URL = import.meta.env.PUBLIC_AUDIO_BASE_URL || `${base}/data/audio`;

let audioEl: HTMLAudioElement | null = null;
let rafId: number | null = null;

function startRAF() {
	if (rafId !== null) return;
	function tick() {
		if (audioEl) currentTime = audioEl.currentTime;
		rafId = requestAnimationFrame(tick);
	}
	rafId = requestAnimationFrame(tick);
}

function stopRAF() {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	// Sync one last time
	if (audioEl) currentTime = audioEl.currentTime;
}

function getAudio(): HTMLAudioElement {
	if (!audioEl) {
		audioEl = new Audio();
		audioEl.preload = 'metadata';
		audioEl.addEventListener('ended', () => {
			isPlaying = false;
			stopRAF();
			if (chainPlayEnabled) {
				nextSegment();
			}
		});
		audioEl.addEventListener('loadedmetadata', () => {
			duration = audioEl!.duration;
		});
		audioEl.addEventListener('play', () => {
			isPlaying = true;
			startRAF();
		});
		audioEl.addEventListener('pause', () => {
			isPlaying = false;
			stopRAF();
		});
	}
	return audioEl;
}

let currentSegmentId = $state<string | null>(null);
let currentSegment = $state<QAPair | null>(null);
let isPlaying = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let followAlongEnabled = $state(true);
let chainPlayEnabled = $state(false);

export function getAudioState() {
	return {
		get currentSegmentId() {
			return currentSegmentId;
		},
		get currentSegment() {
			return currentSegment;
		},
		get isPlaying() {
			return isPlaying;
		},
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		get followAlongEnabled() {
			return followAlongEnabled;
		},
		get chainPlayEnabled() {
			return chainPlayEnabled;
		}
	};
}

export async function playSegment(id: string): Promise<void> {
	const audio = getAudio();
	const qa = await getQAPair(id);
	if (!qa) return;

	currentSegment = qa;
	currentSegmentId = id;

	const parts = id.split('-');
	const filename = `${parts[0]}-${parts[1]}.mp3`;
	audio.src = `${AUDIO_BASE_URL}/${filename}`;
	audio.currentTime = 0;
	await audio.play();
}

export function pause(): void {
	getAudio().pause();
}

export function resume(): void {
	getAudio().play();
}

export function togglePlayback(): void {
	if (isPlaying) {
		pause();
	} else {
		resume();
	}
}

export function seek(time: number): void {
	const audio = getAudio();
	audio.currentTime = time;
	currentTime = time;
}

export async function nextSegment(): Promise<void> {
	if (!currentSegment) return;
	const { getQAPairs } = await import('$lib/data/manifest');
	const pairs = await getQAPairs(currentSegment.sessionNum);
	const idx = pairs.findIndex((p) => p.id === currentSegmentId);
	if (idx >= 0 && idx < pairs.length - 1) {
		await playSegment(pairs[idx + 1].id);
	}
}

export async function prevSegment(): Promise<void> {
	if (!currentSegment) return;
	const { getQAPairs } = await import('$lib/data/manifest');
	const pairs = await getQAPairs(currentSegment.sessionNum);
	const idx = pairs.findIndex((p) => p.id === currentSegmentId);
	if (idx > 0) {
		await playSegment(pairs[idx - 1].id);
	}
}

export function setVolume(vol: number): void {
	getAudio().volume = Math.max(0, Math.min(1, vol));
}

export function toggleFollowAlong(): void {
	followAlongEnabled = !followAlongEnabled;
}

export function setFollowAlong(enabled: boolean): void {
	followAlongEnabled = enabled;
}

export function toggleChainPlay(): void {
	chainPlayEnabled = !chainPlayEnabled;
}

export function setChainPlay(enabled: boolean): void {
	chainPlayEnabled = enabled;
}
