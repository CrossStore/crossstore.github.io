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

Open http://localhost:4173 (中文) or http://localhost:4173/en/ (English) in a desktop Chromium browser. Web Serial requires HTTPS or localhost. No server or analytics is used. ESP Web Tools and its dependencies are bundled locally; firmware is served from the same origin.

`FIRMWARE_CACHE_DIR=/path/to/release-assets npm run build` can reuse existing downloads. Every cached or downloaded file is verified against the pinned size and SHA-256. A bad cache is rejected, not silently accepted. The build downloads the selected device assets from `firmware-release.json`; retrying with the default cache avoids downloading already verified files again.

## Firmware policy

- The homepage focuses on personal book discovery, built-in apps automatically selected for the hardware, user-managed permissions and customizable main navigation. See [homepage design and data sources](docs/homepage-design.md).
- Current test devices: PaperS3, PaperMono and Ink4 Plus. The public installer offers the two matching pinned PaperS3/PaperMono images. Ink4 Plus is shown as testing, with public firmware pending and no flash button.
- The upcoming built-in app model and new bookshop/menu features are previewed separately from the older pinned download. A new public firmware release must be reviewed before replacing that boundary.
- The archived release metadata covers 13 images; the site build verifies and publishes only the curated two sets, cleaning stale firmware output. The full inventory remains tested for integrity, without adding old models back to the homepage.
- A per-model issue link includes the selected model, firmware version and source revisions. Brand/model changes clear confirmation and prepared downloads. Selection is locked during flashing.
- `firmware-release.json` pins public release URLs, source / SDK commits, sizes and hashes. Updating this file is a reviewed source change, not a dynamic “latest” fetch.
- Build verification cross-checks original install manifests, all part hashes, offsets, board IDs, flash size and source commits. Each full image must contain the exact release bootloader, partitions, OTA initialization data and application. Image headers are left unchanged.
- Browser download is verified again with SHA-256 before a Blob URL can reach the flash transport. Selection or confirmation changes invalidate prepared images; obsolete downloads cannot re-enable flashing.
- Web flashing is **full installation at offset 0**, with explicit whole-chip erase. It replaces firmware, partitions and internal settings. TF cards are not flashed. Existing device settings are not preserved.
- Application-only binaries are offered separately for compatible existing layouts. They are not used by this web flasher: blindly writing an app at 0x10000 can conflict with an active OTA slot.
- ESP Web Tools 10.4.0 supplies the flash transport. Its UI is replaced by this site's localized confirmation and progress controls. No automatic device access occurs. USB selection requires a separate user gesture after firmware verification.
- Download integrity is checked; the page does not claim an independent post-write readback verification. Actual flash behavior must be verified on hardware before making a web-flasher hardware acceptance claim.
- Previously tested device functionality is distinct from acceptance of every published binary. Current UI describes the release as a development preview.

## Deployment

GitHub Pages must be enabled with **Source: GitHub Actions**. Pushing `main` runs integrity tests, downloads and verifies the pinned release, builds the site, then deploys `dist/` through the Pages workflow. PRs build and test without deploying. Binaries and `dist/` are not committed.

## Design and localization

The complete website follows the selected Silver Light direction: a charcoal
photographic opening, white editorial pages, serif English headings, clean system-font Chinese and 16 neutral color
tokens. The homepage and credits are rendered as static Chinese and English
pages; `src/messages.json` is the shared translation source for templates and
runtime feedback. Language switching preserves the section anchor and remembers
an explicit preference when local storage is available. Both locales remain
readable without JavaScript.

Nineteen flat app icons follow the firmware's Phosphor Bold proportions. Run
`node scripts/app-icons.mjs` to regenerate the SVGs (the normal build does this
automatically). See [icon sources and drawing rules](assets/icon-sources/README.md).
The self-hosted serif font subset is checked in, so CI needs no font tool. Optional
regeneration uses `scripts/subset-font.py` with fontTools and the original font.

Browser checks: use the task's headless Playwright CLI session to run
`scripts/browser-checks.js` and `scripts/browser-i18n-checks.js` against port 4173.
Close that session when finished. These checks mock the USB chooser and must not
flash physical hardware. See [validation](docs/validation.md).

## Credits

Website source: MIT. Application artwork is copied from CrossStore; its original license is preserved in `public/CROSSSTORE-LICENSE.txt`. Dependency licenses are copied into the deployed `licenses/` folder. Bilingual credits are built from `src/credits.html`.

The homepage uses the new flat SVG app family, local book thumbnails and the same Phosphor system icons as the device UI. Phosphor’s MIT license and Source Han Serif’s OFL are included. The generated editorial photo is stored with its prompt and source image in `assets/`. The older screenshot archive retains its original pixels and `public/screenshots/provenance.json` for reference, but is no longer featured on the homepage.
