---
name: even_agent
description: Use for EvenHub SDK, CLI, simulator, packaging, device API, storage, input event, audio, IMU, bridge lifecycle, and Even Realities app development guidance.
---

# EvenAgent

Purpose
- Provide authoritative guidance for EvenHub SDK, Simulator, and CLI usage.
- Translate user intent into correct bridge calls, container layouts, event mappings, and bridge lifecycle handling.

Sources (local copies)
- SDK types (authoritative): `daily-app/node_modules/@evenrealities/even_hub_sdk/dist/index.d.ts`
- SDK package metadata: `daily-app/node_modules/@evenrealities/even_hub_sdk/package.json`
- SDK README (EN): `daily-app/node_modules/@evenrealities/even_hub_sdk/README.md`
- SDK README (ZH, often fresher for version notes): `daily-app/node_modules/@evenrealities/even_hub_sdk/README.zh-CN.md`
- Current repo reference snapshot: `doc/evenhub-current-sdk-notes.md`
- Official docs index: https://hub.evenrealities.com/docs
- Official installation/version docs: https://hub.evenrealities.com/docs/getting-started/installation
- Official architecture docs: https://hub.evenrealities.com/docs/getting-started/architecture
- Official page lifecycle docs: https://hub.evenrealities.com/docs/guides/page-lifecycle
- Official display docs: https://hub.evenrealities.com/docs/guides/display
- Official input/events docs: https://hub.evenrealities.com/docs/guides/input-events
- Official device API docs: https://hub.evenrealities.com/docs/guides/device-apis
- Official networking docs: https://hub.evenrealities.com/docs/guides/networking
- Official headless testing docs: https://hub.evenrealities.com/docs/guides/headless-testing
- Official simulator docs: https://hub.evenrealities.com/docs/reference/simulator
- Official CLI docs: https://hub.evenrealities.com/docs/reference/cli
- Official packaging docs: https://hub.evenrealities.com/docs/reference/packaging
- Official Claude Code AI tooling docs: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/
- Official Claude Code skill catalog: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/skill-catalog
- Official AI skill repo: https://github.com/even-realities/everything-evenhub
- Official starter templates: https://github.com/even-realities/evenhub-templates
- G2 notes: https://raw.githubusercontent.com/nickustinov/even-g2-notes/main/G2.md
- CLI help: evenhub --help, evenhub qr --help (local package)
- Simulator README (global install): @evenrealities/evenhub-simulator
- EH-InNovel reference architecture:
  - `composeApp/src/webMain/kotlin/.../sdk/EvenHubBridge.kt`
  - `composeApp/src/webMain/kotlin/.../sdk/EvenHubTypes.kt`
  - `composeApp/src/webMain/kotlin/.../models/AppState.kt`

Official AI tooling snapshot
- The official Claude Code integration ships the `everything-evenhub` plugin with 13 EvenHub-focused skills:
  - One-click: `quickstart`, `template`, `build-and-deploy`
  - Core development: `glasses-ui`, `handle-input`, `device-features`, `background-state`, `test-with-simulator`, `simulator-automation`, `font-measurement`
  - Reference: `sdk-reference`, `cli-reference`, `design-guidelines`
- For new app scaffolding, map user intent to the official template families:
  - `minimal`: bare Vite + TypeScript + SDK + simulator
  - `asr`: microphone audio -> user-provided STT provider -> transcript UI
  - `image`: image container rendering, serial `updateImageRawData`, event-capture text layer
  - `text-heavy`: paginated long-form reader using `@evenrealities/pretext` and `textContainerUpgrade`
- Prefer `quickstart`/blank patterns for novel architecture and `template` patterns for known flows. Before adapting a template, read its own `README.md` and current `package.json`/`app.json`.
- Treat template dependencies as starter baselines, not local truth. Official installation docs and refreshed local package metadata win for Node/package versions.
- The catalog documents `background-state` via `setBackgroundState` and `onBackgroundRestore`; before implementing it in this repo, verify those exports exist in `daily-app/node_modules/@evenrealities/even_hub_sdk/dist/index.d.ts` or the installed runtime. Do not add direct calls if the local SDK does not export them.

Examples Apps
- https://github.com/nickustinov?tab=repositories
- https://github.com/nickustinov/even-dev
- https://github.com/nickustinov/even-dev/tree/main/apps/restapi

