---
name: g2_reference
description: Authoritative deep-reference for Even Realities G2 glass apps — architecture, display canvas, container model, page lifecycle, input events, device APIs, error codes, UI patterns, simulator, and packaging. Use BEFORE writing or modifying any glass-side feature (UI containers, events, lifecycle calls, image rendering, audio, storage, packaging). Distilled from the community even-g2-notes reference and cross-checked with the official Even Hub docs.
---

# G2 Reference Skill

Always consult this skill before:
- adding/changing any container layout (`createStartUpPageContainer`, `rebuildPageContainer`, `textContainerUpgrade`, `updateImageRawData`)
- handling input events (`onEvenHubEvent`, list/text/sys events)
- adding device APIs (audio, IMU, device/user info, SDK storage)
- packaging or simulator setup

Sources (refreshed 2026-05-26):
- https://github.com/nickustinov/even-g2-notes/tree/main/docs (README, architecture, display, input-events, page-lifecycle, device-apis, error-codes, ui-patterns, browser-ui, simulator, packaging)
- Cross-references: https://hub.evenrealities.com/docs

## 1. Architecture
- G2 = dual micro-LED glasses (576×288 per eye, 4-bit greyscale green), no camera, no speaker. R1 ring = separate BLE input device.
- Data flow: `Your server <-HTTPS-> iPhone WebView <-BLE-> G2 Glasses`. iPhone is a transparent relay; no logic runs on glasses.
- Bridge injected into WebView via Flutter (`flutter_inappwebview`). Use `await waitForEvenAppBridge()` (preferred) or `EvenAppBridge.getInstance()` after init.
- Auto-connect: ALWAYS call `bridge.connect()` on page load — never gate behind a user button. Keep a manual button as fallback only.
- DO NOT use browser `localStorage` for persistence — wiped on `.ehpk` restart. Use `bridge.setLocalStorage` / `bridge.getLocalStorage` (see §5).

## 2. Display & Container Model
- Canvas: 576×288, origin top-left, X right, Y down.
- Per page: max **4 image** + **8 other** containers (12 total mixed).
- Exactly **one** container must have `isEventCapture: 1`.
- Set `containerTotalNum` to actual count; mismatch breaks.
- No flexbox, no CSS, no z-index — only declaration order (later = on top).

Shared container props:
| Prop | Range | Notes |
|---|---|---|
| xPosition / yPosition | 0..576 / 0..288 | absolute pixels |
| width / height | 0..576 / 0..288 (images: 20..288 / 20..144) | |
| containerID | unique per page | used for updates |
| containerName | ≤16 chars, unique | used for updates |
| isEventCapture | 0 or 1 | exactly one =1 |
| borderWidth | 0..5 | list/text only, not image |
| borderColor | 0..15 list / 0..16 text | greyscale; 5=subtle, 13=bright |
| borderRadius | 0..10 | |
| paddingLength | 0..32 | uniform |

### Text containers
- Plain text, left/top aligned, single fixed font, no size/weight/style.
- Limits: `createStartUpPageContainer` 1000 chars; `rebuildPageContainer` 1000 chars; `textContainerUpgrade` 2000 chars.
- Internal scroll only when container has `isEventCapture: 1`. Boundary scroll events emit at top/bottom.
- Use `\n` for line breaks. Center text by manual space padding.
- Full-screen text capacity ~400–500 chars depending on glyph widths.

### List containers
- Native scroll widget, firmware tracks selection. Max 20 items, each ≤64 chars, single line, no per-item styling.
- `itemContainer`: `itemCount` (must match `itemName.length`), `itemWidth` (0=auto), `isItemSelectBorderEn`, `itemName[]`.
- Clicks emit `listEvent.currentSelectItemIndex` + `currentSelectItemName`.
- Scroll gestures are consumed natively → only boundary `SCROLL_TOP_EVENT`/`SCROLL_BOTTOM_EVENT` emitted as `listEvent`.
- Cannot mutate items in place → must `rebuildPageContainer` to refresh.

### Image containers
- Width 20..288, height 20..144. 4-bit greyscale (16 levels). Black = off (best for OLED).
- Single image max 288×144. To cover full canvas: tile (e.g. 2×2 of 288×144).
- Send PNG bytes as `number[]`, base64, `Uint8Array`, or `ArrayBuffer`. Match image size to container to avoid tiling.
- `updateImageRawData` is sequential — never run concurrently.
- During startup: containers are empty placeholders. Push image AFTER `createStartUpPageContainer`.
- DO NOT 1-bit dither in app; host does better 4-bit downsampling.
- Encode with BT.601 luminance (`0.299R + 0.587G + 0.114B`).

