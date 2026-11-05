# Initial website validation — 2026-10-25

Firmware source: `4fb25658b31c01b03dc5df1bf1558f3db15fa2f3`; FreeInk SDK: `7e9c49b0918fe83a12b96fbb3a260ab831c2a989`.

- Six Node tests passed: pinned release coverage; hostile metadata rejection; truncation / SHA-256 failure; merged-image contents; board, offset, flash-size and source mismatch rejection; verified-Blob-only web manifests.
- Production build verified all 22 published assets and the three complete images against their original install manifests. No firmware was rebuilt or modified for this website.
- Headless Chromium exercised the actual bundled page: all three real firmware downloads and browser SHA-256 checks, mandatory confirmation, cancellation of the serial chooser, invalidation on model / confirmation change, corrupted firmware rejection and stale-request handling.
- Web Serial was mocked only at the port chooser, which returned a cancellation. No hardware was accessed or flashed. A separate unsupported-browser context checked that manual downloads remain available and flashing remains disabled.
- Layout checks passed at 320, 390, 768, 1024 and 1440 CSS pixels with no horizontal overflow. Desktop and mobile screenshots were visually inspected. All application images loaded; no uncaught page errors occurred.
- Reusable browser checks are in `scripts/browser-checks.js`, a function for Playwright CLI `run-code` with the preview at `http://localhost:4173`. They intentionally do not open a physical port. Screenshots and browser logs belong in ignored `output/playwright/`.

The website's USB flashing path still needs a real-device acceptance run for each exact model. Existing firmware / device acceptance does not substitute for testing the new browser transport, and the page does not claim otherwise.

## Homepage refresh — 2026-11-05

- `npm test`: 14 tests passed. New cases exercise hardware exclusion, the
  intersection of capability and permission filters, optional camera permissions,
  offline recommendations and known permission metadata. Existing firmware
  integrity and board/offset protections remain covered.
- `npm run build`: passed, verifying both curated device image sets against the
  pinned manifests and hashes. Old device output is removed from `dist/firmware`;
  no firmware images were rebuilt or altered.
- Headless Chromium: book preference switching; recommendation expansion and
  collapse; model/capability/permission intersections; empty state/reset; menu
  add/reorder/remove/reset, five-entry limit and one-entry minimum all passed.
- Both real local firmware downloads passed browser SHA-256 checks. Explicit
  confirmation, canceled serial chooser, byte-tamper rejection, stale download
  cancellation, brand changes and unsupported-browser manual downloads passed.
  The chooser was mocked; no physical USB port was opened or device flashed.
- Layouts at 320, 390, 768, 1024 and 1440 px passed overflow checks with collapsed
  and expanded model selection. All visible images loaded, with no uncaught page
  errors. Desktop/mobile and book-store/menu section screenshots were inspected.
- Visual evidence is in ignored `output/playwright/`: `home-desktop.png`,
  `home-mobile.png`, `desktop-verified.png`, `mobile-verified.png`, plus section
  captures. Reusable interaction checks are in `scripts/browser-checks.js`.
- New system features are labelled as a preview. The pinned 2026-10-26 release
  predates them, and no matching public Ink4 Plus artifact is implied.


## Silver Light, flat icons and English i18n — 2026-11-05

- `npm test`: 17 tests passed, including translation coverage, interpolation
  parity, English copy and locale-specific issue templates.
- `npm run build`: passed. Both locales and credits pages were rendered; the two
  firmware image sets were verified unchanged. No firmware source was modified.
- `scripts/browser-checks.js`: all Chinese book, recommendation, menu and firmware
  regression checks passed against the rebuilt site.
- `scripts/browser-i18n-checks.js`: English visible/accessibility text, book
  preference changes, expanded app names, permission counts, empty states, menu
  actions, issues, SHA-256 success/failure, HTTP failure and canceled USB selection
  passed. No physical serial port was opened. English manual downloads and disabled
  USB controls were checked in an unsupported-browser context.
- Locale preference, hash preservation, bilingual credits, blocked local storage
  and static English without JavaScript passed. No uncaught page errors occurred;
  the deliberately simulated HTTP 503 produces the expected browser request error.
- Chinese and English layouts were checked at 320, 390, 768, 1024 and 1440 px,
  including expanded device selection. No horizontal overflow was found.
- Desktop/mobile hero, apps, menu, complete page and 19-icon contact-sheet captures
  were visually inspected. The icon sheet includes actual 48 px and 24 px drawings
  alongside the firmware's system icons. Evidence is in `output/playwright/` and
  `output/app-icons/preview.png` (ignored local review artifacts).
- Browser validation is not a hardware flashing acceptance test. The pinned older
  release remains distinguished from new-feature previews and pending Ink4 Plus.


## Chinese typography — 2026-11-05

- Production build passed after separating the display-font token by locale.
- Headless Chromium confirmed unchanged English heading, wordmark, navigation,
  subtitle and app-name font families, sizes, weights, spacing and element heights
  against the pre-edit measurements at 1440 px.
- Chinese headings and UI use the system sans-serif stack. Desktop/mobile hero
  and app-list screenshots were visually inspected. Homepage widths 320, 390,
  768, 1024 and 1440 px, and credits at 320/1440 px, have no horizontal overflow.
- Review captures: `output/playwright/font-zh-after-hero.png`,
  `font-zh-after-mobile.png` and `font-zh-apps-mobile.png`.