SDK truth hierarchy
- Resolve SDK behavior in this priority order:
  1. Updated local `dist/index.d.ts` after installing the target SDK version
  2. local SDK `package.json`
  3. official docs pages above
  4. README files
- If local `node_modules` is older than the official docs target, do not treat it as current API truth. Update dependencies first, then re-read `dist/index.d.ts`.
- The English README can lag on version details. Always verify version-sensitive claims in `index.d.ts`, package metadata, and the official installation page.

Current package targets
- Official installation page last updated 2026-04-22:
  - `@evenrealities/even_hub_sdk`: 0.0.10, published 2026-04-10
  - `@evenrealities/evenhub-simulator`: 0.7.2, published 2026-04-15
  - `@evenrealities/evenhub-cli`: 0.1.12, published 2026-04-16
- npm latest checked 2026-05-19:
  - `@evenrealities/even_hub_sdk`: 0.0.10
  - `@evenrealities/evenhub-simulator`: 0.7.3
  - `@evenrealities/evenhub-cli`: 0.1.13
- Local refresh commands:
  - `npm --prefix daily-app install @evenrealities/even_hub_sdk@^0.0.10`
  - `npm install -D @evenrealities/evenhub-cli@^0.1.13`
  - `npm install -g @evenrealities/evenhub-simulator@^0.7.3`
- For new manifests, prefer `min_sdk_version: "0.0.10"` per installation docs, then validate with `evenhub pack` and the developer portal.

Core SDK facts
- Use `waitForEvenAppBridge()` and wait for bridge ready before calls.
- Must-know APIs:
  - `getUserInfo`, `getDeviceInfo`, `onDeviceStatusChanged`
  - `createStartUpPageContainer`, `rebuildPageContainer`, `textContainerUpgrade`, `updateImageRawData`
  - `audioControl`, `imuControl`, `shutDownPageContainer`, `onEvenHubEvent`, `callEvenApp`
- Call `createStartUpPageContainer()` exactly once before other glasses UI operations.
- Latest SDK/display docs state: `containerTotalNum` is 1-12, `textObject` has max 8 entries, `imageObject` has max 4 entries, and exactly one container must have `isEventCapture=1`.
- If targeting older SDK/app versions, verify local types and firmware behavior; older docs/packages used a stricter 4-container total rule.
- Coordinate system: origin `(0,0)` top-left; X right; Y down.
- Canvas: 576 x 288 pixels per eye, rendered as 4-bit greyscale green.
- `TextContainerProperty` fields:
  - `xPosition`, `yPosition`, `width`, `height`
  - `containerID`, `containerName` (max 16 chars)
  - `content` (max 1000 chars)
  - `isEventCapture` (0 or 1)
- `TextContainerUpgrade` fields:
  - `containerID`, `containerName`
  - `contentOffset`, `contentLength`, `content` (max 2000 chars)
- After startup, use `rebuildPageContainer()` for page replacement and `textContainerUpgrade()` for text-only deltas.
- Startup result contract is `StartUpPageCreateResult`:
  - `0` success
  - `1` invalid
  - `2` oversize
  - `3` outOfMemory
- Image update contract is `ImageRawDataUpdateResult` (enum), not only boolean.
- Typing caveat: exported type is `ShutDownContaniner` (SDK typo), runtime method name is `shutDownPageContainer(...)`.
- Text/list/image limitations from current docs:
  - Text create/rebuild content max 1000 chars; `textContainerUpgrade` max 2000 chars.
  - List containers are natively scrollable, max 20 items, max 64 chars per item, no in-place update.
  - Image containers are 20-288 px wide and 20-144 px high; create placeholders first, then push image data sequentially.

Events and input mapping
- Listen via `onEvenHubEvent((event) => { ... })`.
- `event.listEvent`, `event.textEvent`, `event.sysEvent`, and `event.audioEvent` are supported branches.
- Latest docs add IMU reporting through `imuControl(isOpen, ImuReportPace)` and `sysEvent.imuData`; confirm exact typings in updated `dist/index.d.ts`.
- `imgEvent` is protocol-defined but not fully represented in SDK type definitions unless updated local types prove otherwise.
- `OsEventTypeList` enum:
  - `CLICK_EVENT = 0`
  - `SCROLL_TOP_EVENT = 1` (map to Up)
  - `SCROLL_BOTTOM_EVENT = 2` (map to Down)
  - `DOUBLE_CLICK_EVENT = 3` (map to Back inside app navigation; at root, ensure the system exit flow is reachable)
  - `FOREGROUND_ENTER_EVENT = 4`, `FOREGROUND_EXIT_EVENT = 5`, `ABNORMAL_EXIT_EVENT = 6`
  - Current docs also list `SYSTEM_EXIT_EVENT` and `IMU_DATA_REPORT`; verify values in updated local types.
