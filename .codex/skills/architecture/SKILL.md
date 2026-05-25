---
name: architecture
description: Use for Daily App architecture, EvenHub layer boundaries, bridge-only SDK access, routing/input ownership, packaging boundaries, and implementation review.
---

# ArchitectureAgent

Purpose
- Understand and enforce the Daily App folder, component, screen, and service architecture.
- Review changes for layering violations and missing responsibilities.

Scope of knowledge
- Project: daily-app/src
- Current EvenHub reference snapshot: `doc/evenhub-current-sdk-notes.md`
- Official docs:
  - architecture: https://hub.evenrealities.com/docs/getting-started/architecture
  - display: https://hub.evenrealities.com/docs/guides/display
  - input/events: https://hub.evenrealities.com/docs/guides/input-events
  - device APIs: https://hub.evenrealities.com/docs/guides/device-apis
  - networking: https://hub.evenrealities.com/docs/guides/networking
  - packaging: https://hub.evenrealities.com/docs/reference/packaging
  - headless testing: https://hub.evenrealities.com/docs/guides/headless-testing
  - Claude Code AI tooling: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/
  - Claude Code skill catalog: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/skill-catalog
  - starter templates: https://github.com/even-realities/evenhub-templates
  - AI skill repo: https://github.com/even-realities/everything-evenhub
- Structure:
  - app/: appController, initBridge
  - bridge/: EvenHub bridge wrapper + types + bridge-facing adapters
  - navigation/: Screen interface, stack, router
  - input/: EvenHub event mapping + input dispatch
  - screens/: Dashboard, List, Detail, ActionsOverlay
  - ui/: components, layout, render pipeline
  - services/: data + storage
  - state/: store (if used)
  - utils/: clamp, logger

Rules to enforce
- UI containers are created only via `ui/render/renderPipeline`.
- Runtime SDK calls are only allowed under `src/bridge/`.
- Runtime SDK calls are not allowed in `services/`, `screens/`, `ui/`, or demo/legacy entry paths like `main.js`.
- Bridge layer must expose interfaces/adapters for storage/device/event usage by other layers.
- New SDK wrappers, including audio, IMU, storage, device status, and generic `callEvenApp` fallbacks, belong in `src/bridge/` first.
- Services consume bridge interfaces; services must not import SDK directly.
- Screens return ViewModels; they do not call bridge/SDK directly.
- Input mapping happens only in `input/evenHubEventMapper.ts`.
- New EventHub event fields such as `audioEvent`, IMU reports, source fields, or new `OsEventTypeList` values are normalized in `input/` before screens consume them.
- Navigation changes happen only via `navigation/router.ts` and stack.
- Event subscriptions must be cleanup-capable (`connect`/`disconnect`, unsubscribe lifecycle).
- Packaged-app metadata belongs in `app.json`/packaging config, not in runtime screen/service code.
- Network permissions must be declared in `app.json` as `permissions[].whitelist`; this is separate from browser CORS handling.
- Template-derived code must be adapted into the existing layer boundaries:
  - SDK imports remain in `src/bridge/`.
  - template `src/main.ts` event logic becomes bridge/input/router/render logic, not a new direct-entry island.
  - template UI geometry becomes layout/render-pipeline rules.
  - template companion WebView HTML/CSS remains separate from glasses container rendering.
- Official AI tooling patterns are reference material, not permission to bypass this repo's bridge-only SDK rule.
- `background-state` from the official skill catalog is allowed only after verifying `setBackgroundState` and `onBackgroundRestore` exports in the installed SDK; otherwise keep persistence on existing bridge storage interfaces.
- Test-first requirement for code changes:
  - Every changed/new method must have automated test coverage (new test or updated test).
  - Every changed/new feature flow must have automated scenario coverage (happy path + edge/error + regression).

Review checklist
- New files are placed in the correct layer folder.
- No direct SDK imports outside `src/bridge/`.
- Bridge APIs are injected into other layers via interfaces/adapters.
- Screens only use DataService and Router, not SDK.
- ViewModel composition stays under `ui/components`.
- Layout rules:
  - latest docs: `containerTotalNum` 1-12, `textObject` max 8, `imageObject` max 4 per page
  - older SDK/app fallback: max 4 containers total
  - exactly 1 event-capture container
- DoubleClick maps to Back everywhere.
- Root-level DoubleClick/exit behavior stays compatible with the system exit flow.
- Subscription cleanup/unsubscribe handling exists for long-lived listeners.
- Demo/legacy files that still call SDK directly are flagged as technical debt.
- Tests are added/updated for changed methods and changed features.
- For template-derived work, the selected source template is named and the adapted responsibilities are mapped to this repo's layers.
- Build and test command results are reported; if tests were blocked, missing coverage is listed explicitly.
- Simulator/headless checks are used for UI flows when practical:
  - wait for app-ready signal before input
  - use `GET /api/screenshot/glasses` for lit-pixel assertions
  - use `POST /api/input` for click/double_click/up/down flows
- Hardware-only gaps are documented separately from automated unit/integration coverage.

Common violations
- Direct SDK imports in services/components/screens.
- Rebuild/startup calls from multiple non-bridge locations.
- Mixed input mapping in screens (should map upstream).
- Mixed bridge instances causing duplicated listeners.
- Missing unsubscribe handling for event listeners.
- Treating WebView companion components as glasses-rendered UI.
- Embedding network whitelist/packaging behavior in app logic instead of manifest/config.
- Adding IMU/audio behavior directly in screens instead of via bridge and input adapters.
- Copying official template `main.ts` directly into app runtime paths with SDK imports outside `src/bridge/`.
- Adding AI-tooling APIs from the skill catalog without proving they exist in the installed SDK types/runtime.

If violations found
- Report file path and line where layering is broken.
- Suggest fix: move logic to the correct layer and call through a bridge interface.
- Mark remaining direct-SDK demo paths as technical debt when not in current scope.
