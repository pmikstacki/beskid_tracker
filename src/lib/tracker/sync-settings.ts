import "@tanstack/react-start/server-only";

import type { Database } from "bun:sqlite";

import { resolveActiveVersionId } from "#/lib/tracker/active-version";
import { countGithubSyncOutbox } from "#/lib/tracker/repositories/outbox-repository";
import {
	getSyncSetting,
	getSyncSettingBoolean,
	setSyncSetting,
	SYNC_SETTING_KEYS,
} from "#/lib/tracker/repositories/sync-settings-repository";
import { listTrackerVersions } from "#/lib/tracker/repositories/versions-repository";
import { getIssuesDatabase } from "#/lib/storage/db";

export interface TrackerSyncSettings {
	enabled: boolean;
	activeVersionOverride: string | null;
	resolvedActiveVersionId: string | null;
	exportBugs: boolean;
	exportActiveVersionTasks: boolean;
	lastExportAt: string | null;
	lastInboundAt: string | null;
	outboxDepth: number;
}

export interface UpdateTrackerSyncSettingsInput {
	enabled?: boolean;
	activeVersionOverride?: string | null;
	exportBugs?: boolean;
	exportActiveVersionTasks?: boolean;
}

export function resolveTrackerActiveVersionId(db?: Database): string | null {
	const database = db ?? getIssuesDatabase();
	const override = getSyncSetting(
		SYNC_SETTING_KEYS.activeVersionOverride,
		database,
	)?.trim();
	if (override) return override;
	const versions = listTrackerVersions(database);
	return resolveActiveVersionId(versions);
}

export function getTrackerSyncSettings(db?: Database): TrackerSyncSettings {
	const database = db ?? getIssuesDatabase();
	return {
		enabled: getSyncSettingBoolean(SYNC_SETTING_KEYS.enabled, false, database),
		activeVersionOverride:
			getSyncSetting(SYNC_SETTING_KEYS.activeVersionOverride, database) ?? null,
		resolvedActiveVersionId: resolveTrackerActiveVersionId(database),
		exportBugs: getSyncSettingBoolean(
			SYNC_SETTING_KEYS.exportBugs,
			true,
			database,
		),
		exportActiveVersionTasks: getSyncSettingBoolean(
			SYNC_SETTING_KEYS.exportActiveVersionTasks,
			true,
			database,
		),
		lastExportAt:
			getSyncSetting(SYNC_SETTING_KEYS.lastExportAt, database) ?? null,
		lastInboundAt:
			getSyncSetting(SYNC_SETTING_KEYS.lastInboundAt, database) ?? null,
		outboxDepth: countGithubSyncOutbox(database),
	};
}

export function updateTrackerSyncSettings(
	input: UpdateTrackerSyncSettingsInput,
	db?: Database,
): TrackerSyncSettings {
	const database = db ?? getIssuesDatabase();

	if (input.enabled !== undefined) {
		setSyncSetting(
			SYNC_SETTING_KEYS.enabled,
			input.enabled ? "true" : "false",
			database,
		);
	}

	if (input.activeVersionOverride !== undefined) {
		const value = input.activeVersionOverride?.trim();
		if (value) {
			setSyncSetting(
				SYNC_SETTING_KEYS.activeVersionOverride,
				value,
				database,
			);
		} else {
			setSyncSetting(SYNC_SETTING_KEYS.activeVersionOverride, "", database);
		}
	}

	if (input.exportBugs !== undefined) {
		setSyncSetting(
			SYNC_SETTING_KEYS.exportBugs,
			input.exportBugs ? "true" : "false",
			database,
		);
	}

	if (input.exportActiveVersionTasks !== undefined) {
		setSyncSetting(
			SYNC_SETTING_KEYS.exportActiveVersionTasks,
			input.exportActiveVersionTasks ? "true" : "false",
			database,
		);
	}

	return getTrackerSyncSettings(database);
}

export function markTrackerExportCompleted(db?: Database): void {
	const database = db ?? getIssuesDatabase();
	setSyncSetting(
		SYNC_SETTING_KEYS.lastExportAt,
		new Date().toISOString(),
		database,
	);
}

export function markTrackerInboundCompleted(db?: Database): void {
	const database = db ?? getIssuesDatabase();
	setSyncSetting(
		SYNC_SETTING_KEYS.lastInboundAt,
		new Date().toISOString(),
		database,
	);
}
