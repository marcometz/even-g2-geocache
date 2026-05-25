---
name: ui_agent
description: Use for EvenHub glasses UI, WebView companion UI, display rendering, container layout, event-capture planning, and simulator/headless UI validation.
---

# UIAgent

Purpose
- Define and validate EvenHub UI rendering strategy from request to container payload.
- Standardize how blocks, frames, lists, and pseudo-tables are represented under SDK limits.

When to use
- Use for requests about UI darstellen/rendern/layout/screen/container/visual structure for EvenHub/Daily App glasses UI.
- Exclude non-UI tasks (API integrations, storage, CI, release workflows).
- If multiple skills match, use this order: `ui_agent -> even_agent -> architecture` (architecture only for code-change compliance checks).

Sources
- Official SDK types after dependency refresh (authoritative): `daily-app/node_modules/@evenrealities/even_hub_sdk/dist/index.d.ts`
- Official SDK metadata: `daily-app/node_modules/@evenrealities/even_hub_sdk/package.json`
- Official SDK README (EN): `daily-app/node_modules/@evenrealities/even_hub_sdk/README.md`
- Official SDK README (ZH): `daily-app/node_modules/@evenrealities/even_hub_sdk/README.zh-CN.md`
- Current repo reference snapshot: `doc/evenhub-current-sdk-notes.md`
- Official display docs: `https://hub.evenrealities.com/docs/guides/display`
- Official page lifecycle docs: `https://hub.evenrealities.com/docs/guides/page-lifecycle`
- Official input/events docs: `https://hub.evenrealities.com/docs/guides/input-events`
- Official headless testing docs: `https://hub.evenrealities.com/docs/guides/headless-testing`
- Official simulator docs: `https://hub.evenrealities.com/docs/reference/simulator`
- Official Claude Code AI tooling docs: `https://hub.evenrealities.com/docs/AI-tooling/claude%20code/`
- Official Claude Code skill catalog: `https://hub.evenrealities.com/docs/AI-tooling/claude%20code/skill-catalog`
- Official template repo: `https://github.com/even-realities/evenhub-templates`
- Official AI skill repo: `https://github.com/even-realities/everything-evenhub`
- UI pipeline: `daily-app/src/ui`
- Bridge wrapper: `daily-app/src/bridge/evenHubBridge.ts`
- G2 notes (Browser UI components, community/reverse-engineered): `https://github.com/nickustinov/even-g2-notes/blob/main/G2.md#browser-ui-component-library`
- Priority rule:
  - Updated local SDK types are authoritative for exact method signatures.
  - Official docs are authoritative for current SDK/tool targets and published platform limits when local packages are stale.
  - G2 notes are supplemental for companion Browser/WebView UI guidance.

Current package targets
- Official installation docs last updated 2026-04-22 list:
  - `@evenrealities/even_hub_sdk`: 0.0.10
  - `@evenrealities/evenhub-simulator`: 0.7.2
  - `@evenrealities/evenhub-cli`: 0.1.12
- npm latest checked 2026-05-19:
  - `@evenrealities/even_hub_sdk`: 0.0.10
  - `@evenrealities/evenhub-simulator`: 0.7.3
  - `@evenrealities/evenhub-cli`: 0.1.13
- If local packages are older, update dependencies before relying on local `dist/index.d.ts` for version-sensitive UI behavior.

Examples
- https://github.com/nickustinov/even-dev/tree/main/apps/quicktest

Official template patterns
- Use these starter families as pattern references when a request matches them:
  - `minimal`: one full-canvas text container, single event capture, double-tap exit.
  - `asr`: microphone flow, 120 ms debounced `textContainerUpgrade`, STT provider stub, `g2-microphone` permission, optional network whitelist after provider choice.
  - `image`: image placeholder plus full-screen text event layer, serial `updateImageRawData`, status text container, double-tap exit.
  - `text-heavy`: fixed body/pager containers, `@evenrealities/pretext` pagination, serialized `textContainerUpgrade`, tap next, swipe previous, double-tap exit.
- For new UI flows, inspect the matching template's `README.md`, `src/main.ts`, and manifest before inventing a new pattern.
- Do not copy a template's package/tool versions blindly; verify against official installation docs and the local installed SDK.

Local monitoring
- Dev URL for live UI/manual log inspection: `http://localhost:5173`
- Quick availability check from terminal: `curl -I http://localhost:5173`

Supported primitives
- Container models:
  - `ListContainerProperty`
  - `TextContainerProperty`
  - `ImageContainerProperty`
- Rendering/update methods:
  - `createStartUpPageContainer`
  - `rebuildPageContainer`
  - `textContainerUpgrade`
  - `updateImageRawData`
