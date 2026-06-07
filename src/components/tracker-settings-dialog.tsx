"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Database,
	Download,
	RefreshCw,
	Settings2,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CatalogImportDialog } from "#/components/catalog-import-dialog";
import { Button } from "#/components/ui/button";
import {
	defineSettingsRegistry,
	SettingsDialog,
} from "@beskid/ui-react/settings";
import {
	backfillFromGithubMirrorFn,
	getImportPreviewFn,
	importCatalogBundleFn,
} from "#/server/catalog-import";
import {
	getGithubWebhookSettingsFn,
	updateGithubWebhookSettingsFn,
} from "#/server/github-sync-settings";
import {
	getBoardSyncStatusFn,
	getSyncSettingsFn,
	triggerBoardSyncFn,
	triggerGithubExportFn,
	updateSyncSettingsFn,
} from "#/server/sync";

type TrackerSettingsValues = {
	syncEnabled: boolean;
	exportBugs: boolean;
	exportActiveVersionTasks: boolean;
	activeVersionOverride: string;
	publicOrigin: string;
	webhookSecret: string;
	resolvedActiveVersion: string;
	repoFullName: string;
	webhookUrl: string;
	outboxDepth: number;
};

function SyncActionsPanel({
	canManage,
	onImportOpen,
}: {
	canManage: boolean;
	onImportOpen: () => void;
}) {
	const queryClient = useQueryClient();
	const statusQuery = useQuery({
		queryKey: ["board-sync-status"],
		queryFn: () => getBoardSyncStatusFn(),
		refetchInterval: (query) =>
			query.state.data?.activeRun ? 1500 : 8000,
	});

	const pullMutation = useMutation({
		mutationFn: () => triggerBoardSyncFn(),
		onSuccess: () => {
			toast.success("Bootstrap pull started");
			void queryClient.invalidateQueries({ queryKey: ["board-sync-status"] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Bootstrap pull failed",
			);
		},
	});

	const exportMutation = useMutation({
		mutationFn: () => triggerGithubExportFn(),
		onSuccess: (result) => {
			toast.success(
				`Exported ${result.processed} item(s) to GitHub (${result.failed} failed)`,
			);
			void queryClient.invalidateQueries({ queryKey: ["tracker-settings"] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "GitHub export failed",
			);
		},
	});

	const backfillMutation = useMutation({
		mutationFn: () => backfillFromGithubMirrorFn(),
		onSuccess: (summary) => {
			toast.success(
				`Backfill complete: ${summary.tasksUpserted} tasks, ${summary.bugsUpserted} bugs`,
			);
			void queryClient.invalidateQueries();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Backfill failed",
			);
		},
	});

	const payload = statusQuery.data;

	return (
		<div className="space-y-3 rounded-md border border-border/60 bg-muted/10 p-3">
			<p className="text-sm font-medium">Manual sync</p>
			<p className="text-muted-foreground text-xs leading-relaxed">
				Tracker DB is the source of truth. Export pushes scoped changes to
				GitHub; bootstrap pull refreshes the legacy mirror for backfill.
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManage || exportMutation.isPending}
					onClick={() => exportMutation.mutate()}
				>
					<Upload className="size-3.5" />
					Export to GitHub
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManage || pullMutation.isPending}
					onClick={() => pullMutation.mutate()}
				>
					<RefreshCw className="size-3.5" />
					Bootstrap pull
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManage || backfillMutation.isPending}
					onClick={() => backfillMutation.mutate()}
				>
					<Database className="size-3.5" />
					Backfill from mirror
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!canManage}
					onClick={onImportOpen}
				>
					<Download className="size-3.5" />
					Import seed JSON
				</Button>
			</div>
			{payload?.state.lastError ? (
				<p className="text-destructive text-xs">{payload.state.lastError}</p>
			) : null}
		</div>
	);
}

