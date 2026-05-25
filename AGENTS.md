# Agent Instructions for this repository

When working on Even G2 / EvenHub tasks, use local mirrored guidance from `external/evenhub/` and `EVENHUB_AGENT_SETUP.md`.

## Preferred workflow
1. Template-first scaffolding (`template`) unless user explicitly asks for blank (`quickstart`).
2. Follow UI/UX guidance from `design-guidelines.html` for all display-facing changes.
3. Use input/device/background-state patterns before custom ad-hoc implementations.
4. Validate behavior in simulator workflows before finalizing changes.
5. Include packaging/deploy commands when delivering release-ready updates.

# Codex Agents and Skills Registry

This file indexes custom agents and skills stored in this repository.
The canonical registry location is `AGENTS.md` at the repository root.

## Agents
- ArchitectureAgent: Enforces Daily App architecture layering and responsibilities.
  - Path: .codex/skills/architecture/SKILL.md
- EvenAgent: Domain knowledge for EvenHub (SDK, Simulator, CLI, navigation rules, event mapping).
  - Path: .codex/skills/even_agent/SKILL.md
- UIAgent: EvenHub UI rendering rules and container layout strategy.
  - Path: .codex/skills/ui_agent/SKILL.md

## Skills
- architecture: Same as ArchitectureAgent (kept under skills for reuse).
  - Path: .codex/skills/architecture/SKILL.md
- even_agent: Same as EvenAgent (kept under skills for reuse).
  - Path: .codex/skills/even_agent/SKILL.md
- ui_agent: Same as UIAgent (kept under skills for reuse).
  - Path: .codex/skills/ui_agent/SKILL.md

## Mandatory Skill Policy
- Before starting implementation work, always check whether a matching skill exists under `.codex/skills/*/SKILL.md`.
- If a matching skill exists, it must be used.
- If multiple skills match, use the smallest set that fully covers the task and state the execution order briefly.
- Proceed without skills only when no matching skill exists.
- For EvenHub UI rendering/display tasks, `ui_agent` must be used.
- Mandatory test policy for all implementation work:
  - Always create or update automated tests for every changed method/function and every changed feature flow.
  - Minimum coverage per feature change: happy path + relevant edge/error cases + regression case for the changed behavior.
  - If tests cannot be executed (tooling/environment limits), explicitly document what was not tested and why.
- Sequencing note:
  - If SDK details are needed, apply `ui_agent -> even_agent`.
  - If architecture compliance is needed for code changes, apply `ui_agent -> even_agent -> architecture`.
- For EvenHub work inspired by official AI tooling/templates, read the relevant local skill first and then inspect the matching official template docs/source before adapting code.

## Conventions
- Each agent/skill lives in its own folder under `.codex/skills/<name>/`.
- The canonical entry file is `SKILL.md`.

## Official EvenHub AI Tooling References
- Claude Code AI tooling guide: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/
- Claude Code skill catalog: https://hub.evenrealities.com/docs/AI-tooling/claude%20code/skill-catalog
- AI skill source repo: https://github.com/even-realities/everything-evenhub
- Starter templates repo: https://github.com/even-realities/evenhub-templates
- The official plugin groups skills into:
  - one-click: `quickstart`, `template`, `build-and-deploy`
  - core development: `glasses-ui`, `handle-input`, `device-features`, `background-state`, `test-with-simulator`, `simulator-automation`, `font-measurement`
  - reference: `sdk-reference`, `cli-reference`, `design-guidelines`
- Official templates to consider before starting a new app/flow:
  - `minimal`: base Vite + TypeScript + SDK app
  - `asr`: microphone/STT scaffold
  - `image`: image container rendering
  - `text-heavy`: paginated reader using `@evenrealities/pretext`
- Template code is reference material. Adapt it into this repo's layers; do not introduce direct SDK imports outside `src/bridge/`.
- The catalog mentions `background-state` with `setBackgroundState`/`onBackgroundRestore`. Verify those exports in the installed SDK before implementing that pattern.

## EvenHub Current Reference Snapshot
- Refreshed against official Even Realities Developer Docs on 2026-05-19.
- Official docs index: https://hub.evenrealities.com/docs
- Official installation docs last updated 2026-04-22:
  - `@evenrealities/even_hub_sdk`: `0.0.10` (published 2026-04-10)
  - `@evenrealities/evenhub-simulator`: `0.7.2` (published 2026-04-15)
  - `@evenrealities/evenhub-cli`: `0.1.12` (published 2026-04-16)
- npm latest checked 2026-05-19:
  - `@evenrealities/even_hub_sdk`: `0.0.10`
  - `@evenrealities/evenhub-simulator`: `0.7.3`
  - `@evenrealities/evenhub-cli`: `0.1.13`
- Local installed packages may be older; after updating dependencies, re-read `daily-app/node_modules/@evenrealities/even_hub_sdk/dist/index.d.ts` before making version-sensitive SDK claims.
- Latest docs add/clarify IMU support via `imuControl(isOpen, ImuReportPace)` and `sysEvent.imuData`, simulator headless automation via `--automation-port`, and packaging/network whitelist requirements in `app.json`.
