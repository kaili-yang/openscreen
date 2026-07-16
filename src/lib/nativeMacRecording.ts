import type { Rectangle } from "electron";
import type { CursorCaptureMode } from "./recordingSession";

export type NativeMacSourceType = "display" | "window" | "region";

/** Minimum region selection size in DIP, enforced by both the selector UI and main-process validation. */
export const MIN_REGION_SIZE = 50;

export type NativeMacRecordingRequest = {
	schemaVersion: 1;
	recordingId?: number;
	source: {
		type: NativeMacSourceType;
		sourceId: string;
		displayId?: number;
		windowId?: number;
		bounds?: Rectangle;
		region?: Rectangle;
	};
	video: {
		fps: number;
		width: number;
		height: number;
		bitrate?: number;
		hideSystemCursor: boolean;
	};
	audio: {
		system: {
			enabled: boolean;
		};
		microphone: {
			enabled: boolean;
			deviceId?: string;
			deviceName?: string;
			gain: number;
		};
	};
	webcam: {
		enabled: boolean;
		deviceId?: string;
		deviceName?: string;
		width: number;
		height: number;
		fps: number;
	};
	cursor: {
		mode: CursorCaptureMode;
	};
	outputs: {
		screenPath: string;
		manifestPath?: string;
	};
};

export type NativeMacHelperReadyEvent = {
	event: "ready";
	schemaVersion: 1;
};

export type NativeMacHelperRecordingStartedEvent = {
	event: "recording-started";
	timestampMs: number;
};

export type NativeMacHelperRecordingStoppedEvent = {
	event: "recording-stopped";
	screenPath: string;
};

export type NativeMacHelperWarningEvent = {
	event: "warning";
	code: string;
	message: string;
};

export type NativeMacHelperErrorEvent = {
	event: "error";
	code: string;
	message: string;
};

export type NativeMacHelperEvent =
	| NativeMacHelperReadyEvent
	| NativeMacHelperRecordingStartedEvent
	| NativeMacHelperRecordingStoppedEvent
	| NativeMacHelperWarningEvent
	| NativeMacHelperErrorEvent;

export type NativeMacRecordingStartResult = {
	success: boolean;
	recordingId?: number;
	path?: string;
	helperPath?: string;
	error?: string;
};

export function parseMacWindowIdFromSourceId(sourceId?: string | null) {
	if (!sourceId?.startsWith("window:")) {
		return null;
	}

	const windowIdPart = sourceId.split(":")[1];
	if (!windowIdPart || !/^\d+$/.test(windowIdPart)) {
		return null;
	}

	return Number(windowIdPart);
}

export function parseMacDisplayIdFromSourceId(sourceId?: string | null) {
	if (!sourceId?.startsWith("screen:")) {
		return null;
	}

	const displayIdPart = sourceId.split(":")[1];
	if (!displayIdPart || !/^\d+$/.test(displayIdPart)) {
		return null;
	}

	return Number(displayIdPart);
}

export function isRegionSourceId(sourceId?: string | null) {
	return Boolean(sourceId?.startsWith("region:"));
}

export function normalizeRegionRect(value: unknown): Rectangle | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const { x, y, width, height } = value as Record<string, unknown>;
	if (
		typeof x !== "number" ||
		typeof y !== "number" ||
		typeof width !== "number" ||
		typeof height !== "number" ||
		!Number.isFinite(x) ||
		!Number.isFinite(y) ||
		!Number.isFinite(width) ||
		!Number.isFinite(height)
	) {
		return null;
	}

	const rect = {
		x: Math.round(x),
		y: Math.round(y),
		width: Math.round(width),
		height: Math.round(height),
	};
	if (rect.width < 1 || rect.height < 1) {
		return null;
	}

	return rect;
}

export function clampRegionToBounds(region: Rectangle, bounds: Rectangle): Rectangle | null {
	const left = Math.max(region.x, bounds.x);
	const top = Math.max(region.y, bounds.y);
	const right = Math.min(region.x + region.width, bounds.x + bounds.width);
	const bottom = Math.min(region.y + region.height, bounds.y + bounds.height);
	if (right - left < 1 || bottom - top < 1) {
		return null;
	}

	return { x: left, y: top, width: right - left, height: bottom - top };
}
