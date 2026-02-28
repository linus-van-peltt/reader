<script lang="ts">
	import { page } from '$app/state';
	import {
		getSidebarState,
		setActiveQa,
		setVisibleQaIndices,
		setScrollProgress,
		initSidebarFromStorage
	} from '$lib/stores/sidebar.svelte';
	import { getAudioState } from '$lib/stores/audio.svelte';
	import { getSession, getSessionCount } from '$lib/data/manifest';
	import SessionSidebar from '$lib/components/sidebar/SessionSidebar.svelte';
	import type { Session } from '$lib/types';

	let { children } = $props();

	const sidebar = getSidebarState();
	const audio = getAudioState();

	let mobileOpen = $state(false);
	let session = $state<Session | undefined>();
	let totalSessions = $state(0);
	let sessionNum = $derived(Number(page.params.id));

	initSidebarFromStorage();

	$effect(() => {
		const num = sessionNum;
		Promise.all([getSession(num), getSessionCount()]).then(([s, count]) => {
			session = s;
			totalSessions = count;
		});
	});

	function closeMobile() {
		mobileOpen = false;
	}

	// Scroll progress tracking
	$effect(() => {
		function onScroll() {
			const scrollY = window.scrollY;
			const scrollHeight = document.documentElement.scrollHeight;
			const innerHeight = window.innerHeight;
			const max = scrollHeight - innerHeight;
			if (max > 0) {
				setScrollProgress((scrollY / max) * 100);
			}
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// IntersectionObserver for active QA tracking
	$effect(() => {
		// Re-run when session changes
		const _sessionId = page.params.id;

		let intersectionObs: IntersectionObserver | null = null;
		const visibleIndices = new Set<number>();

		function setupIntersectionObserver() {
			const elements = document.querySelectorAll('[id^="qa-"]');
			if (elements.length === 0) return;

			intersectionObs = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						const id = entry.target.id;
						const index = Number(id.replace('qa-', ''));
						if (entry.isIntersecting) {
							visibleIndices.add(index);
						} else {
							visibleIndices.delete(index);
						}
					}
					if (visibleIndices.size > 0) {
						setActiveQa(Math.min(...visibleIndices));
						setVisibleQaIndices([...visibleIndices].sort((a, b) => a - b));
					} else {
						setVisibleQaIndices([]);
					}
				},
				{ rootMargin: '-60px 0px -50% 0px' }
			);

			for (const el of elements) {
				intersectionObs.observe(el);
			}
		}

		// QA elements load asynchronously in the child page, so use a
		// MutationObserver to detect when they appear in the DOM.
		setupIntersectionObserver();
		const mutationObs = new MutationObserver(() => {
			if (!intersectionObs) {
				setupIntersectionObserver();
				if (intersectionObs) mutationObs.disconnect();
			}
		});
		if (!intersectionObs) {
			mutationObs.observe(document.body, { childList: true, subtree: true });
		}

		return () => {
			intersectionObs?.disconnect();
			mutationObs.disconnect();
			visibleIndices.clear();
		};
	});
</script>

<!-- Progress bar -->
<div class="fixed left-0 right-0 z-[39] border-b border-stone-200/70 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95" style="top: 56px">
	<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1">
		{#if session}
			<span class="text-xs font-medium text-stone-600 dark:text-stone-300">Session {session.sessionNumber}</span>
			{#if sidebar.activeQaIndex !== null}
				<span class="text-[10px] text-stone-400 dark:text-stone-500">{sidebar.activeQaIndex} / {session.segments.length}</span>
			{/if}
		{/if}
		<div class="flex-1">
			<div class="h-1 rounded-full bg-stone-200 dark:bg-stone-800">
				<div class="h-1 rounded-full bg-ra transition-[width] duration-150" style="width: {sidebar.scrollProgress}%"></div>
			</div>
		</div>
		{#if session}
			<span class="text-[10px] tabular-nums text-stone-400 dark:text-stone-500">{Math.round(sidebar.scrollProgress)}%</span>
		{/if}
	</div>
</div>

<!-- Desktop layout — break out of parent max-w/px container -->
<div class="-mx-4 flex">
	{#if sidebar.isOpen}
		<SessionSidebar />
	{/if}
	<div class="min-w-0 flex-1 px-6 py-2 md:px-10">
		{@render children()}
	</div>
</div>

<!-- Mobile overlay sidebar -->
{#if mobileOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[41] bg-black/40 md:hidden"
		onclick={closeMobile}
		onkeydown={(e) => e.key === 'Escape' && closeMobile()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div
			class="fixed bottom-0 left-0 top-14 w-72 overflow-y-auto border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
			onclick={(e) => e.stopPropagation()}
		>
			<SessionSidebar mobile />
		</div>
	</div>
{/if}

<!-- Mobile floating toggle -->
<button
	onclick={() => (mobileOpen = !mobileOpen)}
	class="fixed z-[42] flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white shadow-lg md:hidden dark:border-stone-700 dark:bg-stone-800"
	style="left: 16px; bottom: {audio.currentSegment ? '80px' : '16px'}"
	aria-label="Toggle sidebar"
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
		class="text-stone-600 dark:text-stone-300"
	>
		<rect width="18" height="18" x="3" y="3" rx="2" />
		<path d="M9 3v18" />
	</svg>
</button>
