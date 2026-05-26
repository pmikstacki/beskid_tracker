"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "#/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { searchPlatformSpecNav } from "#/server/platform-spec";

interface SpecLinkPickerProps {
	onSelect: (path: string, title: string) => void;
}

export function SpecLinkPicker({ onSelect }: SpecLinkPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const { data: entries = [], isFetching } = useQuery({
		queryKey: ["platform-spec-nav", query],
		queryFn: () => searchPlatformSpecNav({ data: { query, limit: 15 } }),
		enabled: open,
		staleTime: 60_000,
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" size="sm">
					Link platform spec
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(24rem,calc(100vw-2rem))] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search platform specification…"
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						<CommandEmpty>
							{isFetching ? "Searching…" : "No matching spec pages."}
						</CommandEmpty>
						<CommandGroup>
							{entries.map((entry) => (
								<CommandItem
									key={entry.slug}
									value={entry.slug}
									onSelect={() => {
										onSelect(entry.href, entry.title);
										setOpen(false);
										setQuery("");
									}}
								>
									<span className="font-medium">{entry.title}</span>
									<span className="text-muted-foreground ml-2 truncate text-xs">
										{entry.href}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
