"use client";

import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "#/lib/utils";

const TABS = [
	{ href: "/docs/catalog", label: "Catalog" },
	{ href: "/docs/proposals", label: "Proposals" },
] as const;

export function DocsHubTabs() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<nav className="docs-hub-tabs flex gap-1 border-b border-border">
			{TABS.map((tab) => {
				const active =
					pathname === tab.href || pathname.startsWith(`${tab.href}/`);
				return (
					<Link
						key={tab.href}
						to={tab.href}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors",
							active
								? "border-primary text-foreground border-b-2 -mb-px"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
