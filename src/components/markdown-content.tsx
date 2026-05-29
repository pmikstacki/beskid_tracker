"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "#/lib/utils";

interface MarkdownContentProps {
	children: string;
	className?: string;
	emptyFallback?: string;
}

export function MarkdownContent({
	children,
	className,
	emptyFallback = "No content.",
}: MarkdownContentProps) {
	const trimmed = children.trim();

	if (!trimmed) {
		return (
			<p className={cn("text-muted-foreground text-sm italic", className)}>
				{emptyFallback}
			</p>
		);
	}

	return (
		<div
			className={cn(
				"prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed",
				className,
			)}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
		</div>
	);
}
