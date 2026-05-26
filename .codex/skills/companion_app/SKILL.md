---
name: companion_app
description: Reference for building the iPhone WebView companion/settings UI of an Even G2 app using the even-toolkit design system (web components, icons, design tokens, typography) and how it connects to the glasses bridge. Use when adding/changing settings pages, configuration screens, OAuth/login flows, or other browser-rendered UI that complements the glass app.
---

# Companion App Skill (Browser / WebView UI)

Use this skill for any non-glass UI that runs inside the Even App's iPhone WebView (settings page, onboarding, configuration, dashboards). The glasses display rendering is covered by `g2_reference`.

Source (refreshed 2026-05-26):
- https://github.com/nickustinov/even-g2-notes/blob/main/docs/browser-ui.md
- https://github.com/fabioglimb/even-toolkit
- https://www.npmjs.com/package/even-toolkit

## 1. Stack
- Component library: `even-toolkit` (MIT, npm).
- Theme CSS to import in entry:
  - `even-toolkit/web/theme-light.css` (default)
  - `even-toolkit/web/theme-dark.css` (alternative)
  - `even-toolkit/web/typography.css`
  - `even-toolkit/web/utilities.css`
- React + Tailwind friendly. Deep imports per component supported (e.g. `even-toolkit/web/button`).

## 2. Entry Points

### Web components
```ts
import { Button, Card, NavBar, ListItem, Toggle, AppShell } from 'even-toolkit/web';
```

### Icons (191 pixel-art)
```ts
import { IcChevronBack, IcTrash, IcSettings } from 'even-toolkit/web/icons/svg-icons';
```
Registry: `Icon`, `registerIcon`, `registerIcons`, `registerAllIcons`, `getIconNames`.

Convenience aliases: `IcTrash`, `IcChevronBack`, `IcSettings`, `IcSearch`, `IcPlus`, `IcCross`, `IcEdit`, `IcShare`, `IcCopy`, `IcCheck`, `IcMore`.

### Glasses bridge bindings (also usable from companion side)
| Import | Purpose |
|---|---|
| `even-toolkit/useGlasses` | React hook wiring the bridge; handles root-page exit (`shutdownOnHomeBack: true`, mode 1) |
| `even-toolkit/bridge` | `EvenHubBridge` class + `ColumnConfig` |
| `even-toolkit/action-map` | `mapGlassEvent(event)` → `GlassAction \| null` |
| `even-toolkit/action-bar` | `buildActionBar()`, `buildStaticActionBar()` |
| `even-toolkit/gestures` | `tryConsumeTap()`, `isScrollSuppressed()`, `notifyTextUpdate()`, `isScrollDebounced()` |
| `even-toolkit/keyboard` | `bindKeyboard(dispatch)` — returns cleanup |
| `even-toolkit/text-utils` | `truncate()`, `SCROLL_UP/DOWN`, `buildHeaderLine()`, `applyScrollIndicators()` |
| `even-toolkit/layout` | `DISPLAY_W=576`, `DISPLAY_H=288`, tile/slot constants, `dummySlot()` |
| `even-toolkit/canvas-renderer` | `getCanvas()`, `drawToCanvas()`, `renderToImage()` |
| `even-toolkit/composer` | `composeStartupPage()`, `composeRebuildPage()` |
| `even-toolkit/png-utils` | `encodeTilesBatch()`, `resetTileCache()`, `canvasToPngBytes()` |
| `even-toolkit/keep-alive` | `activateKeepAlive()`, `deactivateKeepAlive()` |
| `even-toolkit/splash` | `createSplash()`, `TILE_PRESETS`, `SplashConfig`, `SplashHandle` |
| `even-toolkit/text-clean` | `cleanForG2()`, `normalizeWhitespace()` |
| `even-toolkit/paginate-text` | `wordWrap()`, `paginateText()`, `pageIndicator()` |
| `even-toolkit/timer-display` | `renderTimerLines()`, `renderTimerCompact()` |
| `even-toolkit/useFlashPhase` | `useFlashPhase(active)` |

## 3. Component Inventory (55+)
- **Primitives**: Button, Card, Badge, Input, Textarea, Select, Checkbox, RadioGroup, Slider, InputGroup, Skeleton, Progress, StatusDot, Pill, Toggle, SegmentedControl, Table (+ TableHeader/Body/Row/Head/Cell), Kbd, Divider.
- **Layout**: AppShell, Page, NavBar, NavHeader, ScreenHeader, SectionHeader, SettingsGroup, CategoryFilter, ListItem (swipe-to-delete), SearchBar, Tag, TagCarousel, TagCard, SliderIndicator, PageIndicator, StepIndicator, Timeline, StatGrid, StatusProgress.
- **Feedback**: TimerRing, Dialog, ConfirmDialog, Toast, EmptyState, Loading, BottomSheet, CTAGroup, ScrollPicker, DatePicker, TimePicker, SelectionPicker.
- **Charts (recharts)**: Sparkline, LineChart, BarChart, PieChart, StatCard.
- **Media**: ChatContainer, ChatBubble, ChatInput, ChatThinking, ChatCodeBlock, ChatDiff, ChatToolCall, ChatCommand, ChatError, Calendar, FileUpload, VoiceInput, WaveformVisualizer, ImageGrid, ImageViewer, AudioPlayer.

