export interface HighlightSegment {
	text: string;
	highlight: boolean;
}

export function highlightText(text: string, query: string): HighlightSegment[] {
	if (!query.trim()) return [{ text, highlight: false }];

	const words = query
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 2);

	if (words.length === 0) return [{ text, highlight: false }];

	const pattern = new RegExp(
		`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
		'gi'
	);
	const parts = text.split(pattern);

	return parts.map((part) => ({
		text: part,
		highlight: words.some((w) => part.toLowerCase() === w)
	}));
}
