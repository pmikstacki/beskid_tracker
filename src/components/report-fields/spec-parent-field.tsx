"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Input } from "#/components/ui/input";
import { searchPlatformSpecCatalog } from "#/server/platform-spec-catalog";

interface SpecParentFieldProps {
	id: string;
	label: string;
	value: string;
	hint?: string;
	required?: boolean;
	disabled?: boolean;
	onChange: (value: string) => void;
}

export function SpecParentField({
	id,
	label,
	value,
	hint,
	required,
	disabled,
	onChange,
}: SpecParentFieldProps) {
	const [query, setQuery] = useState("");

	const { data: results = [] } = useQuery({
		queryKey: ["platform-spec-catalog-parent", query],
		queryFn: () =>
			searchPlatformSpecCatalog({
				data: { query, limit: 10 },
			}),
		enabled: query.trim().length >= 1,
	});

	return (
		<div className="work-item-field min-w-0 space-y-2">
			<label
				htmlFor={id}
				className="text-foreground/90 block text-sm font-medium"
			>
				{label}
				{required ? <span className="text-destructive ml-0.5">*</span> : null}
			</label>
			<Input
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="platform-spec/compiler/…"
				required={required}
				disabled={disabled}
			/>
			<Input
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				placeholder="Search catalog…"
				disabled={disabled}
				className="text-sm"
			/>
			{results.length > 0 ? (
				<ul className="border-border max-h-40 overflow-y-auto rounded-md border text-sm">
					{results.map((entry) => (
						<li key={entry.slug}>
							<button
								type="button"
								className="hover:bg-muted w-full px-3 py-2 text-left"
								onClick={() => {
									onChange(entry.slug);
									setQuery("");
								}}
							>
								<span className="font-medium">{entry.title}</span>
								<span className="text-muted-foreground ml-2 text-xs">
									{entry.specLevel ?? entry.pathClass}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}
