"use client";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

interface ShellUiContextValue {
	version: string | undefined;
	setVersion: (version: string | undefined) => void;
}

const ShellUiContext = createContext<ShellUiContextValue | null>(null);

export function ShellUiProvider({ children }: { children: ReactNode }) {
	const [version, setVersion] = useState<string | undefined>();
	const value = useMemo(() => ({ version, setVersion }), [version]);
	return (
		<ShellUiContext.Provider value={value}>{children}</ShellUiContext.Provider>
	);
}

export function useShellUi() {
	const ctx = useContext(ShellUiContext);
	if (!ctx) {
		throw new Error("useShellUi must be used within ShellUiProvider");
	}
	return ctx;
}

/** Push route-specific delivery version id into the app sidebar. */
export function ShellVersionsSync({ version }: { version?: string }) {
	const { setVersion } = useShellUi();

	useEffect(() => {
		setVersion(version);
		return () => {
			setVersion(undefined);
		};
	}, [version, setVersion]);

	return null;
}