### Font & Unicode
- Single LVGL font, proportional. Unsupported glyphs silently skipped.
- Monospace workaround: use CJK fullwidth characters (`\u3000` space, U+FF21..FF5A letters, U+FF10..FF19 digits).
- Useful glyphs verified working: arrows `←↑→↓↔↕↖↗↘↙⇒⇔`, box-drawing `─━│┃┌┐└┘├┤┬┴┼╭╮╯╰═`, blocks `█▇▆▅▄▃▂▁▒`, shapes `●○■□▲△▶▼◆◇★☆`.
- MISSING: dashed/dotted box chars (U+2504..250B), most double-line chars, light/dark shades `░▓`, quadrant blocks `▖–▟`, weather/hazard/face symbols, all Dingbats and Emoji.
- Scrollbar bug: trailing `\n` after grid pushes content past height → strip trailing newline.

## 3. Page Lifecycle
- `createStartUpPageContainer(payload)` — call **exactly once** at app start. Returns `StartUpPageCreateResult`: 0=success, 1=invalid, 2=oversize, 3=outOfMemory.
- `rebuildPageContainer(payload)` — full screen replacement, resets internal scroll, brief hardware flicker.
- `textContainerUpgrade({containerID, containerName, contentOffset?, contentLength?, content})` — partial in-place text update, flicker-free on hardware, redraws in simulator.
- `updateImageRawData({containerID, containerName, imageData})` — sequential only.
- `shutDownPageContainer(0)` immediate exit, `shutDownPageContainer(1)` exit dialog.
- `callEvenApp(methodName, params?)` — generic escape hatch (see `EvenAppMethod` enum).
- **SUBMISSION REQUIREMENT**: On the root/home screen, a `DOUBLE_CLICK_EVENT` MUST call `shutDownPageContainer(1)`. Non-root screens use double-tap as "go back". Even Hub QA rejects apps that violate this. `even-toolkit`'s `useGlasses` handles this via `shutdownOnHomeBack: true` (default).

## 4. Input Events
`OsEventTypeList`:
| Name | Value | Trigger |
|---|---|---|
| CLICK_EVENT | 0 | Ring tap / temple tap |
| SCROLL_TOP_EVENT | 1 | Internal scroll hit top |
| SCROLL_BOTTOM_EVENT | 2 | Internal scroll hit bottom |
| DOUBLE_CLICK_EVENT | 3 | Ring/temple double-tap |
| FOREGROUND_ENTER_EVENT | 4 | App foregrounded |
| FOREGROUND_EXIT_EVENT | 5 | App backgrounded |
| ABNORMAL_EXIT_EVENT | 6 | Unexpected disconnect |

Delivery: `bridge.onEvenHubEvent(cb)` → `{ listEvent?, textEvent?, sysEvent?, audioEvent?, jsonData? }`.
- `listEvent`: `containerID`, `containerName`, `currentSelectItemIndex`, `currentSelectItemName`, `eventType`
- `textEvent` / `sysEvent`: `containerID?`, `containerName?`, `eventType`

### Critical quirks
1. `CLICK_EVENT = 0` is often serialised as `undefined`. Treat `eventType === undefined` as Click. (`even-toolkit/action-map` handles this.)
2. Simulator may omit `currentSelectItemIndex` for index 0 — keep your own `selectedIndex` in state.
3. Event source depends on which container has `isEventCapture: 1` (list → `listEvent`, text → `textEvent`, simulator clicks → `sysEvent`). Handle all three.
4. Throttle/debounce scroll events (~300ms) to avoid duplicate actions.
5. Root-page double-tap MUST exit (see §3).

## 5. Device APIs
- **Audio**: `audioControl(true/false)`. Requires startup page first. PCM arrives as `audioEvent.audioPcm` (Uint8Array): 16kHz, 10ms frames, 40 bytes/frame, PCM S16LE mono.
- **Device info**: `getDeviceInfo()` → `{ model, sn, status: { connectType, batteryLevel, isWearing, isCharging, isInCase } }`. Subscribe via `onDeviceStatusChanged(cb)`.
- **User info**: `getUserInfo()` → `{ uid, name, avatar, country }`.
- **SDK storage**: `setLocalStorage(key, value)` / `getLocalStorage(key)`. ONLY persistent option. No `removeLocalStorage` — write `''` to delete.
  - Recommended: warm an in-memory `Map` cache at startup, sync read from cache, write-through async to bridge.
