/** When `1`, roadmap server functions read `data/v0.x/` instead of GitHub Issues. */
export function useSeedData(): boolean {
	return process.env.ROADMAP_USE_SEED === "1";
}
