# CrossStore website

CrossStore introduction and browser firmware installer at **https://crossstore.github.io/**.

This is the organization homepage. The existing application catalog remains at **https://crossstore.github.io/CrossStore/index.json**, deployed independently from [CrossStore/CrossStore](https://github.com/CrossStore/CrossStore).

## Develop

```sh
npm ci
npm test
npm run build
npm run serve
```

Open http://localhost:4173 in a desktop Chromium browser. Web Serial requires HTTPS or localhost. No server or analytics is used. ESP Web Tools and its dependencies are bundled locally; firmware is served from the same origin.

`FIRMWARE_CACHE_DIR=/path/to/release-assets npm run build` can reuse existing downloads. Every cached or downloaded file is verified against the pinned size and SHA-256. A bad cache is rejected, not silently accepted. The build downloads all assets in `firmware-release.json`; retrying with the default cache avoids downloading already verified files again.

## Firmware policy

- Thirteen firmware images cover fifteen integrated CrossMux models (X3/X4 share an image). PaperMono, PaperS3 and Waveshare 3.97 have prior maintainer hardware records. Original M5Paper has a basic record; its shared v1.1 image and the nine remaining targets retain Alpha labels, with the per-revision limits shown explicitly. Release manifests and the site validate this status. Ink4 Plus with ML307 is listed separately as pending adaptation, without a flashable image: its S31 platform and cellular network backend are not implemented in this fork.
- Original M5Paper and v1.1 share one classic ESP32 image, X3/X4 share a C3 image, the remaining flashable targets use S3. All have 16 MiB Flash. M5Paper retains 40 MHz with its bootloader at 0x1000; C3/S3 use 80 MHz with the bootloader at 0x0. Every merged image flashes at 0x0. Chip checks cannot distinguish different boards sharing a chip: users must select the exact model.
- A per-model issue link opens the fork's public Issues page with model, validation state, firmware version, source/SDK SHAs and release URL prefilled.
- The flasher starts with brand selection only, with no default brand or All option. Choosing a brand reveals its models and pending adaptations; choosing a model reveals confirmation and downloads. Brand buttons wrap on narrow screens. Counts include flashable images. Switching brands clears any previous model, confirmation, prepared image and in-flight download. Brand and model selection are disabled during USB flashing.
- `firmware-release.json` pins public release URLs, source / SDK commits, sizes and hashes. Updating this file is a reviewed source change, not a dynamic “latest” fetch.
- Build verification cross-checks original install manifests, all part hashes, offsets, board IDs, flash size and source commits. Each full image must contain the exact release bootloader, partitions, OTA initialization data and application. Image headers are left unchanged.
- Browser download is verified again with SHA-256 before a Blob URL can reach the flash transport. Selection or confirmation changes invalidate prepared images; obsolete downloads cannot re-enable flashing.
- Web flashing is **full installation at offset 0**, with explicit whole-chip erase. It replaces firmware, partitions and internal settings. TF cards are not flashed. Existing device settings are not preserved.
- Application-only binaries are offered separately for compatible existing layouts. They are not used by this web flasher: blindly writing an app at 0x10000 can conflict with an active OTA slot.
- ESP Web Tools 10.4.0 supplies the flash transport. Its UI is replaced by this site's Chinese confirmation and progress controls. No automatic device access occurs. USB selection requires a separate user gesture after firmware verification.
- Download integrity is checked; the page does not claim an independent post-write readback verification. Actual flash behavior must be verified on hardware before making a web-flasher hardware acceptance claim.
- Previously tested device functionality is distinct from acceptance of every published binary. Current UI describes the release as a development preview, not official CrossMux firmware.

## Deployment

GitHub Pages must be enabled with **Source: GitHub Actions**. Pushing `main` runs integrity tests, downloads and verifies the pinned release, builds the site, then deploys `dist/` through the Pages workflow. PRs build and test without deploying. Binaries and `dist/` are not committed.

## Upstream status

[CrossMux issue #433](https://github.com/0x1abin/crossmux/issues/433) proposes optional Lua app-store support and asks whether maintainers welcome a PR. As checked on 2026-10-25, no implementation PR has been submitted or merged. Update the page when the actual status changes.

## Credits

Website source: MIT. Application artwork is copied from CrossStore; its original license is preserved in `public/CROSSSTORE-LICENSE.txt`. Dependency licenses are copied into the deployed `licenses/` folder. See `public/credits.html`.

The screenshot gallery preserves original pixels. `public/screenshots/provenance.json` records each file's origin type, capture date, dimensions and hash. PaperMono application permissions and Waveshare AirTune are device framebuffer captures; 2048 and Gomoku are host previews rendered from actual Lua drawing commands, with approximate desktop typography. The page labels these separately.

Original M5Paper basic display, touch, wheel, TF read/write, reading progress and one captured sleep/resume have passed. The shared original/v1.1 image remains Alpha: v1.1 has no physical test record, and extended original-device acceptance is pending. The card and issue template distinguish those revision-level records. The release manifest must explicitly list both `m5paper_v10` and `m5paper_v11` before the site offers this shared image.
