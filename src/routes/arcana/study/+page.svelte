<script lang="ts">
	import { base } from '$app/paths';
	import { getArcanaData } from '$lib/data/arcana';
	import { getSession } from '$lib/data/manifest';
	import type { ArcanaData, ArcanaCard, QAPair } from '$lib/types';


	let data = $state<ArcanaData | null>(null);
	let loading = $state(true);
	let error = $state('');
	let modalCard = $state<ArcanaCard | null>(null);
	let modalRefs = $state<{ session: number; question: string; qa: QAPair | null }[]>([]);
	let loadingRefs = $state(false);

	$effect(() => {
		getArcanaData()
			.then((d) => {
				data = d;
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

	function tarotName(card: ArcanaCard): string {
		const alias = card.aliases.find((a) => a !== card.name);
		return alias ? capitalize(alias) : '';
	}

	const complexLabels = ['mindpairs', 'bodypairs', 'spiritpairs'] as const;
	const complexNames = { mindpairs: 'Mind', bodypairs: 'Body', spiritpairs: 'Spirit' } as const;
</script>

<svelte:window {onKeydown} />

<svelte:head>
	<title>Arcana Study Guide — Ra Reader</title>
</svelte:head>

<div class="mb-6">
	<div class="flex items-baseline gap-3">
		<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Arcana Study Guide</h1>
		<a href="{base}/arcana" class="text-sm text-ra hover:underline">View all cards</a>
	</div>
	<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
		A three-stage curriculum for studying the archetypes as described in the Law of One material
	</p>
</div>

{#if loading}
	<div class="space-y-3">
		{#each Array(5) as _}
			<div class="h-32 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"></div>
		{/each}
	</div>
{:else if error}
	<div class="rounded-lg border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/50">
		<p class="text-sm text-rose-800 dark:text-rose-200">{error}</p>
	</div>
{:else if data}
	<!-- Stage One -->
	<section class="mb-12">
		<div class="mb-4">
			<h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">Stage One</h2>
			<p class="mt-1 text-sm leading-relaxed text-stone-500 italic dark:text-stone-400">
				"The fundamental relationships between mind, body, and spirit could begin to be discovered, for as one sees, for instance, the Matrix of the Mind in comparison to the Matrices of Body and Spirit one may draw certain tentative conclusions."
			</p>
		</div>

		<!-- Column headers (desktop) -->
		<div class="mb-3 hidden grid-cols-[7rem_1fr_1fr_1fr] gap-3 px-1 md:grid">
			<div></div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Mind</div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Body</div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Spirit</div>
		</div>

		<div class="space-y-3">
			{#each data.primarystudy as row, i}
				<!-- Mobile stage label -->
				<div class="mt-4 mb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase md:mt-0 md:hidden dark:text-stone-500">
					{capitalize(row[0].stage)}
				</div>

				<div class="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr_1fr_1fr]">
					<!-- Stage label (desktop) -->
					<div class="hidden items-start pt-2 md:flex">
						<span class="text-sm font-medium text-stone-500 dark:text-stone-400">{capitalize(row[0].stage)}</span>
					</div>

					{#each row as card}
						<!-- Mobile complex label -->
						<div class="text-[10px] font-medium tracking-wider text-stone-400 uppercase md:hidden dark:text-stone-500">
							{card.complex}
						</div>

						<button
							onclick={() => openModal(card)}
							class="group flex flex-col items-center rounded-lg border border-stone-200 bg-white p-3 transition-colors hover:border-ra/30 hover:bg-rose-50/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:border-ra/30 dark:hover:bg-stone-800/50"
						>
							<img
								src="{base}/{card.imagepath}"
								alt={capitalize(card.name)}
								class="h-52 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
								loading="lazy"
							/>
							<div class="mt-2 text-center">
								<span class="text-xs tabular-nums text-stone-400 dark:text-stone-500">{card.number}.</span>
								<span class="text-sm font-medium text-stone-900 dark:text-stone-100">{capitalize(card.name)}</span>
							</div>
							{#if tarotName(card)}
								<p class="mt-0.5 text-xs text-stone-400 italic dark:text-stone-500">{tarotName(card)}</p>
							{/if}
						</button>
					{/each}
				</div>
			{/each}

			<!-- The Choice -->
			<div class="mt-4 mb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase md:mt-0 md:hidden dark:text-stone-500">
				The Choice
			</div>

			<div class="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr_1fr_1fr]">
				<div class="hidden items-start pt-2 md:flex">
					<span class="text-sm font-medium text-stone-500 dark:text-stone-400">The Choice</span>
				</div>

				<button
					onclick={() => openModal(data!.thechoice)}
					class="group flex flex-col items-center rounded-lg border border-stone-200 bg-white p-3 transition-colors hover:border-ra/30 hover:bg-rose-50/30 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:border-ra/30 dark:hover:bg-stone-800/50"
				>
					<img
						src="{base}/{data.thechoice.imagepath}"
						alt="The Choice"
						class="h-52 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
						loading="lazy"
					/>
					<div class="mt-2 text-center">
						<span class="text-xs tabular-nums text-stone-400 dark:text-stone-500">22.</span>
						<span class="text-sm font-medium text-stone-900 dark:text-stone-100">The Choice</span>
					</div>
					<p class="mt-0.5 text-xs text-stone-400 italic dark:text-stone-500">Fool</p>
				</button>
			</div>
		</div>
	</section>

	<!-- Stage Two -->
	<section class="mb-12">
		<div class="mb-4">
			<h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">Stage Two</h2>
			<p class="mt-1 text-sm leading-relaxed text-stone-500 italic dark:text-stone-400">
				"We then suggested consideration of archetypes in pairs."
			</p>
		</div>

		<!-- Column headers (desktop) -->
		<div class="mb-3 hidden grid-cols-[7rem_1fr_1fr_1fr] gap-3 px-1 md:grid">
			<div></div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Mind</div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Body</div>
			<div class="text-center text-xs font-semibold tracking-wider text-stone-400 uppercase dark:text-stone-500">Spirit</div>
		</div>

		<div class="space-y-3">
			{#each [0, 1, 2, 3] as pairIdx}
				{@const mindPair = data.secondarystudy.mindpairs[pairIdx]}
				{@const rowLabel = `${capitalize(mindPair.arcanum1.stage)} & ${capitalize(mindPair.arcanum2.stage ?? mindPair.arcanum2.name)}`}

				<!-- Mobile row label -->
				<div class="mt-4 mb-1 text-xs font-semibold tracking-wider text-stone-400 uppercase md:mt-0 md:hidden dark:text-stone-500">
					{rowLabel}
				</div>

				<div class="grid grid-cols-1 gap-3 md:grid-cols-[7rem_1fr_1fr_1fr]">
					<!-- Row label (desktop) -->
					<div class="hidden items-start pt-2 md:flex">
						<span class="text-sm font-medium leading-tight text-stone-500 dark:text-stone-400">{rowLabel}</span>
					</div>

					{#each complexLabels as complexKey}
						{@const pair = data.secondarystudy[complexKey][pairIdx]}

						<!-- Mobile complex label -->
						<div class="text-[10px] font-medium tracking-wider text-stone-400 uppercase md:hidden dark:text-stone-500">
							{complexNames[complexKey]}
						</div>

						<div class="flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900/50">
							<button
								onclick={() => openModal(pair.arcanum1)}
								class="group flex flex-col items-center"
							>
								<img
									src="{base}/{pair.arcanum1.imagepath}"
									alt={capitalize(pair.arcanum1.name)}
									class="h-48 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
									loading="lazy"
								/>
								<span class="mt-1.5 text-xs font-medium text-stone-700 group-hover:text-ra dark:text-stone-300">
									{capitalize(pair.arcanum1.name)}
								</span>
								{#if tarotName(pair.arcanum1)}
									<span class="text-[11px] text-stone-400 italic dark:text-stone-500">{tarotName(pair.arcanum1)}</span>
								{/if}
							</button>

							<div class="flex items-center text-stone-300 dark:text-stone-600">
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
								</svg>
							</div>

							<button
								onclick={() => openModal(pair.arcanum2)}
								class="group flex flex-col items-center"
							>
								<img
									src="{base}/{pair.arcanum2.imagepath}"
									alt={capitalize(pair.arcanum2.name)}
									class="h-48 w-auto rounded shadow-sm transition-shadow group-hover:shadow-md"
									loading="lazy"
								/>
								<span class="mt-1.5 text-xs font-medium text-stone-700 group-hover:text-ra dark:text-stone-300">
									{capitalize(pair.arcanum2.name)}
								</span>
								{#if tarotName(pair.arcanum2)}
									<span class="text-[11px] text-stone-400 italic dark:text-stone-500">{tarotName(pair.arcanum2)}</span>
								{/if}
							</button>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</section>

	<!-- Stage Three -->
	<section class="mb-8">
		<div class="mb-4">
			<h2 class="text-lg font-bold text-stone-900 dark:text-stone-100">Stage Three</h2>
			<p class="mt-1 text-sm leading-relaxed text-stone-500 italic dark:text-stone-400">
				"The initiate to learn to become each archetype...when the adoption of the archetype's persona would be spiritually or metaphysically helpful."
			</p>
		</div>
		<div class="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900/50">
			<p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
				The third stage of study involves embodiment — learning to become each archetype and adopting its persona when spiritually or metaphysically helpful. As Ra notes, "Each perceives that which is needful and helpful to the self."
			</p>
		</div>
	</section>
{/if}

<!-- Modal -->
{#if modalCard}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onclick={onBackdropClick}
	>
		<div class="relative flex max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900">
			<button
				onclick={closeModal}
				class="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:bg-stone-800/80 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
				aria-label="Close"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<div class="flex shrink-0 items-start justify-center overflow-y-auto bg-stone-100 p-6 dark:bg-stone-800/50">
				<img
					src="{base}/{modalCard.imagepath}"
					alt={capitalize(modalCard.name)}
					class="max-h-[80vh] w-auto rounded-lg shadow-lg"
				/>
			</div>

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

				<div class="mt-3 flex flex-wrap gap-2">
					{#each modalCard.aliases as alias}
						<span class="rounded-full bg-stone-100 px-3 py-1 text-base text-stone-600 dark:bg-stone-800 dark:text-stone-400">
							{alias}
						</span>
					{/each}
				</div>

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
									<a
										href="{base}/session/{ref.session}#{ref.question}"
										class="block border-b border-stone-200 px-4 py-2 font-mono text-base font-semibold tabular-nums text-ra hover:underline dark:border-stone-800"
									>
										{ref.session}.{ref.question}
									</a>

									{#if ref.qa}
										<div class="space-y-4 p-5">
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
