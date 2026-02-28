import type { Category } from '$lib/types';

let categories: Category[] | null = null;

async function load(): Promise<Category[]> {
	if (categories) return categories;
	const resp = await fetch('/data/categories.json');
	categories = (await resp.json()) as Category[];
	return categories;
}

export async function getCategories(): Promise<Category[]> {
	return load();
}

export async function getCategory(id: string): Promise<Category | undefined> {
	const all = await load();
	return all.find((c) => c.id === id);
}

/** Get categories that contain references to a given session number, optionally filtered to specific QA indices.
 *  Filters subcategories to only those with at least one matching reference,
 *  but keeps ALL references (cross-session) within matching subcategories. */
export async function getCategoriesForSession(
	sessionNum: number,
	qaIndices?: number[]
): Promise<Category[]> {
	const all = await load();
	const indexSet = qaIndices ? new Set(qaIndices) : null;
	const results: Category[] = [];

	for (const cat of all) {
		const matchingSubs = cat.subcategories.filter((sub) =>
			sub.references.some(
				(r) => r.session === sessionNum && (!indexSet || indexSet.has(r.qaIndex))
			)
		);

		if (matchingSubs.length > 0) {
			results.push({
				id: cat.id,
				name: cat.name,
				subcategories: matchingSubs
			});
		}
	}

	return results;
}
