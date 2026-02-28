<script lang="ts">
	import './layout.css';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import { openSearch } from '$lib/stores/search.svelte';
	import { togglePlayback, getAudioState } from '$lib/stores/audio.svelte';
	import { loadNotebooks } from '$lib/stores/notebooks.svelte';

	let { children } = $props();
	const audio = getAudioState();

	$effect(() => {
		loadNotebooks();
	});

	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		// Don't handle shortcuts when typing in an input
		if (isInput) return;

		switch (e.key) {
			case ' ':
				e.preventDefault();
				togglePlayback();
				break;
			case '/':
				e.preventDefault();
				openSearch();
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Ra Reader</title>
</svelte:head>

<div class="flex min-h-full flex-col">
	<AppHeader />
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6" class:pb-20={audio.currentSegment}>
		{@render children()}
	</main>
</div>

<AudioPlayer />
<SearchModal />
