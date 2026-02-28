<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { getSessions } from '$lib/data/manifest';
	import type { Session } from '$lib/types';

	let sessions = $state<Session[]>([]);
	let currentNum = $derived(Number(page.params.id));

	$effect(() => {
		getSessions().then((s) => {
			sessions = s;
		});
	});

	$effect(() => {
		const el = document.querySelector(`[data-session-nav="${currentNum}"]`);
		el?.scrollIntoView({ block: 'nearest' });
	});
</script>

<nav class="flex flex-col gap-0.5 p-2">
	{#each sessions as s (s.sessionNumber)}
		<a
			data-session-nav={s.sessionNumber}
			href="{base}/session/{s.sessionNumber}"
			class="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors {currentNum ===
			s.sessionNumber
				? 'bg-ra/10 font-medium text-ra'
				: 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'}"
		>
			<span>Session {s.sessionNumber}</span>
			<span class="text-[10px] opacity-50">{s.segments.length}</span>
		</a>
	{/each}
</nav>
