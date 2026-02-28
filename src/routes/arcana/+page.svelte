<script lang="ts">
	import { getCardsByStage, STAGES, type Stage } from '$lib/data/arcana';
	import { getArcanaData } from '$lib/data/arcana';
	import { getSession } from '$lib/data/manifest';
	import type { ArcanaCard, QAPair } from '$lib/types';

	let grid = $state<Map<Stage, { mind: ArcanaCard; body: ArcanaCard; spirit: ArcanaCard }> | null>(null);
	let choiceCard = $state<ArcanaCard | null>(null);
	let loading = $state(true);
	let error = $state('');
	let modalCard = $state<ArcanaCard | null>(null);
	let modalRefs = $state<{ session: number; question: string; qa: QAPair | null }[]>([]);
	let loadingRefs = $state(false);

	$effect(() => {
		Promise.all([getCardsByStage(), getArcanaData()])
			.then(([g, data]) => {
				grid = g;
				choiceCard = data.thechoice;
				loading = false;
			})
			.catch(() => {
				error = 'Failed to load arcana data.';
				loading = false;
			});
	});

	async function openModal(card: ArcanaCard) {
		modalCard = card;
		modalRefs = card.references.map((r) => ({ ...r, qa: null }));
		loadingRefs = true;

		const loaded = await Promise.all(
			card.references.map(async (ref) => {
				const session = await getSession(ref.session);
				const qa = session?.segments.find((s) => s.qaIndex === Number(ref.question)) ?? null;
				return { session: ref.session, question: ref.question, qa };
			})
		);
		modalRefs = loaded;
		loadingRefs = false;
	}

	function closeModal() {
		modalCard = null;
		modalRefs = [];
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeModal();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	function capitalize(s: string): string {
		return s.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function stageLabel(stage: Stage): string {
		return capitalize(stage);
	}

	function tarotName(card: ArcanaCard): string {
		const alias = card.aliases.find((a) => a !== card.name);
		return alias ? capitalize(alias) : '';
	}

	const complexes = ['mind', 'body', 'spirit'] as const;
</script>

<svelte:window {onKeydown} />

<svelte:head>
	<title>Arcana — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<div class="flex items-baseline gap-3">
		<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Arcana</h1>
		<a href="/arcana/study" class="text-sm text-ra hover:underline">Study Guide</a>
	</div>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		The 22 archetypes of the tarot as studied in the Law of One material
	</p>
</div>

{#if loading}
	<div class="space-y-3">
		{#each Array(7) as _}
			<div class="h-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if error}
	<div class="rounded-lg border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/50">
		<p class="text-sm text-rose-800 dark:text-rose-200">{error}</p>
	</div>
{:else if grid}
	<!-- Column headers (desktop) -->
	<div class="mb-3 hidden grid-cols-[7rem_1fr_1fr_1fr] gap-3 px-1 md:grid">
		<div></div>
		{#each complexes as complex}
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
				{complex}
			</div>
		{/each}
	</div>

	<!-- Grid rows -->
	<div class="space-y-3">
		{#each STAGES as stage}
			{@const row = grid.get(stage)!}

			<!-- Mobile stage label -->
			<div class="mt-4 mb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase md:mt-0 md:hidden dark:text-stone-500">
				{stageLabel(stage)}
			</div>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr_1fr_1fr]">
				<!-- Stage label (desktop) -->
				<div class="hidden items-start pt-2 md:flex">
					<span class="text-sm font-medium text-stone-500 dark:text-stone-400">{stageLabel(stage)}</span>
				</div>

				<!-- Card cells -->
				{#each complexes as complex}
					{@const card = row[complex]}

					<!-- Mobile complex label -->
					<div class="text-[10px] font-medium tracking-wider text-stone-400 uppercase md:hidden dark:text-stone-500">
						{complex}
					</div>

					<button
						onclick={() => openModal(card)}
						class="group flex flex-col items-center rounded-lg border border-stone-200 bg-white p-3 text-left transition-colors hover:border-ra/30 hover:bg-rose-50/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:border-ra/30 dark:hover:bg-stone-800/50"
					>
						<img
							src="/{card.imagepath}"
							alt={capitalize(card.name)}
							class="h-52 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
							loading="lazy"
						/>
						<div class="mt-2 text-center">
							<span class="text-xs tabular-nums text-stone-400 dark:text-stone-500">{card.number}.</span>
							<span class="text-sm font-medium text-stone-900 dark:text-stone-100">{capitalize(card.name)}</span>
						</div>
						{#if tarotName(card)}
							<p class="mt-0.5 text-xs text-stone-400 italic dark:text-stone-500">
								{tarotName(card)}
							</p>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- The Choice (Card 22) -->
	{#if choiceCard}
		<div class="mt-8">
			<div class="mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">
				The Choice
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr_1fr_1fr]">
				<div class="hidden md:block"></div>
				<button
					onclick={() => openModal(choiceCard!)}
					class="group flex flex-col items-center rounded-lg border border-stone-200 bg-white p-3 text-left transition-colors hover:border-ra/30 hover:bg-rose-50/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:border-ra/30 dark:hover:bg-stone-800/50"
				>
					<img
						src="/{choiceCard.imagepath}"
						alt="The Choice"
						class="h-52 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
						loading="lazy"
					/>
					<div class="mt-2 text-center">
						<span class="text-xs tabular-nums text-stone-400 dark:text-stone-500">{choiceCard.number}.</span>
						<span class="text-sm font-medium text-stone-900 dark:text-stone-100">{capitalize(choiceCard.name)}</span>
					</div>
					{#if tarotName(choiceCard)}
						<p class="mt-0.5 text-xs text-stone-400 italic dark:text-stone-500">
							{tarotName(choiceCard)}
						</p>
					{/if}
				</button>
			</div>
		</div>
	{/if}
{/if}

<!-- Modal -->
{#if modalCard}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onclick={onBackdropClick}
	>
		<div class="relative flex max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900">
			<!-- Close button -->
			<button
				onclick={closeModal}
				class="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:bg-stone-800/80 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<!-- Image side -->
			<div class="flex shrink-0 items-start justify-center overflow-y-auto bg-stone-100 p-6 dark:bg-stone-800/50">
				<img
					src="/{modalCard.imagepath}"
					alt={capitalize(modalCard.name)}
					class="max-h-[80vh] w-auto rounded-lg shadow-lg"
				/>
			</div>

			<!-- Info side -->
			<div class="flex-1 overflow-y-auto p-8">
				<div class="flex items-baseline gap-2">
					<span class="text-lg tabular-nums text-stone-400 dark:text-stone-500">{modalCard.number}</span>
					<h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
						{capitalize(modalCard.name)}
					</h2>
				</div>

				{#if modalCard.complex}
					<p class="mt-1 text-base tracking-wider text-stone-400 uppercase dark:text-stone-500">
						{modalCard.stage} of the {modalCard.complex}
					</p>
				{/if}

				<!-- Aliases -->
				<div class="mt-3 flex flex-wrap gap-2">
					{#each modalCard.aliases as alias}
						<span class="rounded-full bg-stone-100 px-3 py-1 text-base text-stone-600 dark:bg-stone-800 dark:text-stone-400">
							{alias}
						</span>
					{/each}
				</div>

				<!-- References -->
				<div class="mt-6">
					<h3 class="text-lg font-medium text-stone-700 dark:text-stone-300">
						References
						<span class="ml-1 text-base font-normal tabular-nums text-stone-400 dark:text-stone-500">
							({modalCard.references.length})
						</span>
					</h3>

					{#if loadingRefs}
						<div class="mt-4 space-y-4">
							{#each Array(Math.min(modalCard.references.length, 3)) as _}
								<div class="h-24 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800"></div>
							{/each}
						</div>
					{:else}
						<div class="mt-4 space-y-5">
							{#each modalRefs as ref}
								<div class="rounded-lg border border-stone-200 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-800/30">
									<!-- Reference header -->
									<a
										href="/session/{ref.session}#{ref.question}"
										class="block border-b border-stone-200 px-4 py-2 font-mono text-base font-semibold tabular-nums text-ra hover:underline dark:border-stone-800"
									>
										{ref.session}.{ref.question}
									</a>

									{#if ref.qa}
										<div class="space-y-4 p-5">
											<!-- Question -->
											{#if ref.qa.question}
												<div class="border-l-[3px] border-questioner/40 pl-4 dark:border-questioner/30">
													<span class="text-sm font-medium tracking-wider text-questioner/70 uppercase dark:text-questioner/60">
														Questioner
													</span>
													<p class="mt-1 text-base leading-relaxed text-stone-700 dark:text-stone-300">
														{ref.qa.question}
													</p>
												</div>
											{/if}

											<!-- Answer -->
											<div class="border-l-[3px] border-ra/40 pl-4 dark:border-ra/30">
												<span class="text-sm font-medium tracking-wider text-ra/70 uppercase dark:text-ra/60">
													Ra
												</span>
												<p class="mt-1 whitespace-pre-line text-base leading-relaxed text-stone-700 dark:text-stone-300">
													{ref.qa.answer}
												</p>
											</div>
										</div>
									{:else}
										<div class="p-5 text-base text-stone-400 italic dark:text-stone-500">
											Content not available
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
