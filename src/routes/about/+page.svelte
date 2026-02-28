<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>About — Ra Reader</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">About</h1>
	<p class="mt-2 text-base leading-relaxed text-stone-600 dark:text-stone-400">
		Ra Reader is a study companion for the Law of One material.
	</p>
</div>

<div class="prose prose-stone max-w-3xl dark:prose-invert prose-headings:font-semibold prose-a:text-ra prose-a:no-underline hover:prose-a:underline">
	<h2><a href="{base}/">Sessions</a></h2>
	<p>
		Browse all 106 sessions. Each session is broken into individual question-and-answer passages with the questioner and Ra's responses clearly labeled. The home page displays a random passage on each visit and provides a complete session listing for direct navigation.
	</p>

	<h2>Session View</h2>
	<p>
		Each session page displays the full dialogue with synchronized audio playback. Click any passage to hear the original recording with word-level follow-along highlighting. A sidebar provides quick navigation between passages, cross-references from categories and index terms, and a glossary panel that defines terminology inline as you read.
	</p>

	<h2><a href="{base}/search">Search</a></h2>
	<p>
		Three search modes are available. <strong>Text search</strong> performs fast full-text matching across all passages. <strong>Semantic search</strong> uses an embedding model that runs entirely in your browser to find passages by meaning rather than exact wording. <strong>Hybrid search</strong> combines both approaches for the most comprehensive results. Press <kbd>&#8984;K</kbd> from anywhere to open quick search.
	</p>

	<h2><a href="{base}/categories">Categories</a></h2>
	<p>
		A topical index that organizes the material by subject. Each category expands to reveal subcategories and direct links to the relevant passages. Hover over any reference link to preview the question and answer without leaving the page.
	</p>

	<h2><a href="{base}/glossary">Glossary</a></h2>
	<p>
		Definitions for terms and concepts used throughout the material. Glossary terms are also highlighted inline when reading sessions &mdash; hover over underlined terms in any passage to see their definition without navigating away.
	</p>

	<h2><a href="{base}/index-terms">Index</a></h2>
	<p>
		An alphabetical index of key terms with links to every passage where they appear. Each term lists its references as session.passage links with hover previews.
	</p>

	<h2><a href="{base}/notebooks">Notebooks</a></h2>
	<p>
		Create personal study notebooks to collect and organize passages. Save any passage to a notebook from its toolbar, add notes alongside saved passages, and highlight specific text within questions or answers. Notebooks can be reordered by dragging entries, shared via a unique link, and exported as JSON backups from <a href="{base}/settings">settings</a>. All notebook data is stored locally in your browser using IndexedDB.
	</p>

	<h2><a href="{base}/arcana">Arcana</a></h2>
	<p>
		The 22 archetypes organized in a grid of Mind, Body, and Spirit across seven stages: Matrix, Potentiator, Catalyst, Experience, Significator, Transformation, and Great Way, plus The Choice. Click any card to view the full image alongside every referenced passage. A separate <a href="{base}/arcana/study">study guide</a> presents the three-stage curriculum for working with the archetypes.
	</p>

	<h2>Audio Playback</h2>
	<p>
		Every passage has synchronized audio from the original session recordings. The player supports word-level timestamp highlighting that follows along as the audio plays. Click any word in a passage to jump to that point in the recording. A persistent player at the bottom of the screen allows continuous playback while navigating.
	</p>

	<h2>Privacy</h2>
	<p>
		Ra Reader runs entirely in your browser. Semantic search embeddings are computed locally using a model downloaded to your device. Notebooks, highlights, and preferences are stored in your browser's local storage and IndexedDB &mdash; nothing is sent to a server.
	</p>
</div>
