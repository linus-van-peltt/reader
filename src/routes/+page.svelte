<script lang="ts">
	import { base } from '$app/paths';
	import { getSessions, getRandomQAPair } from '$lib/data/manifest';
	import QADisplay from '$lib/components/QADisplay.svelte';
	import type { Session, QAPair } from '$lib/types';

	let sessions = $state<Session[]>([]);
	let loading = $state(true);
	let randomQA = $state<QAPair | null>(null);

	$effect(() => {
		getSessions().then((s) => {
			sessions = s;
			loading = false;
		});
		loadRandom();
	});

	async function loadRandom() {
		randomQA = await getRandomQAPair();
	}
</script>

<svelte:head>
	<title>Sessions — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">The Law of One</h1>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		{sessions.length} sessions &middot; {sessions.reduce((sum, s) => sum + s.segments.length, 0)} passages
	</p>
</div>

{#if randomQA}
	<div class="mb-8 rounded-2xl border border-ra/20 bg-ra-light/30 p-6 dark:bg-ra-dark/10 sm:p-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-medium uppercase tracking-wide text-ra">Random Passage</h2>
			<button
				onclick={loadRandom}
				class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
			>
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Another
			</button>
		</div>
		<QADisplay qa={randomQA} />
	</div>
{/if}

{#if loading}
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(12) as _}
			<div class="h-24 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each sessions as session}
			<a
				href="{base}/session/{session.sessionNumber}"
				class="group rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-ra/50 hover:bg-rose-50/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-ra/50 dark:hover:bg-stone-800/50"
			>
				<div class="flex items-baseline justify-between">
					<h2
						class="text-lg font-semibold text-stone-900 group-hover:text-ra dark:text-stone-100"
					>
						Session {session.sessionNumber}
					</h2>
					<span class="text-xs text-stone-400 dark:text-stone-500"
						>{session.segments.length} Q&A</span
					>
				</div>
				<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
					{session.sessionDate}
				</p>
			</a>
		{/each}
	</div>
{/if}
