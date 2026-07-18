import { describe, expect, it } from "vitest";
import {
	clampRegionToBounds,
	isRegionSourceId,
	normalizeRegionRect,
	parseMacDisplayIdFromSourceId,
	parseMacWindowIdFromSourceId,
} from "./nativeMacRecording";

describe("nativeMacRecording source parsing", () => {
	it("parses Electron window source ids into ScreenCaptureKit window ids", () => {
		expect(parseMacWindowIdFromSourceId("window:12345:0")).toBe(12345);
		expect(parseMacWindowIdFromSourceId("window:987")).toBe(987);
	});

	it("rejects non-window source ids for window parsing", () => {
		expect(parseMacWindowIdFromSourceId("screen:1:0")).toBeNull();
		expect(parseMacWindowIdFromSourceId("window:not-a-number:0")).toBeNull();
		expect(parseMacWindowIdFromSourceId(null)).toBeNull();
	});

	it("parses Electron display source ids into ScreenCaptureKit display ids", () => {
		expect(parseMacDisplayIdFromSourceId("screen:1:0")).toBe(1);
		expect(parseMacDisplayIdFromSourceId("screen:69733248")).toBe(69733248);
	});

	it("rejects non-display source ids for display parsing", () => {
		expect(parseMacDisplayIdFromSourceId("window:123:0")).toBeNull();
		expect(parseMacDisplayIdFromSourceId("screen:not-a-number:0")).toBeNull();
		expect(parseMacDisplayIdFromSourceId(undefined)).toBeNull();
	});

	it("detects region source ids", () => {
		expect(isRegionSourceId("region:1")).toBe(true);
		expect(isRegionSourceId("screen:1:0")).toBe(false);
		expect(isRegionSourceId(null)).toBe(false);
		expect(isRegionSourceId(undefined)).toBe(false);
	});
});

describe("normalizeRegionRect", () => {
	it("rounds finite rects to integers", () => {
		expect(normalizeRegionRect({ x: 10.4, y: 20.6, width: 300.2, height: 199.7 })).toEqual({
			x: 10,
			y: 21,
			width: 300,
			height: 200,
		});
	});

	it("rejects malformed values", () => {
		expect(normalizeRegionRect(null)).toBeNull();
		expect(normalizeRegionRect("rect")).toBeNull();
		expect(normalizeRegionRect({ x: 0, y: 0, width: Number.NaN, height: 100 })).toBeNull();
		expect(
			normalizeRegionRect({ x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 100 }),
		).toBeNull();
		expect(normalizeRegionRect({ x: 0, y: 0, width: "100", height: 100 })).toBeNull();
	});

	it("rejects rects smaller than one pixel", () => {
		expect(normalizeRegionRect({ x: 0, y: 0, width: 0, height: 100 })).toBeNull();
		expect(normalizeRegionRect({ x: 0, y: 0, width: 100, height: 0.2 })).toBeNull();
	});
});

describe("clampRegionToBounds", () => {
	const bounds = { x: 0, y: 0, width: 1920, height: 1080 };

	it("keeps rects fully inside the bounds unchanged", () => {
		const region = { x: 100, y: 100, width: 400, height: 300 };
		expect(clampRegionToBounds(region, bounds)).toEqual(region);
	});

	it("clips rects extending past the bounds edges", () => {
		expect(clampRegionToBounds({ x: -50, y: 1000, width: 200, height: 200 }, bounds)).toEqual({
			x: 0,
			y: 1000,
			width: 150,
			height: 80,
		});
	});

	it("returns null when there is no intersection", () => {
		expect(clampRegionToBounds({ x: 2000, y: 0, width: 100, height: 100 }, bounds)).toBeNull();
		expect(clampRegionToBounds({ x: 0, y: -200, width: 100, height: 200 }, bounds)).toBeNull();
	});

	it("clamps against displays with non-zero origins", () => {
		const secondary = { x: 1920, y: 0, width: 1440, height: 900 };
		expect(clampRegionToBounds({ x: 1900, y: 100, width: 200, height: 200 }, secondary)).toEqual({
			x: 1920,
			y: 100,
			width: 180,
			height: 200,
		});
	});
});
