"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";

import { ReportFieldChrome } from "#/components/report-fields/report-field-chrome";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	parseStepsValue,
	serializeStepsValue,
} from "#/lib/report-issue/field-values";

interface StepsFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hint?: string;
	disabled?: boolean;
}

export function StepsField({
	id,
	label,
	value,
	onChange,
	placeholder = "Describe this step…",
	hint,
	disabled,
}: StepsFieldProps) {
	const steps = parseStepsValue(value);

	const commit = useCallback(
		(next: string[]) => {
			onChange(serializeStepsValue(next));
		},
		[onChange],
	);

	const updateStep = (index: number, text: string) => {
		const next = [...steps];
		next[index] = text;
		commit(next);
	};

	const addStep = () => {
		commit([...steps, ""]);
	};

	const removeStep = (index: number) => {
		const next = steps.filter((_, i) => i !== index);
		commit(next.length > 0 ? next : [""]);
	};

	return (
		<ReportFieldChrome id={id} label={label} hint={hint} className="work-item-steps">
			<ul className="space-y-2">
				{steps.map((step, index) => (
					<li
						key={`${id}-step-${index}`}
						className="bg-muted/20 flex items-start gap-2 rounded-lg border border-border/60 p-2"
					>
						<span className="text-muted-foreground mt-2 flex shrink-0 items-center gap-1">
							<GripVertical className="size-3.5 opacity-40" aria-hidden />
							<span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full text-xs font-semibold">
								{index + 1}
							</span>
						</span>
						<Input
							value={step}
							onChange={(e) => updateStep(index, e.target.value)}
							placeholder={placeholder}
							disabled={disabled}
							className="border-0 bg-transparent shadow-none focus-visible:ring-0"
							aria-label={`Step ${index + 1}`}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
							disabled={disabled || steps.length <= 1}
							aria-label={`Remove step ${index + 1}`}
							onClick={() => removeStep(index)}
						>
							<Trash2 className="size-4" />
						</Button>
					</li>
				))}
			</ul>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="mt-2 h-8"
				disabled={disabled}
				onClick={addStep}
			>
				<Plus className="size-3.5" />
				Add step
			</Button>
		</ReportFieldChrome>
	);
}