- Optional non-visual companion capabilities (when UI flow depends on host/app state):
  - `getUserInfo`, `getDeviceInfo`, `onDeviceStatusChanged`
  - `audioControl`, `imuControl`, `shutDownPageContainer`
  - `onEvenHubEvent`, `callEvenApp`

Browser UI (WebView companion, not glasses canvas)
- Purpose:
  - Use `@jappyjan/even-realities-ui` for companion config/settings screens in Browser/WebView.
- Scope boundary:
  - These components do not render on the glasses canvas.
  - Glasses rendering still requires SDK containers and bridge calls.
- Entry points:
  - `@jappyjan/even-realities-ui` (full re-export)
  - `@jappyjan/even-realities-ui/components`
  - `@jappyjan/even-realities-ui/icons`
  - `@jappyjan/even-realities-ui/tokens` (currently empty in package)
  - `@jappyjan/even-realities-ui/styles.css`
- Install/import:
  - `npm install @jappyjan/even-realities-ui`
  - Import stylesheet exactly once globally: `@jappyjan/even-realities-ui/styles.css`
- Recommended Browser components:
  - Actions: `Button` (variants/sizes), `IconButton`
  - Layout: `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Divider`
  - Text: `Text` (variant-based typography)
  - Inputs: `Input`, `Textarea`, `Select`
  - Controls: `Checkbox`, `Radio`, `Switch`
  - Status/meta: `Badge`, `Chip`
- Icons:
  - 90+ icon set, grouped by domain: hardware, battery, navigation, actions, features, settings, general.
  - Example names: `GlassesIcon`, `BatteryFullIcon`, `BackIcon`, `AddIcon`, `TranslateIcon`, `SettingsIcon`, `InfoIcon`.
- Tokens (CSS custom properties):
  - Backgrounds (`--color-bc-*`), surfaces (`--color-sc-*`), text (`--color-tc-*`).
  - Typography (`--font-size-app-*`), spacing (`--space-*`), layout (`--layout-*`), radius (`--radius-*`).
- Utility:
  - `cn(...inputs): string` for class composition (`clsx` + `tailwind-merge`).

Hard constraints
- Latest SDK/display docs state: `containerTotalNum` is 1-12, `textObject` has max 8 entries, and `imageObject` has max 4 entries.
- Older local SDK/app versions may still behave like a 4-container-total system; verify local types and target app version before expanding layouts.
- Exactly one container must have `isEventCapture=1`.
- Coordinate system: origin `(0,0)` top-left, X right, Y down.
- Glasses canvas is 576 x 288 pixels per eye, rendered as 4-bit greyscale green.
- List/Text container ranges:
  - `xPosition: 0-576`, `yPosition: 0-288`
  - `width: 0-576`, `height: 0-288`
  - `borderWidth: 0-5`, `borderRadius: 0-10`
- Text containers:
  - plain text only, top-left aligned
  - max 1000 chars in create/rebuild payloads
  - max 2000 chars in `textContainerUpgrade`
- List containers:
  - native scroll/highlight behavior
  - max 20 items
  - max 64 characters per item
  - no in-place list update; rebuild the page
- Image container ranges:
  - `xPosition: 0-576`, `yPosition: 0-288`
  - `width: 20-288`, `height: 20-144`
- Result-aware flow is mandatory:
  - Evaluate startup result as `StartUpPageCreateResult` and mark page as created only on success.
  - Evaluate image push result as `ImageRawDataUpdateResult` and define handling per result value.
- Image delivery constraints:
  - Create image containers first, then send content via `updateImageRawData`.
  - Do not send image updates concurrently; use queue/sequential updates.
  - Avoid high-frequency image pushes due to device memory limits.
  - For image-first screens, use a full-screen text/list container behind the image with `isEventCapture=1`.

Event contract notes
- `audioEvent` is explicitly supported in current SDK event model.
- Latest docs add IMU reporting through `imuControl(isOpen, ImuReportPace)` and `sysEvent.imuData`; confirm exact types after refreshing SDK.
- `imgEvent` exists at protocol level but is not fully modeled in current SDK typings unless refreshed types prove otherwise.
- Event-capture routing depends on the capturing container type:
  - text capture container -> `event.textEvent`
  - list capture container -> `event.listEvent`

What is not native
- No native SVG/vector drawing API.
- No native table/grid widget.
- No free-form primitive shape API (line/rect/path/canvas drawing).
- No CSS/flexbox/DOM layout, background fill, custom font size, arbitrary alignment, animation, or native charting on the glasses display.

Representation rules
- Frames/blocks:
  - Use list/text containers with `borderWidth`, `borderColor`, `borderRadius`, `paddingLength`.
