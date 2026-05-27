"use client";

import { CreateTaskForm } from "#/components/create-task-form";
import {
	type WorkItemPresentation,
	WorkItemShell,
	type WorkItemShellRouteTarget,
} from "#/components/work-item-shell/work-item-shell";

const TASK_TITLE = "Create roadmap task";

function taskDescription(version: string) {
	return (
		<>
			Tasks are GitHub issues labeled for version{" "}
			<span className="font-mono">{version}</span>, workstream, and spec
			relations. Fields depend on the component you select.
		</>
	);
}

export interface CreateTaskWorkItemProps {
	presentation: WorkItemPresentation;
	version: string;
	workstreamOptions?: string[];
	/** Pre-select and lock workstream (workstream-scoped boards). */
	defaultWorkstream?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onClose?: () => void;
	onCreated?: () => void;
	expandTo?: WorkItemShellRouteTarget;
	collapseTo?: WorkItemShellRouteTarget;
	dialogTrigger?: React.ReactNode;
}

export function CreateTaskWorkItem({
	presentation,
	version,
	workstreamOptions = [],
	defaultWorkstream,
	open = true,
	onOpenChange,
	onClose,
	onCreated,
	expandTo,
	collapseTo,
	dialogTrigger,
}: CreateTaskWorkItemProps) {
	const handleClose = () => {
		onClose?.();
		onOpenChange?.(false);
	};

	const handleSuccess = () => {
		onCreated?.();
		handleClose();
	};

	return (
		<WorkItemShell
			presentation={presentation}
			title={TASK_TITLE}
			description={
				presentation === "page"
					? undefined
					: `GitHub issues for version ${version}.`
			}
			open={open}
			onOpenChange={onOpenChange}
			onClose={handleClose}
			expandTo={expandTo}
			collapseTo={collapseTo}
			dialogTrigger={dialogTrigger}
		>
			{presentation === "page" ? (
				<p className="text-muted-foreground mb-4 text-sm leading-relaxed">
					{taskDescription(version)}
				</p>
			) : null}
			<CreateTaskForm
				version={version}
				workstreamOptions={workstreamOptions}
				defaultWorkstream={defaultWorkstream}
				onSuccess={handleSuccess}
				onCancel={handleClose}
			/>
		</WorkItemShell>
	);
}
