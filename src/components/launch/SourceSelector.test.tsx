import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceSelector } from "./SourceSelector";

const isMacMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/utils/platformUtils", () => ({
	isMac: () => isMacMock(),
}));

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => {
		if (namespace === "common") {
			return (key: string) => {
				if (key === "actions.cancel") return "Cancel";
				if (key === "actions.share") return "Share";
				if (key === "actions.reload") return "Reload";
				return key;
			};
		}

		return (key: string, vars?: Record<string, string>) => {
			if (key === "sourceSelector.loading") return "Loading sources...";
			if (key === "sourceSelector.emptyTitle") return "No screens or windows found";
			if (key === "sourceSelector.emptyDescription") {
				return "If you just granted screen recording permission, reload this picker. On macOS you may need to reopen OpenScreen.";
			}
			if (key === "sourceSelector.loadFailedDescription") {
				return "OpenScreen could not load capture sources. Reload this picker and try again.";
			}
			if (key === "sourceSelector.screens") return `Screens (${vars?.count ?? "0"})`;
			if (key === "sourceSelector.windows") return `Windows (${vars?.count ?? "0"})`;
			if (key === "sourceSelector.region") return "Region";
			if (key === "sourceSelector.regionTitle") return "Record part of your screen";
			if (key === "sourceSelector.regionDescription") {
				return "Draw a rectangle on your main display. Only that area will be recorded.";
			}
			if (key === "sourceSelector.selectRegion") return "Select region";
			return key;
		};
	},
}));

const SCREEN_SOURCE = {
	id: "screen:1:0",
	name: "Display 1",
	thumbnail: "data:image/png;base64,abc",
	display_id: "1",
	appIcon: null,
};

describe("SourceSelector", () => {
	beforeEach(() => {
		isMacMock.mockResolvedValue(true);
		window.electronAPI = {
			...window.electronAPI,
			getSources: vi.fn().mockResolvedValue([]),
			selectSource: vi.fn(),
			openRegionSelector: vi.fn().mockResolvedValue({ opened: true }),
		} as typeof window.electronAPI;
	});

	it("shows a retry state when no capture sources are available", async () => {
		render(<SourceSelector />);

		await screen.findByText("No screens or windows found");
		expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
	});

	it("reloads capture sources from the empty state", async () => {
		const getSources = vi
			.fn()
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "screen:1:0",
					name: "Display 1",
					thumbnail: "data:image/png;base64,abc",
					display_id: "1",
					appIcon: null,
				},
			]);
		window.electronAPI = {
			...window.electronAPI,
			getSources,
			selectSource: vi.fn(),
			openRegionSelector: vi.fn().mockResolvedValue({ opened: true }),
		} as typeof window.electronAPI;

		render(<SourceSelector />);

		await screen.findByText("No screens or windows found");
		fireEvent.click(screen.getByRole("button", { name: "Reload" }));

		await waitFor(() => {
			expect(screen.getByText("Display 1")).toBeInTheDocument();
		});
		expect(getSources).toHaveBeenCalledTimes(2);
	});

	it("shows the region tab on macOS", async () => {
		window.electronAPI.getSources = vi.fn().mockResolvedValue([SCREEN_SOURCE]);

		render(<SourceSelector />);

		await screen.findByText("Display 1");
		await waitFor(() => {
			expect(screen.getByTestId("source-selector-region-tab")).toBeInTheDocument();
		});
	});

	it("hides the region tab on other platforms", async () => {
		window.electronAPI.getSources = vi.fn().mockResolvedValue([SCREEN_SOURCE]);
		isMacMock.mockResolvedValue(false);

		render(<SourceSelector />);

		await screen.findByText("Display 1");
		expect(screen.queryByTestId("source-selector-region-tab")).not.toBeInTheDocument();
	});

	it("opens the region selector from the region tab without sharing a source", async () => {
		window.electronAPI.getSources = vi.fn().mockResolvedValue([SCREEN_SOURCE]);

		render(<SourceSelector />);

		await screen.findByText("Display 1");
		const regionTab = await screen.findByTestId("source-selector-region-tab");
		// Radix TabsTrigger activates on mousedown, not click, in jsdom.
		fireEvent.mouseDown(regionTab);
		fireEvent.click(regionTab);

		const shareButton = screen.getByTestId("source-selector-share-button");
		await waitFor(() => {
			expect(shareButton).toHaveTextContent("Select region");
		});
		expect(shareButton).toBeEnabled();

		fireEvent.click(shareButton);
		await waitFor(() => {
			expect(window.electronAPI.openRegionSelector).toHaveBeenCalledTimes(1);
		});
		expect(window.electronAPI.selectSource).not.toHaveBeenCalled();
	});
});
