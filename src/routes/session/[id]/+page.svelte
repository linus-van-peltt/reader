<script lang="ts">
	import { page } from '$app/state';
	import { getSession, getSessionCount } from '$lib/data/manifest';
	import QADisplay from '$lib/components/QADisplay.svelte';
	import { getSidebarState, toggleSidebar } from '$lib/stores/sidebar.svelte';
	import type { Session } from '$lib/types';

	const sidebar = getSidebarState();

	let session = $state<Session | undefined>();
	let totalSessions = $state(0);
	let loading = $state(true);

	let sessionNum = $derived(Number(page.params.id));

	$effect(() => {
		const num = sessionNum;
		loading = true;
		Promise.all([getSession(num), getSessionCount()]).then(([s, count]) => {
			session = s;
			totalSessions = count;
			loading = false;

			// Handle hash-based deep linking
			if (window.location.hash) {
				setTimeout(() => {
					const qaIdx = window.location.hash.slice(1);
					const el = document.getElementById(`qa-${qaIdx}`);
					el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
				}, 100);
			}
		});
	});
</script>

<svelte:head>
	<title>Session {sessionNum} — Ra Reader</title>
</svelte:head>

{#if loading}
	<div class="space-y-6">
		<div class="h-8 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-800"></div>
		{#each Array(5) as _}
			<div class="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if session}
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button
				onclick={toggleSidebar}
				class="hidden items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 md:flex dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
				aria-label="Toggle sidebar"
				title={sidebar.isOpen ? 'Hide sidebar' : 'Show sidebar'}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="18" x="3" y="3" rx="2" />
					<path d="M9 3v18" />
				</svg>
			</button>
			<div>
				<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
					Session {session.sessionNumber}
				</h1>
				<p class="text-sm text-stone-500 dark:text-stone-400">
					{session.sessionDate} &middot; {session.segments.length} passages
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if sessionNum > 1}
				<a
					href="/session/{sessionNum - 1}"
					class="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
				>
					&larr; Prev
				</a>
			{/if}
			{#if sessionNum < totalSessions}
				<a
					href="/session/{sessionNum + 1}"
					class="rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
				>
					Next &rarr;
				</a>
			{/if}
		</div>
	</div>

	<div class="divide-y divide-stone-100 dark:divide-stone-800/50">
		{#each session.segments as qa (qa.id)}
			<div class="py-8 first:pt-0 last:pb-0">
				<QADisplay {qa} />
			</div>
		{/each}
	</div>

	<div class="mt-8 flex items-center justify-between border-t border-stone-200 pt-6 dark:border-stone-800">
		{#if sessionNum > 1}
			<a
				href="/session/{sessionNum - 1}"
				class="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
			>
				&larr; Session {sessionNum - 1}
			</a>
		{:else}
			<div></div>
		{/if}
		{#if sessionNum < totalSessions}
			<a
				href="/session/{sessionNum + 1}"
				class="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
			>
				Session {sessionNum + 1} &rarr;
			</a>
		{/if}
	</div>
{:else}
	<div class="py-12 text-center">
		<p class="text-lg text-stone-500">Session not found</p>
		<a href="/" class="mt-2 inline-block text-sm text-ra hover:underline">Back to sessions</a>
	</div>
{/if}
