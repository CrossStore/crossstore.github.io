# Initial website validation — 2026-10-25

Firmware source: `4fb25658b31c01b03dc5df1bf1558f3db15fa2f3`; FreeInk SDK: `7e9c49b0918fe83a12b96fbb3a260ab831c2a989`.

- Six Node tests passed: pinned release coverage; hostile metadata rejection; truncation / SHA-256 failure; merged-image contents; board, offset, flash-size and source mismatch rejection; verified-Blob-only web manifests.
- Production build verified all 22 published assets and the three complete images against their original install manifests. No firmware was rebuilt or modified for this website.
- Headless Chromium exercised the actual bundled page: all three real firmware downloads and browser SHA-256 checks, mandatory confirmation, cancellation of the serial chooser, invalidation on model / confirmation change, corrupted firmware rejection and stale-request handling.
- Web Serial was mocked only at the port chooser, which returned a cancellation. No hardware was accessed or flashed. A separate unsupported-browser context checked that manual downloads remain available and flashing remains disabled.
- Layout checks passed at 320, 390, 768, 1024 and 1440 CSS pixels with no horizontal overflow. Desktop and mobile screenshots were visually inspected. All application images loaded; no uncaught page errors occurred.
- Reusable browser checks are in `scripts/browser-checks.js`, a function for Playwright CLI `run-code` with the preview at `http://localhost:4173`. They intentionally do not open a physical port. Screenshots and browser logs belong in ignored `output/playwright/`.

The website's USB flashing path still needs a real-device acceptance run for each exact model. Existing firmware / device acceptance does not substitute for testing the new browser transport, and the page does not claim otherwise.
