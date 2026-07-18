/**
 * Persistent border shown while a region recording is running. The hosting
 * BrowserWindow is positioned/inflated by the main process and excluded from
 * capture, so this only needs to draw the frame.
 */
export function RegionHighlight() {
	return (
		<div className="fixed inset-0 pointer-events-none p-[2px]">
			<div className="h-full w-full rounded-[3px] border-2 border-[#34B27B] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" />
		</div>
	);
}
