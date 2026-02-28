export interface Manifest {
	version: string;
	generatedAt: string;
	sessions: Session[];
}

export interface Session {
	sessionNumber: number;
	sessionDate: string;
	segments: QAPair[];
}

export interface QAPair {
	id: string;
	sessionNum: number;
	qaIndex: number;
	audioPath: string;
	machineTranscriptPath: string;
	question: string;
	answer: string;
	questionWordCount: number;
	answerWordCount: number;
}

export interface SearchResult {
	id: string;
	score: number;
	sessionNum?: number;
	qaIndex?: number;
	question?: string;
	answer?: string;
}

export interface Notebook {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	entries: NotebookEntry[];
}

export interface TextHighlight {
	id: string;
	field: 'question' | 'answer';
	start: number;
	end: number;
	text: string;
	createdAt: number;
}

export interface NotebookEntry {
	id: string;
	qaPairId: string;
	note: string;
	addedAt: number;
	highlights?: TextHighlight[];
}

export interface GlossaryTerm {
	term: string;
	definition: string;
}

export interface IndexTerm {
	term: string;
	references: IndexReference[];
}

export interface IndexReference {
	session: number;
	start: number;
	end: number;
}

export interface Category {
	id: string;
	name: string;
	subcategories: Subcategory[];
}

export interface Subcategory {
	id: string;
	name: string;
	references: CategoryReference[];
}

export interface CategoryReference {
	session: number;
	qaIndex: number;
}

export interface ArcanaCard {
	number: number;
	id: string;
	name: string;
	complex: string;
	stage: string;
	imagepath: string;
	references: { session: number; question: string }[];
	aliases: string[];
}

export interface ArcanaData {
	mind: { arcana: ArcanaCard[] };
	body: { arcana: ArcanaCard[] };
	spirit: { arcana: ArcanaCard[] };
}

export interface WordTimestamp {
	word: string;
	start_offset: number;
	end_offset: number;
	start: number;
	end: number;
	score?: number;
}

export interface TranscriptData {
	text: string;
	timestamps: {
		segment: {
			segment: string;
			start_offset: number;
			end_offset: number;
			start: number;
			end: number;
		}[];
		word: WordTimestamp[];
	};
	metadata: { audio_duration: number; [key: string]: unknown };
}
