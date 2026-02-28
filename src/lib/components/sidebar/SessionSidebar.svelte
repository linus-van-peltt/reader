<script lang="ts">
	import { getSidebarState, setSidebarTab } from '$lib/stores/sidebar.svelte';
	import { getAudioState } from '$lib/stores/audio.svelte';
	import SidebarNavPanel from './SidebarNavPanel.svelte';
	import SidebarCategoriesPanel from './SidebarCategoriesPanel.svelte';
	import SidebarIndexPanel from './SidebarIndexPanel.svelte';
	import SidebarNotebooksPanel from './SidebarNotebooksPanel.svelte';

	interface Props {
		mobile?: boolean;
	}

	let { mobile = false }: Props = $props();

	const sidebar = getSidebarState();
	const audio = getAudioState();

	const tabs = [
		{ id: 'nav' as const, label: 'Nav' },
		{ id: 'categories' as const, label: 'Categories' },
		{ id: 'index' as const, label: 'Index' },
		{ id: 'notebooks' as const, label: 'Notebooks' }
	];
</script>

<aside
	class={mobile
		? 'flex w-full flex-col bg-white dark:bg-stone-900'
		: 'hidden w-64 shrink-0 md:flex md:flex-col sticky top-[92px] z-20 max-h-[calc(100vh-92px)] border-r border-stone-200/70 dark:border-stone-800'}
>
	<div class="flex border-b border-stone-200 dark:border-stone-800">
		{#each tabs as tab (tab.id)}
			<button
				onclick={() => setSidebarTab(tab.id)}
				class="flex-1 px-3 py-2 text-xs font-medium transition-colors {sidebar.activeTab === tab.id
					? 'border-b-2 border-ra text-ra'
					: 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div
		class="flex-1 overflow-y-auto overscroll-contain"
		class:pb-16={audio.currentSegment}
	>
		{#if sidebar.activeTab === 'nav'}
			<SidebarNavPanel />
		{:else if sidebar.activeTab === 'categories'}
			<SidebarCategoriesPanel />
		{:else if sidebar.activeTab === 'index'}
			<SidebarIndexPanel />
		{:else}
			<SidebarNotebooksPanel />
		{/if}
	</div>
</aside>
