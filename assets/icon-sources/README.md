# CrossStore app icon family

The website uses 19 flat, monochrome SVG app icons. Source drawings are in
`scripts/app-icons.mjs`; `node scripts/app-icons.mjs` rebuilds
`public/assets/app-icons/` and its provenance manifest.

Style matches the firmware's INX Phosphor Bold family:

- 256 × 256 SVG canvas, primary strokes 24 units, rounded caps and joins.
- Interior details use 16 units; 2048 numerals use 12 to retain open counters.
- Transparent background, no material texture, drop shadow, gradient or raised tile.
- Standard icons are unmodified Phosphor Bold assets: radio, camera and calendar.
- Sixteen semantic drawings cover bookshop, WeRead, 2048, Gomoku, calculator,
  Sudoku, Chinese chess, Minesweeper, gallery, LoRa chat, Wi-Fi chat, near-field
  chat, wooden fish, library, standby and app store.
- Intended display sizes are 24–48 px. Match the rendered optical size to the
  system icon beside it. The website uses 30–40 px in app lists and 22–23 px
  in the menu editor/preview.
- IDs remain aligned with package names. `reading_stats` is the internal legacy
  ID; its visible name is 阅读日历 / Reading calendar.

Firmware reference: `crossmux/docs/engineering/ui-and-input.md:501` and
`crossmux/src/components/icons/phosphor.json`. Bold is the default system style;
Fill is reserved for selected main tabs. This website task does not change firmware
sources or the app packages' release artifacts.

Phosphor originals are vendored beside this file with their upstream MIT license.
CrossStore drawings use the website's MIT license. This family is not an official
Phosphor release and app symbols do not claim endorsement by app/service owners.
