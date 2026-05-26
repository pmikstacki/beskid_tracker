"use client";

import { Link } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { SpecProposal } from "#/lib/docs-spec/types";

interface SpecProposalListProps {
	proposals: SpecProposal[];
}

function statusVariant(
	status: SpecProposal["status"],
): "default" | "secondary" | "outline" | "destructive" {
	switch (status) {
		case "pr_open":
			return "default";
		case "merged":
			return "secondary";
		case "failed":
			return "destructive";
		default:
			return "outline";
	}
}

export function SpecProposalList({ proposals }: SpecProposalListProps) {
	if (proposals.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No proposals yet. Create one to draft platform-spec changes and open a PR.
			</p>
		);
	}

	return (
		<div className="overflow-auto rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Title</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Author</TableHead>
						<TableHead>Updated</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{proposals.map((proposal) => (
						<TableRow key={proposal.id}>
							<TableCell>
								<Link
									to="/docs/proposals/$id"
									params={{ id: proposal.id }}
									className="font-medium hover:underline"
								>
									{proposal.title}
								</Link>
							</TableCell>
							<TableCell>
								<Badge variant={statusVariant(proposal.status)}>{proposal.status}</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{proposal.authorLogin}
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{new Date(proposal.updatedAt).toLocaleString()}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