function buildRegistry(
	canManage: boolean,
	onImportOpen: () => void,
) {
	return defineSettingsRegistry<TrackerSettingsValues>({
		groups: [
			{
				id: "github-sync",
				label: "GitHub Sync",
				icon: RefreshCw,
				sections: [
					{
						id: "scope",
						title: "Sync scope",
						description:
							"Only the active delivery version and all bugs sync with GitHub Issues.",
						keywords: ["active", "version", "bugs", "export"],
						fields: [
							{
								id: "syncEnabled",
								kind: "switch",
								label: "Enable GitHub sync",
								description: "Push and apply inbound webhook updates when enabled.",
							},
							{
								id: "exportActiveVersionTasks",
								kind: "switch",
								label: "Export active version tasks",
							},
							{
								id: "exportBugs",
								kind: "switch",
								label: "Export bugs",
							},
							{
								id: "resolvedActiveVersion",
								kind: "readonly",
								label: "Resolved active version",
							},
							{
								id: "activeVersionOverride",
								kind: "text",
								label: "Active version override",
								placeholder: "v0.4",
								description: "Leave blank to use catalog status rules.",
							},
							{
								id: "outboxDepth",
								kind: "readonly",
								label: "Pending outbox entries",
							},
						],
					},
					{
						id: "connection",
						title: "Repository",
						description: "GitHub repository linked for issue sync.",
						fields: [
							{
								id: "repoFullName",
								kind: "readonly",
								label: "Repository",
							},
						],
					},
					{
						id: "webhook",
						title: "Webhook",
						description:
							"Inbound issue events update the tracker database when in sync scope.",
						keywords: ["webhook", "secret", "url"],
						fields: [
							{
								id: "webhookUrl",
								kind: "readonly",
								label: "Webhook payload URL",
							},
							{
								id: "publicOrigin",
								kind: "url",
								label: "Public tracker URL",
								placeholder: "https://tracker.beskid-lang.org",
							},
							{
								id: "webhookSecret",
								kind: "password",
								label: "Webhook secret",
								placeholder: "Leave blank to keep current secret",
							},
						],
					},
					{
						id: "actions",
						title: "Sync actions",
						description: "Manual export, bootstrap, backfill, and catalog import.",
						fields: [
							{
								id: "syncEnabled",
								kind: "custom",
								label: "Actions",
								render: () => (
									<SyncActionsPanel
										canManage={canManage}
										onImportOpen={onImportOpen}
									/>
								),
							},
						],
					},
				],
			},
		],
	});
}

interface TrackerSettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canManage: boolean;
}

export function TrackerSettingsHeaderButton({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Button
			type="button"
			variant={open ? "secondary" : "ghost"}
			size="icon-sm"
			className="relative shrink-0"
			onClick={() => onOpenChange(!open)}
			title="Tracker settings"
		>
			<Settings2 className="size-4" aria-hidden />
			<span className="sr-only">Tracker settings</span>
		</Button>
	);
}

export function TrackerSettingsDialog({
	open,
	onOpenChange,
	canManage,
}: TrackerSettingsDialogProps) {
	const queryClient = useQueryClient();
	const [importOpen, setImportOpen] = useState(false);

	const settingsQuery = useQuery({
		queryKey: ["tracker-settings"],
		queryFn: async () => {
			const [webhook, sync] = await Promise.all([
				getGithubWebhookSettingsFn(),
				getSyncSettingsFn(),
			]);
			return { webhook, sync };
		},
		enabled: open && canManage,
	});

	const registry = useMemo(
		() => buildRegistry(canManage, () => setImportOpen(true)),
		[canManage],
	);

	const values = useMemo((): TrackerSettingsValues => {
		const webhook = settingsQuery.data?.webhook;
		const sync = settingsQuery.data?.sync;
		return {
			syncEnabled: sync?.enabled ?? false,
			exportBugs: sync?.exportBugs ?? true,
			exportActiveVersionTasks: sync?.exportActiveVersionTasks ?? true,
			activeVersionOverride: sync?.activeVersionOverride ?? "",
			publicOrigin: webhook?.publicOrigin ?? "",
			webhookSecret: "",
			resolvedActiveVersion: sync?.resolvedActiveVersionId ?? "—",
			repoFullName: webhook?.repoFullName ?? "—",
			webhookUrl: webhook?.webhookUrl ?? "—",
			outboxDepth: sync?.outboxDepth ?? 0,
		};
	}, [settingsQuery.data]);

	const handleSave = async (draft: TrackerSettingsValues) => {
		await updateSyncSettingsFn({
			data: {
				enabled: draft.syncEnabled,
				exportBugs: draft.exportBugs,
				exportActiveVersionTasks: draft.exportActiveVersionTasks,
				activeVersionOverride: draft.activeVersionOverride.trim() || null,
			},
		});

		await updateGithubWebhookSettingsFn({
			data: {
				publicOrigin: draft.publicOrigin.trim() || undefined,
				...(draft.webhookSecret.trim()
					? { webhookSecret: draft.webhookSecret.trim() }
					: {}),
			},
		});

		toast.success("Settings saved");
		void queryClient.invalidateQueries({ queryKey: ["tracker-settings"] });
		void queryClient.invalidateQueries({ queryKey: ["board-sync-status"] });
		void queryClient.invalidateQueries({ queryKey: ["github-webhook-settings"] });
	};

	if (!canManage) return null;

	return (
		<>
			<SettingsDialog
				open={open}
				onOpenChange={onOpenChange}
				registry={registry}
				values={values}
				onSave={handleSave}
				defaultSectionId="scope"
				title="Tracker settings"
				description="Catalog import, GitHub sync scope, and webhook configuration."
			/>
			<CatalogImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				onImport={async (files) => importCatalogBundleFn({ data: { files } })}
				onPreview={async (files) => getImportPreviewFn({ data: { files } })}
				onComplete={() => {
					void queryClient.invalidateQueries();
				}}
			/>
		</>
	);
}
