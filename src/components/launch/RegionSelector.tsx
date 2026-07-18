import { useCallback, useEffect, useRef, useState } from "react";
import { useScopedT } from "@/contexts/I18nContext";
import { MIN_REGION_SIZE } from "@/lib/nativeMacRecording";
import { Button } from "../ui/button";

export { MIN_REGION_SIZE };

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

function rectsEqual(a: Rect, b: Rect) {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

type DragMode = "create" | "top" | "right" | "bottom" | "left" | "move" | null;

function clampRectToViewport(rect: Rect): Rect {
	const maxWidth = window.innerWidth;
	const maxHeight = window.innerHeight;
	const x = Math.max(0, Math.min(rect.x, maxWidth - 1));
	const y = Math.max(0, Math.min(rect.y, maxHeight - 1));
	return {
		x,
		y,
		width: Math.max(1, Math.min(rect.width, maxWidth - x)),
		height: Math.max(1, Math.min(rect.height, maxHeight - y)),
	};
}

/**
 * Full-screen drag-to-select overlay for region recording. Runs in its own
 * transparent BrowserWindow positioned at the primary display origin, so
 * client coordinates equal global DIP coordinates.
 */
export function RegionSelector() {
	const t = useScopedT("launch");
	const tc = useScopedT("common");
	const [rect, setRect] = useState<Rect | null>(null);
	const [dragMode, setDragMode] = useState<DragMode>(null);
	const [showTooSmall, setShowTooSmall] = useState(false);
	const anchorRef = useRef({ x: 0, y: 0 });
	const initialRectRef = useRef<Rect | null>(null);
	// Mirror of `rect` so confirmSelection stays referentially stable — pointermove
	// updates rect at pointer frequency and must not resubscribe the keydown effect.
	const rectRef = useRef<Rect | null>(null);

	const applyRect = (next: Rect | null) => {
		rectRef.current = next;
		// Bail out of the re-render when clamping/rounding produced the same rect.
		setRect((prev) => (prev && next && rectsEqual(prev, next) ? prev : next));
	};

	const isSelected = rect !== null && dragMode === null;

	const confirmSelection = useCallback(async () => {
		const currentRect = rectRef.current;
		if (
			!currentRect ||
			currentRect.width < MIN_REGION_SIZE ||
			currentRect.height < MIN_REGION_SIZE
		) {
			return;
		}
		await window.electronAPI.selectRegion({
			name: t("regionSelector.sourceName", {
				width: String(currentRect.width),
				height: String(currentRect.height),
			}),
			// macOS may reposition the overlay (e.g. below the menu bar), so convert
			// client coordinates to global ones via the window's screen position.
			bounds: {
				x: currentRect.x + Math.round(window.screenX),
				y: currentRect.y + Math.round(window.screenY),
				width: currentRect.width,
				height: currentRect.height,
			},
		});
	}, [t]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				window.close();
			} else if (event.key === "Enter" && isSelected) {
				void confirmSelection();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isSelected, confirmSelection]);

	const beginDrag = (e: React.PointerEvent, mode: Exclude<DragMode, null>) => {
		e.preventDefault();
		e.stopPropagation();
		setShowTooSmall(false);
		setDragMode(mode);
		anchorRef.current = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
		initialRectRef.current = rect;
		if (mode === "create") {
			applyRect({ x: Math.round(e.clientX), y: Math.round(e.clientY), width: 1, height: 1 });
		}
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			// jsdom and some pointer states don't support capture; dragging still works.
		}
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!dragMode) return;
		const currentX = Math.round(e.clientX);
		const currentY = Math.round(e.clientY);
		const anchor = anchorRef.current;

		if (dragMode === "create") {
			applyRect(
				clampRectToViewport({
					x: Math.min(anchor.x, currentX),
					y: Math.min(anchor.y, currentY),
					width: Math.abs(currentX - anchor.x),
					height: Math.abs(currentY - anchor.y),
				}),
			);
			return;
		}

		const initial = initialRectRef.current;
		if (!initial) return;
		const deltaX = currentX - anchor.x;
		const deltaY = currentY - anchor.y;
		let next: Rect = { ...initial };

		switch (dragMode) {
			case "move":
				next.x = Math.max(0, Math.min(initial.x + deltaX, window.innerWidth - initial.width));
				next.y = Math.max(0, Math.min(initial.y + deltaY, window.innerHeight - initial.height));
				break;
			case "top": {
				const bottom = initial.y + initial.height;
				const newY = Math.max(0, Math.min(initial.y + deltaY, bottom - MIN_REGION_SIZE));
				next = { ...next, y: newY, height: bottom - newY };
				break;
			}
			case "bottom":
				next.height = Math.max(
					MIN_REGION_SIZE,
					Math.min(initial.height + deltaY, window.innerHeight - initial.y),
				);
				break;
			case "left": {
				const right = initial.x + initial.width;
				const newX = Math.max(0, Math.min(initial.x + deltaX, right - MIN_REGION_SIZE));
				next = { ...next, x: newX, width: right - newX };
				break;
			}
			case "right":
				next.width = Math.max(
					MIN_REGION_SIZE,
					Math.min(initial.width + deltaX, window.innerWidth - initial.x),
				);
				break;
		}

		applyRect(next);
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		if (!dragMode) return;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			// Pointer may already be released; ignore.
		}
		if (
			dragMode === "create" &&
			rect &&
			(rect.width < MIN_REGION_SIZE || rect.height < MIN_REGION_SIZE)
		) {
			applyRect(null);
			setShowTooSmall(true);
		}
		setDragMode(null);
		initialRectRef.current = null;
	};

	// The control bar sits below the selection unless it would fall off-screen.
	const controlsBelow = rect ? rect.y + rect.height + 52 < window.innerHeight : true;

	return (
		<div
			data-testid="region-selector-overlay"
			className="fixed inset-0 select-none cursor-crosshair"
			onPointerDown={(e) => beginDrag(e, "create")}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		>
			<svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
				<defs>
					<mask id="regionMask">
						<rect width="100%" height="100%" fill="white" />
						{rect && (
							<rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="black" />
						)}
					</mask>
				</defs>
				<rect width="100%" height="100%" fill="black" fillOpacity="0.45" mask="url(#regionMask)" />
			</svg>

			{!rect && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="rounded-xl bg-black/70 px-5 py-3 text-center backdrop-blur-sm">
						<p className="text-sm font-medium text-white">
							{showTooSmall
								? t("regionSelector.tooSmall", { min: String(MIN_REGION_SIZE) })
								: t("regionSelector.hint")}
						</p>
						<p className="mt-1 text-xs text-zinc-400">{t("regionSelector.cancelHint")}</p>
					</div>
				</div>
			)}

			{rect && (
				<>
					<div
						data-testid="region-selector-rect"
						className="absolute border-2 border-[#34B27B]"
						style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
					>
						<div
							className="absolute inset-0 cursor-move"
							onPointerDown={(e) => beginDrag(e, "move")}
						/>
						<div className="absolute -left-1 -top-6 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white pointer-events-none whitespace-nowrap">
							{rect.width} × {rect.height}
						</div>
					</div>

					{(
						[
							[
								"top",
								"h-[3px] -translate-y-1/2 cursor-ns-resize",
								{ left: rect.x, top: rect.y, width: rect.width },
							],
							[
								"bottom",
								"h-[3px] -translate-y-1/2 cursor-ns-resize",
								{ left: rect.x, top: rect.y + rect.height, width: rect.width },
							],
							[
								"left",
								"w-[3px] -translate-x-1/2 cursor-ew-resize",
								{ left: rect.x, top: rect.y, height: rect.height },
							],
							[
								"right",
								"w-[3px] -translate-x-1/2 cursor-ew-resize",
								{ left: rect.x + rect.width, top: rect.y, height: rect.height },
							],
						] as const
					).map(([mode, className, style]) => (
						<div
							key={mode}
							className={`absolute bg-[#34B27B] ${className}`}
							style={style}
							onPointerDown={(e) => beginDrag(e, mode)}
						/>
					))}

					{isSelected && (
						<div
							className="absolute flex gap-2"
							style={{
								left: rect.x + rect.width / 2,
								top: controlsBelow ? rect.y + rect.height + 10 : rect.y - 42,
								transform: "translateX(-50%)",
							}}
							onPointerDown={(e) => e.stopPropagation()}
						>
							<Button
								data-testid="region-selector-cancel-button"
								variant="ghost"
								onClick={() => window.close()}
								className="h-8 rounded-lg bg-black/70 px-4 text-[11px] text-zinc-300 backdrop-blur-sm transition-transform duration-150 hover:bg-black/80 hover:text-white active:scale-95"
							>
								{tc("actions.cancel")}
							</Button>
							<Button
								data-testid="region-selector-confirm-button"
								onClick={() => void confirmSelection()}
								className="h-8 rounded-lg bg-[#34B27B] px-4 text-[11px] font-semibold text-white transition-transform duration-150 hover:bg-[#34B27B]/85 active:scale-95"
							>
								{t("regionSelector.confirm")}
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