## 4. Design Tokens (CSS custom properties)
| Token | Light value | Use |
|---|---|---|
| `--color-text` | `#232323` | Primary text |
| `--color-text-dim` / `--color-text-muted` | `#7B7B7B` | Secondary text |
| `--color-text-highlight` | `#FFFFFF` | Highlighted text |
| `--color-bg` | `#EEEEEE` | Page background |
| `--color-surface` | `#FFFFFF` | Cards / container surface |
| `--color-surface-light` | `#F6F6F6` | Secondary surface |
| `--color-surface-lighter` | `#E4E4E4` | Tertiary surface |
| `--color-border` | `#E4E4E4` | Primary border |
| `--color-border-light` | `#EEEEEE` | Subtle border |
| `--color-accent` | `#232323` | Primary accent |
| `--color-accent-warning` | `#FEF991` | Warning accent |
| `--color-positive` | `#4BB956` | Success / connected |
| `--color-negative` | `#FF453A` | Error |
| `--radius-default` | `6px` | Border radius |
| `--spacing-margin` | `12px` | Outer margin |
| `--spacing-card-margin` | `16px` | Card margin |
| `--spacing-same` | `6px` | Same-group spacing |
| `--spacing-cross` | `12px` | Cross-group spacing |
| `--spacing-section` | `24px` | Section spacing |
| `--font-display` | FK Grotesk Neue, ... | Display/body |
| `--font-mono` | SF Mono, Cascadia Code, ... | Monospace |

Dark theme defines the same properties via `theme-dark.css`.

## 5. Typography Utility Classes
| Class | Size | Weight | Letter-spacing |
|---|---|---|---|
| `.text-vlarge-title` | 24px | 400 | -0.72px |
| `.text-large-title` | 20px | 400 | -0.6px |
| `.text-medium-title` | 17px | 400 | -0.17px |
| `.text-medium-body` | 17px | 300 | -0.17px |
| `.text-normal-title` | 15px | 400 | -0.15px |
| `.text-normal-body` | 15px | 300 | -0.15px |
| `.text-subtitle` | 13px | 400 | -0.13px |
| `.text-detail` | 11px | 400 | -0.11px |

## 6. Companion ↔ Glasses Wiring
- The companion runs inside the same WebView as the glass app, so the SAME `EvenAppBridge` is reachable. Settings pages can call `bridge.setLocalStorage` / `getLocalStorage` to persist user prefs that the glass-side reads at boot.
- Prefer `useGlasses` to subscribe to glass events and manage the bridge lifecycle in React companion apps. It handles the root-page exit submission requirement.
- For non-React apps (vanilla JS / vanilla TS), use `EvenHubBridge` directly from `even-toolkit/bridge` and `mapGlassEvent` from `even-toolkit/action-map`.

## 7. Conventions for This Repo
- This project is vanilla ESM JS. Toolkit modules with no broken relative imports (verified: `glass-nav`, `text-utils`, `glass-format`, `paginate-text`, `action-map`) are safe to import statically.
- Modules with extension-less relative imports (e.g. `useGlasses`, `bridge`, indirectly `action-map`) must be loaded LAZILY at runtime inside the bridge — never at module top level — otherwise `node --test` fails with `ERR_MODULE_NOT_FOUND`.
- For per-screen architecture mirror the toolkit pattern: `src/glass/screens/<screen>.js` exports `{ display(state), action(state, input) }`; `selectors.js` routes by `state.screen`.

## 8. Checklist Before Shipping Companion UI
- [ ] Theme CSS + typography CSS imported in entry.
- [ ] All persistence goes through `bridge.setLocalStorage` (warm an in-memory cache at startup).
- [ ] Glass and companion share the same bridge instance — don't create a second connection.
- [ ] Settings changes that affect the glass display trigger a `rebuildPageContainer` (or `textContainerUpgrade`) so the user sees the change immediately.
- [ ] Mobile-first, single-column layout; use `AppShell` + `NavBar` or `DrawerShell` for navigation.
- [ ] Validate flows on the real Even App WebView (not just a desktop browser) before release.
