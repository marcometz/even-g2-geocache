# Skill Catalog für GitHub Copilot & Codex (abgeleitet aus Claude Code)

Quelle: Claude Code Skill Catalog  
https://hub.evenrealities.com/docs/AI-tooling/claude%20code/skill-catalog

## Nutzung in GitHub Copilot & Codex

Claude nutzt dedizierte `/skill`-Kommandos. Für GitHub Copilot und Codex gibt es diese Skill-Kommandos nicht 1:1 — stattdessen werden sie als klare Aufgaben-Prompts formuliert.  
Dieses Dokument mappt jede Claude-Skill auf entsprechende Copilot/Codex-Aufträge.

---

## Tier 1 — One-Click

### `quickstart`
**Zweck:** Blank Even G2 App scaffolden (Vite + TypeScript + SDK).  
**Copilot/Codex Prompt:** „Erstelle eine neue, leere Even G2 App mit Vite + TypeScript und `@evenrealities/even_hub_sdk`, inklusive minimaler Startseite.“

### `template`
**Zweck:** Curated Starter (`minimal`, `asr`, `image`, `text-heavy`) verwenden.  
**Copilot/Codex Prompt:** „Scaffolde eine Even G2 App aus dem Template `<minimal|asr|image|text-heavy>`, passe `package.json`/`app.json` auf den Projektnamen an und installiere Abhängigkeiten.“

### `build-and-deploy`
**Zweck:** Paket bauen und in Even Hub deployen.  
**Copilot/Codex Prompt:** „Führe den vollständigen Packaging- und Deploy-Flow mit der Even Hub CLI aus und gib die verwendeten Kommandos + erwartete Outputs an.“

---

## Tier 2 — Core Development

### `glasses-ui`
**Zweck:** UI für das G2-Display bauen (Container, Text, Listen, Bilder).  
**Copilot/Codex Prompt:** „Implementiere ein Even G2 UI-Layout für `<Screenbeschreibung>` gemäß Display-Constraints und bestehenden Design-Guidelines.“

### `handle-input`
**Zweck:** Touchpad/Ring/Lifecycle-Events handhaben.  
**Copilot/Codex Prompt:** „Implementiere Input-Handling für `<Interaktionsablauf>` mit klarer Trennung von Event-Registrierung und Screen-Logik.“

### `device-features`
**Zweck:** Hardware-/SDK-Funktionen nutzen (Audio, IMU, Device Info, Storage).  
**Copilot/Codex Prompt:** „Nutze SDK-Device-Features für `<Feature>` inkl. Fehlerfällen und State-Update im UI.“

### `background-state`
**Zweck:** State über Background/Foreground erhalten.  
**Copilot/Codex Prompt:** „Analysiere die App auf State-Verlust bei Background/Foreground und integriere `setBackgroundState` + `onBackgroundRestore` sauber in den bestehenden Lifecycle.“

### `test-with-simulator`
**Zweck:** App im Even Hub Simulator testen/debuggen.  
**Copilot/Codex Prompt:** „Beschreibe und führe einen reproduzierbaren Simulator-Testflow für `<Feature>` aus (Start, Interaktion, erwartetes Verhalten, Debug-Hinweise).“

### `simulator-automation`
**Zweck:** Simulator per HTTP API automatisieren (Screenshots, Inputs, Logs).  
**Copilot/Codex Prompt:** „Automatisiere einen Simulator-Check für `<Szenario>` mit Input-Injection, Screenshot-Erzeugung und Log-Auswertung.“

### `font-measurement`
**Zweck:** Pixelgenaue Text-/Listen-Messung für LVGL-konformes Rendering.  
**Copilot/Codex Prompt:** „Berechne und implementiere textmetrische Layout-Regeln für `<Textfall>` (Containergröße, Padding, Zeilenumbrüche) passend zu Even G2.“

---

## Tier 3 — Reference

### `sdk-reference`
**Zweck:** SDK-APIs, Typen und Patterns nachschlagen.  
**Copilot/Codex Prompt:** „Nutze die Even Hub SDK-Doku für `<Symbol/Thema>` und leite daraus eine konkrete Implementierung im aktuellen Code ab.“

### `cli-reference`
**Zweck:** CLI-Befehle und Flags nachschlagen.  
**Copilot/Codex Prompt:** „Nenne die passenden Even Hub CLI-Kommandos für `<Ziel>` inklusive wichtiger Flags und typischer Fehlerquellen.“

### `design-guidelines`
**Zweck:** Display-/UX-Best-Practices anwenden.  
**Copilot/Codex Prompt:** „Überprüfe `<UI/Screen>` gegen Even G2 Design-Guidelines und schlage konkrete, umsetzbare Verbesserungen vor.“

---

## Empfohlene Reihenfolge (Even G2)

1. `template` (oder `quickstart` für blank)
2. `glasses-ui` + `design-guidelines`
3. `handle-input`
4. `device-features`
5. `background-state`
6. `test-with-simulator` (+ `simulator-automation`)
7. `build-and-deploy`

## Kurzvorlage für GitHub Copilot / Codex

„Du arbeitest an einer Even G2 App. Nutze diese Reihenfolge: Template/Scaffold → UI+Design-Guidelines → Input → Device Features → Background-State → Simulator-Tests → Build/Deploy. Liefere konkrete Dateiänderungen, Tests im Simulator und relevante Packaging/Deploy-Kommandos.“