- **NOT exposed**: direct BLE, pixel drawing, `imgEvent`, audio output, text alignment, font controls, container background fills, per-item list styling, scroll offset getters, animations.

## 6. Error Codes
- Startup: `0 success / 1 invalid / 2 oversize / 3 outOfMemory`.
- Rebuild / text upgrade / shutdown: boolean.
- Image update (`ImageRawDataUpdateResult`): `success / imageException / imageSizeInvalid / imageToGray4Failed / sendFailed`.
- SDK accepts camelCase, PascalCase, and proto-style `Container_ID` keys via `pickLoose()`. Always emit camelCase from app code.

## 7. UI Patterns
- **Fake buttons**: prefix selected item with `>` and update via `textContainerUpgrade` — avoids list-widget scroll takeover.
- **Selection borders**: toggle `borderWidth` 0/1..3 across multiple text containers acting as rows.
- **Multi-slot text layout**: 3× text containers @ 96px each = 288px → list-like UI without native list.
- **Progress bars**: `'━'.repeat(n) + '─'.repeat(total - n)`.
- **Image-based apps**: place a full-screen invisible `text` container with `content: ' '` and `isEventCapture: 1` BEHIND image containers (lower containerID). Events arrive as `textEvent`.
- **Pagination**: pre-paginate to ~400–500 char pages at word boundaries; rebuild on scroll-top/bottom; show `pageIndex/totalPages`.

## 8. Simulator (`even-dev` / `@evenrealities/evenhub-simulator`)
- Limitations as of simulator 0.7.1: rejects pages with >4 containers, no image containers >200×100. Real hardware (SDK ≥0.0.10) supports the full 4+8 / 288×144 limits.
- Always validate on real hardware before claiming feature support.
- Minimal app layout: `index.html`, `package.json`, `vite.config.ts`, `app.json`, `src/main.ts`.
- Run via `even-dev` (`./start-even.sh` or `APP_NAME=<name> ./start-even.sh`) or your own `npm run dev` (`vite --host 0.0.0.0 --port 5173`).
- Sim sends `sysEvent` for clicks where hardware emits `textEvent`/`listEvent` — keep mapper tolerant.

## 9. Packaging (`@evenrealities/evenhub-cli`)
Commands: `evenhub login`, `evenhub init`, `evenhub qr`, `evenhub pack <json> <project>`.
- `evenhub qr --url "http://<lan-ip>:5173"` (use LAN IP, not localhost) — generates pairing QR.
- `evenhub pack app.json dist -o myapp.ehpk` — packages built output.

### `app.json` manifest essentials
```json
{
  "package_id": "com.example.myapp",
  "edition": "202601",
  "name": "My app",
  "version": "1.0.0",
  "min_app_version": "0.1.0",
  "tagline": "Short tagline",
  "description": "Longer description",
  "author": "Your Name",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["api.example.com"],
    "fs": ["./assets"]
  }
}
```
- `package_id`: reverse-domain, lowercase, no hyphens, each segment starts with letter.
- `permissions.network`: list domains explicitly. Use `["*"]` for user-configured servers.
- Add `*.ehpk` to `.gitignore`.

Recommended npm scripts:
```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "vite build",
    "qr": "evenhub qr --http --port 5173",
    "pack": "npm run build && evenhub pack app.json dist -o myapp.ehpk"
  }
}
```

## 10. Quick Checklist Before Shipping
- [ ] `createStartUpPageContainer` called exactly once, success result checked.
- [ ] Exactly one container with `isEventCapture: 1` per page.
- [ ] Root-screen double-tap → `shutDownPageContainer(1)`.
- [ ] Event mapper handles `eventType === undefined` as Click and tolerates missing `currentSelectItemIndex`.
- [ ] Persistence via `bridge.setLocalStorage` (never browser localStorage).
- [ ] Image updates queued sequentially, dimensions match container.
- [ ] Container counts ≤ 4 image + 8 other; `containerTotalNum` matches.
- [ ] `app.json` valid (package_id, permissions.network).
- [ ] Tested in simulator AND, where features exceed simulator limits, also on hardware.
