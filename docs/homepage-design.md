# Homepage refresh — 2026-11-05

The homepage introduces CrossStore through personal book discovery, applications,
and a configurable main menu. CrossMux attribution remains in the footer and
credits; upstream issue/PR status is no longer product content.

The design uses 16 neutral tokens (`#000000` through `#ffffff` in steps of 17),
a silver-gelatin editorial photograph, book covers, Phosphor system icons and a new flat SVG app icon family. Typography
antialiasing and browser image scaling can introduce intermediate display values;
this is a design palette, not a claim that the browser output is a 4-bit framebuffer.
All assets, including the editorial serif font subset, are hosted locally with no CDN or remote font dependency. Existing screenshot archives
retain their original pixels and provenance but are not used in the new homepage.

## Content evidence

- CrossMux `docs/engineering/book-store.md`: local preferences, curated candidates,
  wish lists, category browsing and native store. The browser preview illustrates
  two explicit topic choices; it does not infer or store visitor reading history.
- CrossMux `src/activities/MainTab.h` and
  `src/activities/settings/BottomMenuSettingsActivity.cpp`: one to five entries,
  move/add/remove, built-in entries and installed applications. The web preview
  starts from the current four-entry default and stays in page memory.
- `src/catalog.json` is a curated metadata snapshot of the corresponding
  `CrossStore/packages/*/manifest.json` files, taken on 2026-11-05. Catalog names,
  `requires`, permissions and source links are copied together. The website display
  name for `reading_stats` is 阅读日历 / Reading Calendar. New SVG icon IDs match the package IDs; `scripts/app-icons.mjs` is their source. Refresh metadata and translations together when the app manifests change. The new snapshot includes development packages, and is not
  a promise that all are compatible with the pinned older firmware release.
- CrossMux `src/crossstore/Package.cpp` and `Permissions.h`: capability matching
  and optional-camera permission applicability. `src/discovery.js` holds curated
  profiles for the current development builds. Exact device detection and runtime
  permission enforcement remain on-device. A website choice does not grant rights.
- Book covers are the unmodified BMP thumbnails from
  `CrossStore/packages/book_store/assets/`, mapped to titles by `discovery.xml`.
  They illustrate existing catalog content; no EPUB is embedded or downloaded.
- System icons are the same Phosphor assets as the revised device UI, with the
  upstream MIT license preserved in `public/assets/ui/` and credits.

## Device presentation and release boundary

The public model selection contains PaperS3, PaperMono and Ink4 Plus, as requested
by the maintainer. Future expansion is internally limited to touch devices with
4/16 gray levels and a density above 200 DPI. Do not display these admission rules
or a high-end/low-end ranking on the website. The current three-device list is
curated; do not infer new eligibility from old firmware inventory alone.

Only PaperS3 and PaperMono have matching images in the current pinned release.
Ink4 Plus is a current test device, with its public firmware pending; it has no
flashable selection. New book store and menu features are labelled as a new-version
preview, and the download section explicitly distinguishes the older public build.
No local firmware build is silently promoted to a public release.

The archived 13-image inventory and integrity tests remain available internally.
The website build publishes only the two curated firmware sets and removes stale
firmware output before populating them. The pinned `firmware-release.json` remains
an immutable upstream inventory, with original GitHub asset URLs. Retained direct
links to older releases do not add their devices to public model choices.

## Interaction contracts

Recommendations are the intersection of the model's required capabilities,
selected capability, and allowed applicable permissions. Unknown devices return no
results. Denying an optional camera permission on a camera-free model does not hide
its LoRa chat. Choosing an unsupported capability shows an empty state; reset
preserves the chosen model and restores capability/permission choices. Counts show
all apps → model-compatible apps → final recommendations. Eight representative
results are initially visible; expand/collapse exposes the rest without changing
filters. Each new filter selection restores the compact view.

Main-menu order drives both editor and preview. There are no duplicates, at least
one entry remains, and five is the maximum. Keyboard focus is restored to a useful
control after reordering/removal. Reduced-motion preference disables smooth scroll.

The original flasher's explicit erase acknowledgement, size/hash verification,
separate USB gesture, cancellation, stale-request guard and unsupported-browser
manual download path are preserved. Browser QA must never flash physical devices.


## Silver Light visual direction

The selected concept is `exec-a01a828c-3d1c-41d8-90ea-e2fd29f33ef3.png`.
Live headings, navigation and controls are HTML, not baked into an image.
`assets/editorial-hero-prompt.txt` records the prompt for the separate production
hero; `assets/editorial-hero-original.png` preserves the imagegen original.
The deployed JPEG is `public/assets/editorial/silver-light.jpg` (1942 × 809,
about 362 KB). The photograph is an imagined reading scene, not a product photo
of a supported model. Its caption identifies it as illustrative. Mobile overlays
keep the live text readable across the crop.

Typography uses a renamed Source Han Serif subset, “CrossStore Editorial”, for
the English headings and the CrossStore wordmark. Chinese text now uses a consistent system sans-serif stack (PingFang SC first, then Hiragino Sans GB / Microsoft YaHei / Noto Sans CJK SC), with natural character spacing and medium-weight interface labels. Upstream: https://github.com/adobe-fonts/source-han-serif
(release `OTF/SimplifiedChinese/SourceHanSerifSC-Regular.otf`). Source Han Serif is
licensed under the OFL; the license is deployed alongside the 206 KB WOFF2 subset.
`scripts/subset-font.py` subsets the complete message catalog and ASCII, removes
hinting and renames the modified font. Regular site builds use the checked-in font.
If English editorial text introduces characters outside the subset, regenerate it before release; Chinese uses the system font.

The nineteen app icons use a transparent background, a 256-unit grid and Bold
strokes with round joins. There are no shadows, textures or raised icon tiles.
Radio, camera and calendar reuse the exact firmware Phosphor Bold sources;
sixteen app-specific drawings use the same proportions. Source files and license
notes are in `assets/icon-sources/`; generated SVGs and per-icon provenance are in
`public/assets/app-icons/`. Older PNG artwork is retained as an unused archive.

## Internationalization

The build produces `/`, `/en/`, `/credits.html` and `/en/credits.html` from shared
templates and `src/messages.json`. Each page has a correct document language;
homepages also carry localized metadata and canonical/alternate links. Runtime
labels, empty states, book metadata, menu announcements, accessible names,
permission names, firmware status/errors and issue report templates are localized.
Internal app IDs such as `reading_stats` are stable, while visible copy says
阅读日历 / Reading calendar.

Locale links preserve section anchors. Explicit selection is remembered locally;
Chinese entry URLs redirect to their English equivalent when English was chosen.
A blocked storage API does not disable the links. There is no browser-language
assumption and the static localized content works without JavaScript. Actual book
cover artwork retains its original Chinese publication lettering in both locales.


### Chinese typography adjustment — 2026-11-05

The previous serif treatment was applied to Chinese navigation, controls, app
names and large headings alike. After review, Chinese now uses a shared system
sans-serif family and zero extra character spacing in titles and the hero. A
separate `--display` token keeps English editorial headings and the serif wordmark
unchanged. The photograph, grayscale palette, spacing and rules carry the reading
atmosphere without making small Chinese controls look like printed book titles.


## Deployment cache boundary

GitHub Pages serves static assets with a ten-minute cache lifetime. The production
build gives CSS, language preference code and the application entry bundle
content-derived filenames, shared by both locales and credits. Page templates
reference those names, so cached scripts/styles from a previous design cannot be
mixed with new HTML. The former `/assets/app.js` URL remains a compatibility alias
for cached HTML from the preceding release.
