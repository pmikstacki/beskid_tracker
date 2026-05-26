import type { HTMLAttributes } from "react";

declare module "react" {
	namespace JSX {
		interface IntrinsicElements {
			"beskid-hub": HTMLAttributes<HTMLElement> & {
				services?: string;
			};
		}
	}
}
