<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { openSearch } from '$lib/stores/search.svelte';

	let mobileMenuOpen = $state(false);

	const navLinks = [
		{ href: '/', label: 'Sessions' },
		{ href: '/categories', label: 'Categories' },
		{ href: '/glossary', label: 'Glossary' },
		{ href: '/index-terms', label: 'Index' },
		{ href: '/notebooks', label: 'Notebooks' }
	];
</script>

<header
	class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
>
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
		<div class="flex items-center gap-6">
			<a href="/" class="text-lg font-semibold tracking-tight text-ra">Ra Reader</a>
			<nav class="hidden items-center gap-1 md:flex">
				{#each navLinks as link}
					<a
						href={link.href}
						class="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="flex items-center gap-2">
			<button
				onclick={() => openSearch()}
				class="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-500 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<span class="hidden sm:inline">Search</span>
				<kbd
					class="hidden rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-400 sm:inline dark:bg-stone-800"
					>⌘K</kbd
				>
			</button>
			<ThemeToggle />
			<button
				class="rounded-lg p-2 text-stone-500 hover:bg-stone-200 md:hidden dark:text-stone-400 dark:hover:bg-stone-800"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Menu"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					{#if mobileMenuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					{/if}
				</svg>
			</button>
		</div>
	</div>

	{#if mobileMenuOpen}
		<nav class="border-t border-stone-200 px-4 py-2 md:hidden dark:border-stone-800">
			{#each navLinks as link}
				<a
					href={link.href}
					onclick={() => (mobileMenuOpen = false)}
					class="block rounded-md px-3 py-2 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
				>
					{link.label}
				</a>
			{/each}
		</nav>
	{/if}
</header>
