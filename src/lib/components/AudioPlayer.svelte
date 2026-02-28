<script lang="ts">
	import {
		getAudioState,
		togglePlayback,
		toggleFollowAlong,
		toggleChainPlay,
		seek,
		nextSegment,
		prevSegment
	} from '$lib/stores/audio.svelte';

	const audio = getAudioState();

	let expanded = $state(false);

	function formatTime(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function handleSeek(e: Event) {
		const input = e.target as HTMLInputElement;
		seek(Number(input.value));
	}

	let progress = $derived(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0);
	let ref = $derived(
		audio.currentSegment
			? `${audio.currentSegment.sessionNum}.${audio.currentSegment.qaIndex}`
			: ''
	);
</script>

{#if audio.currentSegment}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-lg dark:border-stone-800 dark:bg-stone-950/95"
	>
		<!-- Expanded passage panel -->
		{#if expanded}
			<div class="border-b border-stone-100 dark:border-stone-800/50">
				<div class="mx-auto max-w-6xl px-4 py-4">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<div class="mb-3 flex items-center gap-2.5">
								<span class="font-mono text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">
									{ref}
								</span>
								<span class="text-xs text-stone-400 dark:text-stone-500">Now Playing</span>
								<a
									href="/session/{audio.currentSegment.sessionNum}#{audio.currentSegment.qaIndex}"
									onclick={() => (expanded = false)}
									class="rounded px-2 py-0.5 text-xs font-medium text-ra hover:bg-ra/10"
								>
									Go to passage
								</a>
							</div>
							<div class="max-h-48 space-y-2.5 overflow-y-auto pr-4">
								{#if audio.currentSegment.question}
									<div class="border-l-[3px] border-questioner/40 pl-3 dark:border-questioner/30">
										<div class="mb-0.5 text-[10px] font-medium tracking-wider text-questioner/70 uppercase dark:text-questioner/60">
											Questioner
										</div>
										<p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
											{audio.currentSegment.question}
										</p>
									</div>
								{/if}
								<div class="border-l-[3px] border-ra/40 pl-3 dark:border-ra/30">
									<div class="mb-0.5 text-[10px] font-medium tracking-wider text-ra/70 uppercase dark:text-ra/60">
										Ra
									</div>
									<p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
										{audio.currentSegment.answer}
									</p>
								</div>
							</div>
						</div>
						<button
							onclick={() => (expanded = false)}
							class="shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
							aria-label="Collapse"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Progress bar -->
		<div class="relative h-1 bg-stone-200 dark:bg-stone-800">
			<div
				class="h-1 bg-ra transition-[width] duration-150"
				style="width: {progress}%"
			></div>
			<input
				type="range"
				min="0"
				max={audio.duration || 0}
				value={audio.currentTime}
				oninput={handleSeek}
				class="absolute inset-0 h-1 w-full cursor-pointer opacity-0"
			/>
		</div>

		<!-- Controls bar -->
		<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
			<!-- Prev -->
			<button
				onclick={() => prevSegment()}
				class="hidden rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:block dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
				aria-label="Previous"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
				</svg>
			</button>

			<!-- Play/Pause -->
			<button
				onclick={() => togglePlayback()}
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ra text-white hover:bg-ra/90"
				aria-label={audio.isPlaying ? 'Pause' : 'Play'}
			>
				{#if audio.isPlaying}
					<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
						<rect x="6" y="4" width="4" height="16" />
						<rect x="14" y="4" width="4" height="16" />
					</svg>
				{:else}
					<svg class="ml-0.5 h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>

			<!-- Next -->
			<button
				onclick={() => nextSegment()}
				class="hidden rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:block dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
				aria-label="Next"
			>
				<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
				</svg>
			</button>

			<!-- Now playing info — click to expand -->
			<button
				onclick={() => (expanded = !expanded)}
				class="flex min-w-0 flex-1 items-center gap-2.5 text-left"
			>
				<span class="shrink-0 font-mono text-sm font-semibold tabular-nums text-stone-900 dark:text-stone-100">
					{ref}
				</span>
				<span class="truncate text-xs text-stone-500 dark:text-stone-400">
					{#if audio.currentSegment.question}
						{audio.currentSegment.question.length > 80
							? audio.currentSegment.question.slice(0, 80).trimEnd() + '…'
							: audio.currentSegment.question}
					{:else}
						{audio.currentSegment.answer.length > 80
							? audio.currentSegment.answer.slice(0, 80).trimEnd() + '…'
							: audio.currentSegment.answer}
					{/if}
				</span>
				<svg
					class="h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-200 dark:text-stone-500 {expanded ? 'rotate-180' : ''}"
					fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
				</svg>
			</button>

			<!-- Follow-along toggle -->
			<button
				onclick={() => toggleFollowAlong()}
				class="hidden rounded p-1.5 transition-colors sm:block {audio.followAlongEnabled
					? 'text-ra hover:bg-ra/10'
					: 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300'}"
				aria-label={audio.followAlongEnabled ? 'Disable follow-along' : 'Enable follow-along'}
				title={audio.followAlongEnabled ? 'Follow-along on' : 'Follow-along off'}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
				</svg>
			</button>

			<!-- Chain play toggle -->
			<button
				onclick={() => toggleChainPlay()}
				class="hidden rounded p-1.5 transition-colors sm:block {audio.chainPlayEnabled
					? 'text-ra hover:bg-ra/10'
					: 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300'}"
				aria-label={audio.chainPlayEnabled ? 'Disable chain play' : 'Enable chain play'}
				title={audio.chainPlayEnabled ? 'Chain play on' : 'Chain play off'}
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
				</svg>
			</button>

			<!-- Time -->
			<span class="hidden shrink-0 text-xs tabular-nums text-stone-400 sm:block dark:text-stone-500">
				{formatTime(audio.currentTime)} / {formatTime(audio.duration)}
			</span>

			<!-- Mobile prev/next -->
			<div class="flex shrink-0 items-center gap-0.5 sm:hidden">
				<button
					onclick={() => prevSegment()}
					class="rounded p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-800"
					aria-label="Previous"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
					</svg>
				</button>
				<button
					onclick={() => nextSegment()}
					class="rounded p-1.5 text-stone-400 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-stone-800"
					aria-label="Next"
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}
