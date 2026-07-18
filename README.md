> [!IMPORTANT]
> **This project is actively maintained.** The original OpenScreen repository was archived by its author in 2026. This repository picks up where it left off — I ([@kaili-yang](https://github.com/kaili-yang)) am continuing development and maintenance here, and new releases will be published from this repository going forward.

<p align="center">
  <img src="public/openscreen.png" alt="OpenScreen Logo" width="64" />
</p>

# <p align="center">OpenScreen</p>

<p align="center"><strong>OpenScreen is your free, open-source alternative to Screen Studio.</strong></p>

If you don't want to pay $29/month for Screen Studio but want a version that does what most people seem to need — quick, polished product demos and walkthroughs you'd post on X, Reddit or YouTube — OpenScreen covers most of the core functionality, fully free and open source.

**100% free** for both **personal** and **commercial** use. No paid tiers, premium features, upsells, or functionality locked behind a paywall.

<p align="center">
	<img src="public/demo.png" alt="" style="height: 0.2467; margin-right: 12px;" />
  <img src="public/sample.png" alt="" style="height: 0.2467; margin-right: 12px;" />
</p>

## What's new under active maintenance

Updates landed since this repository took over development:

- **macOS region recording** — select and record an arbitrary region of the screen, with a draggable/resizable selection overlay, instead of only full-screen or per-window capture.
- **Native cursor bitmap capture on macOS** — the real cursor shape, type, and clicks are captured natively (previously Windows-only), powering cursor themes, click effects, and the editable cursor overlay on Mac.
- Ongoing dependency upgrades, bug fixes, and review-driven cleanups across the capture pipeline.

## Roadmap

Planned next, roughly in order:

- [ ] **Region recording on Windows** — bring the new region capture to the Windows Graphics Capture pipeline for feature parity.
- [ ] **First release from this repository** — new signed installers (macOS `.dmg`, Windows `.exe`, Linux packages) published on this repo's Releases page.
- [ ] **Region recording on Linux** — region selection for the browser-based capture pipeline.
- [ ] **Electron and dependency upgrades** — keep the app on current Electron and patch known issues inherited from the upstream backlog.
- [ ] **Export improvements** — WebM export and finer control over bitrate/quality presets.
- [ ] **Editor performance** — faster timeline scrubbing and export on long recordings.

Have something you want prioritized? [Open an issue](../../issues) — the roadmap is driven by what people actually need.

## Contributing — maintainers wanted

This is a big app (Electron + React, with native Swift and Windows capture helpers) and I'm looking for people to help maintain and grow it. All skill levels welcome:

- **Code** — pick up a roadmap item above, grab an open issue, or fix a bug you've hit yourself. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and workflow.
- **Platform expertise** — especially wanted: Windows (WGC/native capture) and Linux (PipeWire) contributors, since my daily driver is macOS.
- **Translations** — the app ships in 13 languages; native speakers to review and extend translations are always welcome.
- **Testing & issues** — trying out builds on different OS versions and filing clear bug reports is genuinely valuable.

If you'd like to get involved beyond one-off PRs — triaging issues, reviewing, or co-maintaining — open an issue or reach out, and I'll happily hand out responsibility as trust builds.

## Core Features

- Record a specific window, your whole screen, or a selected region (macOS).
- Record microphone and system audio.
- Webcam overlay with picture-in-picture, drag-to-position, mirroring, and shape options.
- Auto or manual zooms with adjustable depth, duration, easing, and pixel-precise position; auto-zoom follows your cursor as you work.
- Custom cursor size, smoothing, and click effects, with cursor themes and post-recording path smoothing.
- Automatic captions for voiceovers, generated on-device with no upload (works offline).
- Wallpapers, solid colors, gradients, or your own background image.
- Motion blur.
- Crop, trim, and per-segment speed control on the timeline.
- Text, arrow, and image annotations, with text animation presets.
- Timeline snapping guides and an audio waveform to make trimming easier.
- Customizable keyboard shortcuts.
- Export to MP4 or GIF in multiple aspect ratios and resolutions.
- Languages supported: Arabic, English, Spanish, French, Italian, Japanese, Korean, Portuguese (Brazil), Russian, Turkish, Vietnamese, Simplified Chinese, and Traditional Chinese.

## Installation

New releases will be published on this repository's [Releases page](../../releases). Until the first release ships from here, the installers below come from the last upstream release (v1.5.0).

### macOS

The easiest way to install on macOS is via [Homebrew](https://brew.sh):

```bash
brew install --cask siddharthvaddem/openscreen/openscreen
```

Brew automatically picks the right build for Apple Silicon or Intel, and verifies the download against a notarized signature so Gatekeeper won't block it.

To update later: `brew upgrade --cask openscreen`
To uninstall: `brew uninstall --cask openscreen` (add `--zap` to also remove app data)

#### Manual install (if you prefer)

If you'd rather grab the `.dmg` directly from the Releases page and encounter Gatekeeper blocking the app, you can bypass it by running the following command in your terminal after installation:

```bash
xattr -rd com.apple.quarantine /Applications/Openscreen.app
```

Note: Give your terminal Full Disk Access in **System Settings > Privacy & Security** to grant you access and then run the above command.

After running this command, proceed to **System Preferences > Security & Privacy** to grant the necessary permissions for "screen recording" and "accessibility". Once permissions are granted, you can launch the app.

> [!NOTE]
> **Upgrading from an older version and hitting permission issues?** If you already had OpenScreen installed and the new version won't record (Screen Recording or Accessibility keep failing even after you grant them), uninstall the old version, remove OpenScreen's existing entries under **System Settings > Privacy & Security** (both Screen Recording and Accessibility), then do a fresh install and grant the permissions again when prompted.

### Windows

Install via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/):

```bash
winget install SiddharthVaddem.OpenScreen
```

To update later: `winget upgrade SiddharthVaddem.OpenScreen`
To uninstall: `winget uninstall SiddharthVaddem.OpenScreen`

If you'd rather grab the `.exe` installer directly, download it from the Releases page.

### Linux

Three packages are published for each version. Pick the one that matches your distro:

**Debian / Ubuntu / Pop!_OS (`.deb`)**
```bash
sudo apt install ./Openscreen-Linux-latest.deb
```

**Arch / Manjaro (`.pacman`)**
```bash
sudo pacman -U Openscreen-Linux-latest.pacman
```

**Any distro (`.AppImage`)**
```bash
chmod +x Openscreen-Linux-*.AppImage
./Openscreen-Linux-*.AppImage
```

**NixOS / Nix (flake)**

Try without installing:
```bash
nix run github:kaili-yang/openscreen
```

Install into your user profile:
```bash
nix profile install github:kaili-yang/openscreen
```

For a NixOS system config (flake):
```nix
{
  inputs.openscreen.url = "github:kaili-yang/openscreen";

  outputs = { nixpkgs, openscreen, ... }: {
    nixosConfigurations.<host> = nixpkgs.lib.nixosSystem {
      modules = [
        openscreen.nixosModules.default
        { programs.openscreen.enable = true; }
      ];
    };
  };
}
```

For Home Manager, use `openscreen.homeManagerModules.default` with the same `programs.openscreen.enable = true;`.

You may need to grant screen recording permissions depending on your desktop environment.

**Sandbox error:** If the AppImage fails to launch with a "sandbox" error, run it with `--no-sandbox`:
```bash
./Openscreen-Linux-*.AppImage --no-sandbox
```

### Platform differences

Everything in the editor and export is the same on macOS, Windows, and Linux: zooms, backgrounds, motion blur, crop/trim/speed, blur regions, annotations, auto-captions, projects, export, and all languages. The differences are in **capture**, where macOS and Windows use a native pipeline that Linux doesn't have:

- **Native recording**: macOS (ScreenCaptureKit) and Windows (Windows Graphics Capture) record through a native pipeline for higher quality and clean window-level capture. Linux records through the browser pipeline instead.
- **Region recording**: currently macOS only (Windows and Linux are on the roadmap).
- **Custom cursors**: on macOS and Windows the real cursor is captured (shape, type, and clicks), which powers the cursor themes, click effects, and editable cursor overlay. On Linux only the cursor position is captured (used for auto-zoom), so those cursor options aren't available.
- **Webcam**: captured natively on macOS and Windows; on Linux it's recorded through the browser, but still works as a picture-in-picture overlay.
- **System audio** support varies by OS:
  - **macOS**: requires macOS 13+. On macOS 14.2+ you'll be prompted to grant audio capture permission. macOS 12 and below can't capture system audio (mic still works).
  - **Windows**: works out of the box.
  - **Linux**: needs PipeWire (default on Ubuntu 22.04+, Fedora 34+). Older PulseAudio-only setups may not capture system audio (mic should still work).

---

## License

This project is licensed under the [MIT License](./LICENSE). By using this software, you agree that the authors are not liable for any issues, damages, or claims arising from its use.
