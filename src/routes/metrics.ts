import {
	initObservability,
	metricsHandler,
} from "@beskid/server-observability";
import { createFileRoute } from "@tanstack/react-router";

initObservability({ service: "beskid-tracker" });

export const Route = createFileRoute("/metrics")({
	server: {
		handlers: {
			GET: () => metricsHandler(),
		},
	},
});
