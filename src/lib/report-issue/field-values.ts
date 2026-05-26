/** Serialized reproduction steps (stored in form values JSON). */
export function parseStepsValue(raw: string): string[] {
	if (!raw.trim()) return [""];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed) && parsed.length > 0) {
			return parsed.map((step) => String(step));
		}
	} catch {
		// Legacy plain-text fallback
		const lines = raw
			.split("\n")
			.map((line) => line.replace(/^\s*\d+\.\s*/, "").trim())
			.filter(Boolean);
		if (lines.length > 0) return lines;
	}
	return [""];
}

export function serializeStepsValue(steps: string[]): string {
	const trimmed = steps.map((s) => s.trim()).filter(Boolean);
	return JSON.stringify(trimmed.length > 0 ? trimmed : []);
}

export function stepsToMarkdown(steps: string[]): string {
	return steps
		.map((step) => step.trim())
		.filter(Boolean)
		.map((step, index) => `${index + 1}. ${step}`)
		.join("\n");
}

export interface ReportAttachmentDraft {
	id: string;
	file: File;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToBase64(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}