- Input sources include G2 touchpads, optional R1 ring touchpads, and IMU. Newer event models expose source fields; use them only after verifying the updated SDK type.
- Audio data arrives as PCM 16 kHz signed 16-bit little-endian mono in `audioEvent.audioPcm`.
- Template event-routing pattern to preserve:
  - Protobuf may omit zero-valued `CLICK_EVENT`; coalesce event type with `?? 0` only where click is being compared.
  - Taps/double-taps/lifecycle usually arrive through `sysEvent`; scroll gestures for a text capture container arrive through `textEvent`; audio arrives through `audioEvent`.
  - DoubleClick should remain a root-level exit/back check across relevant event branches.

Simulator usage
- Run: `evenhub-simulator <targetUrl>`
- Use a network URL (not localhost) so simulator/device can reach the dev server.
- Simulator 0.7.3 supports:
  - `--automation-port <port>` HTTP control plane
  - `GET /api/ping`
  - `GET /api/screenshot/glasses` (576 x 288 RGBA PNG; test lit pixels with `alpha > 0`)
  - `GET /api/screenshot/webview`
  - `GET /api/console?since_id=N`
  - `DELETE /api/console`
  - `POST /api/input` with `click`, `double_click`, `up`, or `down`
- Wait for an app-ready log or first event-capturing container before sending simulator input; early input can be dropped.

CLI usage (QR)
- Generate QR for Even app:
  - `evenhub qr --url http://<ip>:<port>`
  - `evenhub qr --ip <ip> --port <port>`
- Use `--external` to open a separate QR window.
- `eh` is an alias for `evenhub`.
- Common CLI commands:
  - `evenhub login [-e email]`
  - `evenhub init [-d dir] [-o app.json]`
  - `evenhub qr --url "http://<lan-ip>:5173"`
  - `evenhub pack app.json dist -o myapp.ehpk [--no-ignore] [-c]`

Manifest and network notes
- Every packaged app needs `app.json`.
- Current edition: `"202601"`.
- Required fields include `package_id`, `edition`, `name`, `version`, `min_app_version`, `min_sdk_version`, `entrypoint`, `permissions`, and `supported_languages`.
- `permissions` is an array of objects, not a map.
- Network calls must pass both gates:
  - origin listed in `permissions[].whitelist`
  - normal browser CORS headers from the remote server
- The network whitelist is not a CORS bypass.

Guidance patterns
- If display is black, verify `createStartUpPageContainer()` payload fields and ranges.
- Ensure exactly one `isEventCapture=1` per rendered page.
- If navigation is required, use a stack and map DoubleClick to back.
- Use `callEvenApp(...)` fallback only when no typed SDK wrapper exists for the operation.
- Treat `audioControl(...)` and `shutDownPageContainer(...)` as startup-dependent operations.
- Treat `imuControl(...)` as startup-dependent until updated SDK docs/types show otherwise.
- Send `updateImageRawData(...)` sequentially only (no concurrent image pushes).
- Prefer explicit result-aware handling:
  - Startup: mark created state only on `StartUpPageCreateResult.success`
  - Image updates: branch behavior by `ImageRawDataUpdateResult`
- Use `bridge.setLocalStorage`/`bridge.getLocalStorage` for persisted user state across app restarts. Browser `localStorage`/IndexedDB is not reliable enough in the Even Hub WebView.
- For long text, prefer pixel-aware pagination (`@evenrealities/pretext` where available) and `textContainerUpgrade` for page turns.
- For image screens, create image placeholders first, use a full-screen text/list capture layer for input, and queue image pushes serially.

Testing requirements
- For every EvenHub-related code change, add/update automated tests for:
  - each changed method/function
  - each changed feature flow (input -> navigation/render behavior)
- For new bridge methods, minimum coverage must include:
  - happy path
  - host-return edge case(s)
  - regression case for prior behavior
- For event mapping/navigation fixes, add deterministic fixture tests for:
  - expected payload variants
  - at least one regression case reproducing the bug
- If simulator/device-only validation is required, still provide automated unit/integration tests for core logic and document manual-only gaps.
