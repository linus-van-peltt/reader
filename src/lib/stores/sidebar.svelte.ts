const STORAGE_KEY_OPEN = 'sidebar-open';
const STORAGE_KEY_TAB = 'sidebar-tab';

export type SidebarTab = 'nav' | 'categories' | 'index' | 'notebooks';

let isOpen = $state(true);
let activeTab = $state<SidebarTab>('nav');
let activeQaIndex = $state<number | null>(null);
let visibleQaIndices = $state<number[]>([]);
let scrollProgress = $state(0);
let activeNotebookId = $state<string | null>(null);

export function getSidebarState() {
	return {
		get isOpen() {
			return isOpen;
		},
		get activeTab() {
			return activeTab;
		},
		get activeQaIndex() {
			return activeQaIndex;
		},
		get visibleQaIndices() {
			return visibleQaIndices;
		},
		get scrollProgress() {
			return scrollProgress;
		},
		get activeNotebookId() {
			return activeNotebookId;
		}
	};
}

export function toggleSidebar(): void {
	isOpen = !isOpen;
	try {
		localStorage.setItem(STORAGE_KEY_OPEN, String(isOpen));
	} catch {}
}

export function setActiveNotebookId(id: string | null): void {
	activeNotebookId = id;
}

export function setSidebarTab(tab: SidebarTab): void {
	activeTab = tab;
	try {
		localStorage.setItem(STORAGE_KEY_TAB, tab);
	} catch {}
}

export function setActiveQa(index: number | null): void {
	activeQaIndex = index;
}

export function setVisibleQaIndices(indices: number[]): void {
	visibleQaIndices = indices;
}

export function setScrollProgress(pct: number): void {
	scrollProgress = Math.max(0, Math.min(100, pct));
}

export function initSidebarFromStorage(): void {
	try {
		const storedOpen = localStorage.getItem(STORAGE_KEY_OPEN);
		if (storedOpen !== null) {
			isOpen = storedOpen === 'true';
		}
		const storedTab = localStorage.getItem(STORAGE_KEY_TAB);
		if (storedTab === 'nav' || storedTab === 'categories' || storedTab === 'index' || storedTab === 'notebooks') {
			activeTab = storedTab;
		}
	} catch {}
}
