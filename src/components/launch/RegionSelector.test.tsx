import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_REGION_SIZE, RegionSelector } from "./RegionSelector";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => {
		if (namespace === "common") {
			return (key: string) => (key === "actions.cancel" ? "Cancel" : key);
		}

		return (key: string, vars?: Record<string, string>) => {
			if (key === "regionSelector.hint") return "Drag to select the area you want to record";
			if (key === "regionSelector.cancelHint") return "Press Esc to cancel";
			if (key === "regionSelector.tooSmall") {
				return `Selection is too small — drag at least ${vars?.min}×${vars?.min} pixels`;
			}
			if (key === "regionSelector.confirm") return "Use this area";
			if (key === "regionSelector.sourceName") {
				return `Region (${vars?.width}×${vars?.height})`;
			}
			return key;
		};
	},
}));

function dragRegion(from: { x: number; y: number }, to: { x: number; y: number }) {
	const overlay = screen.getByTestId("region-selector-overlay");
	fireEvent.pointerDown(overlay, { clientX: from.x, clientY: from.y, pointerId: 1 });
	fireEvent.pointerMove(overlay, { clientX: to.x, clientY: to.y, pointerId: 1 });
	fireEvent.pointerUp(overlay, { clientX: to.x, clientY: to.y, pointerId: 1 });
}

describe("RegionSelector", () => {
	let closeSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		window.electronAPI = {
			...window.electronAPI,
			selectRegion: vi.fn().mockResolvedValue(null),
		} as typeof window.electronAPI;
		closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);
	});

	afterEach(() => {
		closeSpy.mockRestore();
	});

	it("shows the drag hint before a selection exists", () => {
		render(<RegionSelector />);

		expect(screen.getByText("Drag to select the area you want to record")).toBeInTheDocument();
		expect(screen.getByText("Press Esc to cancel")).toBeInTheDocument();
	});

	it("selects a region by dragging and confirms it", async () => {
		render(<RegionSelector />);

		dragRegion({ x: 100, y: 100 }, { x: 300, y: 250 });

		expect(screen.getByText("200 × 150")).toBeInTheDocument();
		fireEvent.click(screen.getByTestId("region-selector-confirm-button"));

		await waitFor(() => {
			expect(window.electronAPI.selectRegion).toHaveBeenCalledWith({
				name: "Region (200×150)",
				bounds: { x: 100, y: 100, width: 200, height: 150 },
			});
		});
	});

	it("supports dragging in any direction", () => {
		render(<RegionSelector />);

		dragRegion({ x: 400, y: 300 }, { x: 150, y: 120 });

		expect(screen.getByText("250 × 180")).toBeInTheDocument();
	});

	it("rejects selections smaller than the minimum size", () => {
		render(<RegionSelector />);

		dragRegion({ x: 100, y: 100 }, { x: 120, y: 110 });

		expect(
			screen.getByText(
				`Selection is too small — drag at least ${MIN_REGION_SIZE}×${MIN_REGION_SIZE} pixels`,
			),
		).toBeInTheDocument();
		expect(screen.queryByTestId("region-selector-confirm-button")).not.toBeInTheDocument();
	});

	it("confirms the selection with Enter", async () => {
		render(<RegionSelector />);

		dragRegion({ x: 50, y: 50 }, { x: 250, y: 200 });
		fireEvent.keyDown(window, { key: "Enter" });

		await waitFor(() => {
			expect(window.electronAPI.selectRegion).toHaveBeenCalledWith({
				name: "Region (200×150)",
				bounds: { x: 50, y: 50, width: 200, height: 150 },
			});
		});
	});

	it("closes the overlay on Escape", () => {
		render(<RegionSelector />);

		fireEvent.keyDown(window, { key: "Escape" });

		expect(closeSpy).toHaveBeenCalled();
	});

	it("closes the overlay from the cancel button without selecting", () => {
		render(<RegionSelector />);

		dragRegion({ x: 100, y: 100 }, { x: 300, y: 250 });
		fireEvent.click(screen.getByTestId("region-selector-cancel-button"));

		expect(closeSpy).toHaveBeenCalled();
		expect(window.electronAPI.selectRegion).not.toHaveBeenCalled();
	});
});
