<script lang="ts">
	import { page } from '$app/state';
	import { getSession } from '$lib/data/manifest';

	interface Props {
		session: number;
		qaIndex: number;
		label?: string;
		active?: boolean;
		class?: string;
	}

	let { session, qaIndex, label, active = false, class: className = '' }: Props = $props();

	let isCurrentSession = $derived(session === Number(page.params.id));

	function onclick(e: MouseEvent) {
		if (!isCurrentSession) return;
		const target = document.getElementById(`qa-${qaIndex}`);
		if (target) {
			e.preventDefault();
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	let preview = $state<{ question: string; answer: string } | null>(null);
	let showTooltip = $state(false);
	let hoverTimer: ReturnType<typeof setTimeout> | null = null;
	let el = $state<HTMLElement | null>(null);

	function truncate(text: string, max: number): string {
		if (text.length <= max) return text;
		return text.slice(0, max).trimEnd() + '…';
	}

	async function loadPreview() {
		if (preview) return;
		const s = await getSession(session);
		if (!s) return;
		const qa = s.segments.find((seg) => seg.qaIndex === qaIndex);
		if (qa) {
			preview = { question: qa.question, answer: qa.answer };
		}
	}

	function onMouseEnter() {
		loadPreview();
		hoverTimer = setTimeout(() => {
			showTooltip = true;
		}, 300);
	}

	function onMouseLeave() {
		if (hoverTimer) clearTimeout(hoverTimer);
		hoverTimer = null;
		showTooltip = false;
	}
</script>

<a
	bind:this={el}
	href="/session/{session}#{qaIndex}"
	class={className}
	{onclick}
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
>
	{label ?? `${session}.${qaIndex}`}
</a>

{#if showTooltip && preview}
	<div
		class="pointer-events-none fixed z-[60] w-72 rounded-lg border border-stone-200/80 bg-white p-3 shadow-xl dark:border-stone-700/80 dark:bg-stone-900"
		style="left: {el ? el.getBoundingClientRect().right + 8 : 0}px; top: {el ? Math.min(el.getBoundingClientRect().top, window.innerHeight - 200) : 0}px;"
	>
		{#if preview.question}
			<div class="mb-2">
				<span class="text-[10px] font-medium tracking-wider text-questioner/70 uppercase">Questioner</span>
				<p class="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
					{truncate(preview.question, 160)}
				</p>
			</div>
		{/if}
		<div>
			<span class="text-[10px] font-medium tracking-wider text-ra/70 uppercase">Ra</span>
			<p class="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
				{truncate(preview.answer, 200)}
			</p>
		</div>
	</div>
{/if}
