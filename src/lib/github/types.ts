import type { RoadmapColumnId } from "#/lib/github/roadmap-labels";
import type { SpecRelation } from "#/lib/platform-spec/relations";

export type RoadmapPriority = "high" | "medium" | "low";

export type SpecApprovalStatus = "pending" | "approved" | undefined;

export interface RoadmapTask {
	id: string;
	number: number;
	title: string;
	owner: string;
	priority: RoadmapPriority;
	statusColumn: RoadmapColumnId;
	body: string;
	specRelations: SpecRelation[];
	specApproval: SpecApprovalStatus;
	version: string;
	workstream?: string;
	domain?: string;
	area?: string;
	feature?: string;
	htmlUrl: string;
	milestone?: { title: string; number: number };
	labelNames: string[];
}

export type RoadmapColumns = Record<RoadmapColumnId, RoadmapTask[]>;

export interface AuthUser {
	login: string;
	name: string | null;
	avatarUrl: string;
}

export interface BoardMeta {
	versions: string[];
	workstreams: string[];
	domains: string[];
	areas: string[];
	features: string[];
	canManage: boolean;
}

export interface BoardPayload {
	meta: BoardMeta;
	columns: RoadmapColumns;
	tasks: RoadmapTask[];
}

export interface PublicBug {
	number: number;
	title: string;
	state: string;
	htmlUrl: string;
	createdAt: string;
	labels: string[];
	bodyExcerpt: string;
	author?: string;
}

export interface PublicBugStats {
	open: number;
	closed: number;
}