- Tables:
  - Simple: represent as list rows in a list container.
  - Complex: pre-render to image and push through `updateImageRawData`.
- Icons/charts/SVG-like visuals:
  - Pre-render externally and deliver as image data via image container updates.

Workflow
1. Classify request scope as `browser-ui`, `glasses-ui`, or `hybrid`.
2. If scope is `browser-ui` or `hybrid`, plan companion Browser/WebView UI first:
   - Choose `@jappyjan/even-realities-ui` entry points.
   - Map screen sections to component sets and icon/token usage.
3. If scope is `glasses-ui` or `hybrid`, classify glasses payload as `text`, `list`, `image`, or `mixed`.
4. Build a glasses container plan that stays within the current target limits:
   - current docs: `containerTotalNum` 1-12, `textObject` max 8, `imageObject` max 4
   - older SDK/app fallback: 4 containers total
5. Assign exactly one event-capture container (`isEventCapture=1`) for glasses payload.
6. Produce the glasses API sequence with expected results:
   - Initial render: `createStartUpPageContainer` -> expected `StartUpPageCreateResult.success`
   - Subsequent pages/major changes: `rebuildPageContainer` -> expected `true`
   - Text-only delta: `textContainerUpgrade` -> expected `true`
   - Image content: `updateImageRawData` -> expected `ImageRawDataUpdateResult.success`
7. For each non-success result, include fallback/next action (retry, rebuild, reduced layout, or stop with explicit error).
8. If design exceeds SDK limits, provide an explicit fallback layout and note compromises.
9. For AI-assisted/template-derived flows, explicitly map the work to the closest official skill intent:
   - `glasses-ui` for container layout and render payloads
   - `handle-input` for touchpad/ring/lifecycle routing
   - `font-measurement` for pixel-fit text and readers
   - `simulator-automation` for screenshot/input/console checks
   - `design-guidelines` for display constraints and UX tradeoffs
10. For simulator validation, prefer `evenhub-simulator <url> --automation-port <port>` and verify:
   - app-ready log or first event-capturing container before input
   - `GET /api/screenshot/glasses` has lit pixels where expected (`alpha > 0`)
   - `POST /api/input` covers click/double_click/up/down flows when relevant

Output contract
- Always return:
  - Scope classification (`browser-ui`, `glasses-ui`, `hybrid`)
  - Clear separation between Browser/WebView plan and glasses container plan
- If Browser/WebView UI is included, also return:
  - Entry points used
  - Component list per screen/section
  - Icon/token usage notes
  - CSS import note (`styles.css` imported once globally)
- If glasses UI is included, always return:
  - Container plan (types, positions, sizes, IDs/names)
  - Event-capture assignment
  - API call sequence
  - Expected return values per API call
  - Error/fallback path for startup/image failures
  - Tradeoffs/compromises caused by SDK limits
- If simulator validation is relevant, also return:
  - automation port assumption
  - screenshot/input endpoints used
  - manual hardware-validation gaps

Common pitfalls
- Calling `createStartUpPageContainer` repeatedly after first successful startup.
- Assigning `isEventCapture=1` to more than one container.
- Treating `updateImageRawData` as boolean-only and ignoring `ImageRawDataUpdateResult` semantics.
- Sending concurrent image updates.
- Missing unsubscribe/cleanup handling for long-lived event listeners.
- Promising native SVG/table features that are not supported by the SDK.
- Treating Browser/WebView components as if they render on the glasses canvas.
- Treating `@jappyjan/even-realities-ui` as a replacement for SDK container APIs.
- Missing global stylesheet import or importing it multiple times.
- For hybrid screens, mixing Browser/WebView recommendations with device-rendered container output without clear separation.
- Expanding beyond 4 total containers without checking the target app/SDK version.
- Sending simulator input before the app is ready.
- Treating a network whitelist entry as a CORS bypass.
- Using `rebuildPageContainer` for frequent text-only page turns where `textContainerUpgrade` would avoid flicker.
- Letting image containers carry input responsibility; use a text/list capture layer because images do not capture events.
- Assuming `CLICK_EVENT` is always present as `0` in the event payload; preserve explicit zero-value handling in mappers.
- Implementing `background-state` calls from AI-tooling docs without first verifying `setBackgroundState`/`onBackgroundRestore` in the installed SDK.

Testing requirements
- Every UI-related implementation change must include automated tests for:
  - each changed/new method that influences UI behavior
  - each changed/new feature flow (navigation, rendering state, and input handling)
- Minimum scenario set per changed feature:
  - happy path
  - edge/error handling
  - regression case for the exact changed behavior
- If some UI behavior cannot be fully automated (device-only limits), document the manual checks and keep decision logic under automated test coverage.
