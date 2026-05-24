# EvenHub Agent Setup (imported from hub.evenrealities.com)

Dieses Repository enthält jetzt lokal gespiegelt:
- `external/evenhub/design-guidelines.html` (UI/UX Styleguide)
- `external/evenhub/skill-catalog.html` (Skill-Übersicht)
- `external/evenhub/ai-tooling-claude-code.html` (Agent/Plugin Setup)

## Angewandte Agent-Richtlinien

Für Aufgaben rund um Even G2 sollte der Agent diese Priorität nutzen:
1. **template** – wenn ein Starter-Projekt gebraucht wird (`minimal`, `asr`, `image`, `text-heavy`).
2. **quickstart** – wenn ein komplett leeres Projekt benötigt wird.
3. **glasses-ui + design-guidelines** – für UI-Layout, Lesbarkeit und Display-konforme Umsetzung.
4. **handle-input / device-features / background-state** – für Interaktion und Plattformintegration.
5. **test-with-simulator / simulator-automation** – für Verifikation.
6. **build-and-deploy / cli-reference** – für Packaging und Deployment.

## Agent Prompt Template

```text
Kontext: Even G2 App-Entwicklung.
Nutze bevorzugt diese Skill-Reihenfolge:
- Scaffold: template (oder quickstart für blank)
- UI: glasses-ui + design-guidelines
- Interaktion: handle-input
- Hardware/APIs: device-features
- State-Lifecycle: background-state
- Test: test-with-simulator (+ simulator-automation)
- Release: build-and-deploy

Lieferung:
- Konkrete Dateiänderungen
- Simulator-Testschritte
- Falls relevant: Packaging/Deploy-Kommandos
```
