#!/usr/bin/env bun
/**
 * Scrape category data from lawofone.info.
 * Run: bun scripts/scrape-categories.ts
 * Output: static/data/categories.json
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const OUTPUT_PATH = join(ROOT, 'static', 'data', 'categories.json');
const BASE_URL = 'https://www.lawofone.info';
const DELAY_MS = 200;

interface CategoryReference {
	session: number;
	qaIndex: number;
}

interface Subcategory {
	id: string;
	name: string;
	references: CategoryReference[];
}

interface Category {
	id: string;
	name: string;
	subcategories: Subcategory[];
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

async function fetchPage(url: string): Promise<string> {
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
	return resp.text();
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/** Extract all /s/N#N references from HTML */
function extractRefs(html: string): CategoryReference[] {
	const refs: CategoryReference[] = [];
	const seen = new Set<string>();
	const regex = /href="\/s\/(\d+)#(\d+)"/g;
	let m;
	while ((m = regex.exec(html)) !== null) {
		const session = parseInt(m[1]);
		const qaIndex = parseInt(m[2]);
		const key = `${session}.${qaIndex}`;
		if (!seen.has(key)) {
			seen.add(key);
			refs.push({ session, qaIndex });
		}
	}
	return refs;
}

/** Fetch all pages for a URL that may be paginated. Returns combined HTML. */
async function fetchAllPages(baseUrl: string): Promise<string> {
	let allHtml = '';
	let offset = 0;

	while (true) {
		const sep = baseUrl.includes('?') ? '&' : '?';
		const url = offset === 0 ? baseUrl : `${baseUrl}${sep}sr=${offset}`;
		const html = await fetchPage(url);
		allHtml += html;

		// Check for "Next N ⇒" pagination link
		const nextMatch = html.match(/sr=(\d+)">Next\s+\d+/);
		if (nextMatch) {
			offset = parseInt(nextMatch[1]);
			await sleep(DELAY_MS);
		} else {
			break;
		}
	}

	return allHtml;
}

/** Parse subcategory links from the category page header */
function parseSubcategoryLinks(html: string, categoryUrl: string): { name: string; param: string }[] {
	const subs: { name: string; param: string }[] = [];

	// Subcategories appear as: <a href="/c/Densities?s=0&amp;su=General">General (9)</a>
	// Note: &amp; in HTML source
	const regex = /href="[^"]*[?&](?:amp;)?su=([^"&]+)"[^>]*>([^<]+)</g;
	let m;
	while ((m = regex.exec(html)) !== null) {
		const param = m[1];
		// Strip count like " (9)" from name
		const name = m[2].replace(/\s*\(\d+\)\s*$/, '').trim();
		if (!subs.some((s) => s.param === param)) {
			subs.push({ name, param });
		}
	}

	return subs;
}

async function scrapeCategories(): Promise<Category[]> {
	console.log('Fetching category index...');
	const indexHtml = await fetchPage(`${BASE_URL}/categories.php`);

	// Extract category links: href="/c/Something">Category Name (N)</a>
	const categoryLinks: { name: string; slug: string }[] = [];
	const linkRegex = /href="\/c\/([^"]+)"[^>]*>([^<]+)</g;
	let match;
	while ((match = linkRegex.exec(indexHtml)) !== null) {
		const slug = match[1];
		// Strip subcategory count like " (9)" from name
		const name = match[2].replace(/\s*\(\d+\)\s*$/, '').trim();
		if (!categoryLinks.some((c) => c.slug === slug)) {
			categoryLinks.push({ name, slug });
		}
	}

	console.log(`Found ${categoryLinks.length} categories`);

	const categories: Category[] = [];

	for (const link of categoryLinks) {
		console.log(`  Scraping: ${link.name}`);
		try {
			const categoryUrl = `${BASE_URL}/c/${link.slug}`;
			const firstPageHtml = await fetchPage(categoryUrl);
			await sleep(DELAY_MS);

			// Check for subcategories
			const subLinks = parseSubcategoryLinks(firstPageHtml, categoryUrl);

			const subcategories: Subcategory[] = [];

			if (subLinks.length > 0) {
				// Has subcategories — fetch each one individually
				for (const sub of subLinks) {
					const subUrl = `${categoryUrl}?s=0&su=${sub.param}`;
					const subHtml = await fetchAllPages(subUrl);
					const refs = extractRefs(subHtml);

					if (refs.length > 0) {
						subcategories.push({
							id: slugify(sub.name),
							name: sub.name,
							references: refs
						});
					}

					console.log(`    ${sub.name}: ${refs.length} refs`);
					await sleep(DELAY_MS);
				}
			} else {
				// No subcategories — extract all refs from the category page (all pages)
				const allHtml = await fetchAllPages(categoryUrl);
				const refs = extractRefs(allHtml);

				if (refs.length > 0) {
					subcategories.push({
						id: slugify(link.name),
						name: link.name,
						references: refs
					});
				}

				console.log(`    (no subcategories): ${refs.length} refs`);
			}

			categories.push({
				id: slugify(link.name),
				name: link.name,
				subcategories
			});
		} catch (err) {
			console.warn(`    Failed to scrape ${link.name}: ${err}`);
		}
	}

	return categories;
}

async function main() {
	const categories = await scrapeCategories();

	writeFileSync(OUTPUT_PATH, JSON.stringify(categories, null, 2));

	const totalRefs = categories.reduce(
		(sum, c) => sum + c.subcategories.reduce((s, sc) => s + sc.references.length, 0),
		0
	);
	const totalSubs = categories.reduce((sum, c) => sum + c.subcategories.length, 0);

	console.log(`\nWrote ${OUTPUT_PATH}`);
	console.log(
		`  ${categories.length} categories, ${totalSubs} subcategories, ${totalRefs} references`
	);
}

main().catch(console.error);
