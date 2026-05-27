"use client";

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { beskidDocsUrl } from "#/lib/beskid-docs-origin";
import {
	catalogDomains,
	filterCatalogEntries,
	type PlatformSpecCatalogEntry,
	searchCatalogEntries,
} from "#/lib/platform-spec/catalog";
import { encodeCatalogDocSlug } from "#/lib/platform-spec/catalog-url";

interface SpecCatalogTableProps {
	entries: PlatformSpecCatalogEntry[];
}

export function SpecCatalogTable({ entries }: SpecCatalogTableProps) {
	const [query, setQuery] = useState("");
	const [specLevel, setSpecLevel] = useState<string>("all");
	const [domain, setDomain] = useState<string>("all");

	const domains = useMemo(() => catalogDomains(entries), [entries]);

	const filtered = useMemo(() => {
		let list = entries;
		if (specLevel !== "all") {
			list = filterCatalogEntries(list, { specLevel });
		}
		if (domain !== "all") {
			list = filterCatalogEntries(list, { domain });
		}
		return searchCatalogEntries(list, query, 200);
	}, [entries, query, specLevel, domain]);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="flex flex-wrap gap-3">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search title or slug…"
					className="max-w-md"
				/>
				<Select value={specLevel} onValueChange={setSpecLevel}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Level" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All levels</SelectItem>
						<SelectItem value="domain">Domain</SelectItem>
						<SelectItem value="area">Area</SelectItem>
						<SelectItem value="feature">Feature</SelectItem>
						<SelectItem value="article">Article</SelectItem>
						<SelectItem value="adr">ADR</SelectItem>
					</SelectContent>
				</Select>
				<Select value={domain} onValueChange={setDomain}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Domain" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All domains</SelectItem>
						{domains.map((d) => (
							<SelectItem key={d} value={d}>
								{d}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<p className="text-muted-foreground text-sm">
				{filtered.length} document{filtered.length === 1 ? "" : "s"}
			</p>

			<div className="min-h-0 flex-1 overflow-auto rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Title</TableHead>
							<TableHead>Level</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="hidden lg:table-cell">Slug</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((entry) => (
							<TableRow key={entry.slug}>
								<TableCell>
									<Link
										to="/docs/catalog/$slug"
										params={{ slug: encodeCatalogDocSlug(entry.slug) }}
										className="font-medium hover:underline"
									>
										{entry.title}
									</Link>
								</TableCell>
								<TableCell>
									<Badge variant="outline">
										{entry.specLevel ?? entry.pathClass}
									</Badge>
								</TableCell>
								<TableCell>
									{entry.status ? (
										<Badge variant="secondary">{entry.status}</Badge>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<a
										href={beskidDocsUrl(entry.href)}
										target="_blank"
										rel="noreferrer"
										className="text-muted-foreground font-mono text-xs hover:underline"
									>
										{entry.slug}
									</a>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
