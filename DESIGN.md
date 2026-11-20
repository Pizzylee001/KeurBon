---
schema: design.md/v1
project: KeurBon
version: 1.0.0
status: proposed-for-approval
surfaceMode: operate-with-overview-thesis
languages:
  primary: fr
  secondary: en
dials:
  antislop:
    energy: 2
    rhythm: 2
    motion: 2
  layout:
    variance: 6
    motion: 5
    density: 5
tokens:
  color:
    ink:
      primary: "#0E1E2B"
      secondary: "#3D515F"
      muted: "#4C616F"
      onSolid: "#FAFBF9"
    surface:
      canvas: "#F1F4F2"
      recessed: "#E3E9E5"
      voucherStock: "#FAFBF9"
      control: "#FAFBF9"
    brand:
      emerald: "#0C5C44"
      emeraldHover: "#094A36"
      emeraldTint: "#E5F2ED"
    accent:
      saffronSolid: "#9B5305"
      saffronHover: "#844604"
      saffronLarge: "#B8650A"
      saffronDecor: "#D98218"
      saffronTint: "#FBF2E6"
    semantic:
      destructive: "#A62329"
      destructiveHover: "#881C21"
      destructiveTint: "#FBEBEC"
    border:
      hairline: "#CFD8D4"
      strong: "#637683"
      focusRing: "#0E1E2B"
  typography:
    families:
      display: "'Outfit', system-ui, -apple-system, sans-serif"
      body: "'Source Sans 3', system-ui, -apple-system, sans-serif"
      mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
    scale:
      displayHero:
        fontFamily: "{typography.families.display}"
        fontSize: "clamp(2rem, 3.6vw, 3rem)"
        fontWeight: 700
        lineHeight: 1.08
        letterSpacing: "-0.028em"
      h1:
        fontFamily: "{typography.families.display}"
        fontSize: "clamp(1.75rem, 2.8vw, 2.25rem)"
        fontWeight: 700
        lineHeight: 1.14
        letterSpacing: "-0.024em"
      h2:
        fontFamily: "{typography.families.display}"
        fontSize: "clamp(1.375rem, 2vw, 1.625rem)"
        fontWeight: 600
        lineHeight: 1.22
        letterSpacing: "-0.018em"
      h3:
        fontFamily: "{typography.families.display}"
        fontSize: "1.125rem"
        fontWeight: 600
        lineHeight: 1.3
        letterSpacing: "-0.01em"
      bodyLarge:
        fontFamily: "{typography.families.body}"
        fontSize: "1.0625rem"
        fontWeight: 400
        lineHeight: 1.58
        letterSpacing: "0em"
      body:
        fontFamily: "{typography.families.body}"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.55
        letterSpacing: "0em"
      label:
        fontFamily: "{typography.families.body}"
        fontSize: "0.875rem"
        fontWeight: 600
        lineHeight: 1.35
        letterSpacing: "0em"
      caption:
        fontFamily: "{typography.families.body}"
        fontSize: "0.8125rem"
        fontWeight: 400
        lineHeight: 1.45
        letterSpacing: "0em"
      dataHero:
        fontFamily: "{typography.families.mono}"
        fontSize: "clamp(1.5rem, 2.4vw, 2rem)"
        fontWeight: 600
        lineHeight: 1.15
        letterSpacing: "-0.02em"
      dataRow:
        fontFamily: "{typography.families.mono}"
        fontSize: "0.875rem"
        fontWeight: 500
        lineHeight: 1.4
        letterSpacing: "0em"
  spacing:
    baseUnit: "4px"
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "32px"
    2xl: "48px"
    3xl: "64px"
    containerMax: "1200px"
    gutterMobile: "16px"
    gutterDesktop: "32px"
  radius:
    none: "0px"
    control: "8px"
    sheet: "12px"
    stubOuter: "16px"
    pill: "9999px"
  elevation:
    flat: "none"
    stub: "0 2px 4px rgba(14, 30, 43, 0.05), 0 14px 32px -12px rgba(14, 30, 43, 0.14)"
    sheetActive: "0 4px 8px rgba(14, 30, 43, 0.06), 0 20px 44px -14px rgba(14, 30, 43, 0.18)"
  motion:
    easeOut: "cubic-bezier(0.23, 1, 0.32, 1)"
    easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)"
    durationPress: "120ms"
    durationState: "180ms"
    durationEnter: "260ms"
    durationSeal: "420ms"
    pressScale: 0.97
    enterScale: 0.95
  breakpoints:
    mobile: "390px"
    tablet: "768px"
    desktop: "1024px"
    wide: "1440px"
  zIndex:
    base: 0
    sticky: 20
    header: 40
    drawer: 60
    modal: 80
    toast: 100
---

# KeurBon Design System (`DESIGN.md`)

## 1. Visual Theme & Atmosphere

**Design Read:** Reading this as: Operate-first bilingual financial voucher application (with a concise overview thesis band on `/`) for Senegalese diaspora senders and Dakar neighborhood vendors, in a Dakar Architectural Daylight and Security-Paper Financial style, dial `ENERGY 2 / RHYTHM 2 / MOTION 2` (`VARIANCE 6 / MOTION 5 / DENSITY 5`).

### Identity & Philosophy
KeurBon (Wolof *keur*, household, plus French *bon*, voucher) issues non-custodial, purpose-locked diaspora vouchers powered by Bitcoin Cashu NUT-11 P2PK, offline NUT-12 DLEQ mint-signature verification, and zero-PII Nostr fulfillment receipts. Its interface is modeled on the physical clarity of West African postal money orders, municipal receipts, and Dakar's bright Atlantic coastal daylight: crisp ink on mineral voucher stock, high outdoor readability on mid-range Android screens, and zero dark-mode fintech theater.

- **Surface Mode:** `Operate` (primary across `/issue`, `/redeem`, `/ledger`, `/vendors`) paired with a compact task-anchored overview thesis band on `/`.
- **Language Policy:** French-first (`fr`) with an instant bilingual toggle (`FR | EN`) available in the persistent top navigation bar. Every token, control, error, and cryptographic status label ships with natural French diacritics (`é`, `è`, `ê`, `à`, `ç`, `ô`).

### Designed Background Treatment (Mandatory)
A flat single-fill background never ships. KeurBon uses a two-layer **Mineral Paper Daylight Atmosphere**:
1. **Page Canvas Layer (`#F1F4F2` base):** A restrained radial atmospheric wash blending a cool Atlantic coastal tint (`rgba(12, 92, 68, 0.045)` top-right) and a warm Sahel mineral daylight tint (`rgba(217, 130, 24, 0.055)` bottom-left) over `#F1F4F2`. **Documented job:** Provides calm daylight depth and directional warmth without reducing normal-text contrast anywhere on the viewport.
2. **Purpose Voucher Stub Security Band:** Crisp geometric SVG guilloche linework along the header strip of the tactile Purpose Voucher Stub (`#0C5C44` and `#D98218` at `14%` opacity on `#FAFBF9` voucher stock), paired with physical side perforation notches. **Documented job:** Visually distinguishes an active, cryptographically locked bearer voucher from surrounding form chrome, echoing official West African postal and bank vouchers while remaining sharp at 1x/2x mobile density.

### Reference Sweep (Adopted & Rejected Properties)
1. **West African Postal & Treasury Vouchers (BCEAO / La Poste Senegal):**
   - *Adopted:* Crisp voucher stock contrast, perforated tear-stub silhouette, tabular serial/amount alignment, mechanical verification stamp as the single proof of validity.
   - *Rejected:* Cluttered multi-font forms, low-contrast pale carbon-copy ink, dense legal boilerplate.
2. **Swiss Modernism 2.0 (Catalog Reference):**
   - *Adopted:* Mathematical 4/8px spacing, asymmetric 12-column split desk, hairline horizontal rules for ledger clarity, disciplined single-accent restraint.
   - *Rejected:* Pure `#000000` / `#FFFFFF` starkness and Inter as a default display voice.
3. **Cross-Border Remittance Calculators (Wise corridor ergonomics):**
   - *Adopted:* Instant bi-directional FCFA / sats conversion, transparent rate disclosure, explicit fee/expiry clarity right next to the amount input.
   - *Rejected:* Marketing hero stats, promotional banners, and rounded card stacks.
4. **Operational Counter Tools (Square / Stripe daylight forms):**
   - *Adopted:* High-legibility daylight inputs, explicit labels above fields, immediate verification state rails, keyboard-complete focus order.
   - *Rejected:* Soft floating cards on every section and generic indigo accents.

### Explicit Anti-Reference Record
- **Rejected Default Cluster A (Dark Dashboard Costume):** Dark full-width app shells, repeated large rounded bordered panels, identical empty-state boxes, muted gray-blue text, decorative top-bar chrome, hidden Cmd-K menus, and neon status dots. Rejected because Dakar neighborhood vendors operate in bright daylight on mid-range mobile devices and need immediate counter legibility, not dark-mode developer theater.
- **Rejected Default Cluster B (AI Editorial Cream):** Warm cream `#F4F1EA` paired with Fraunces/Instrument Serif and terracotta accents, centered SaaS hero + 3 equal icon cards, purple/indigo gradients, eyebrow kickers above headings, and em dashes in prose.

### Compulsory Theses
- **Graphic Thesis:** Geometric architectural sans (`Outfit`, 600 to 700) paired with crisp humanist body (`Source Sans 3`, 16px floor) and strict `tabular-nums` monospace (`JetBrains Mono`) for sats, FCFA, npubs, and locktimes; asymmetric split-desk composition (non-card structural move) anchoring a tactile perforated Purpose Voucher Stub and hairline-ruled operational ledger rows; mineral daylight surface with security-voucher guilloche linework; Deep Atlantic Slate Ink and Baobab Emerald anchored by one Sahel Saffron action accent.
- **Motion Thesis:** Standard operational tier (`ENERGY 2 / RHYTHM 2 / MOTION 2`). Custom deceleration `cubic-bezier(0.23, 1, 0.32, 1)`, entrances from `scale(0.95)` and `opacity: 0` (never `scale(0)`), scroll reveals trigger once and stay visible, `:active` button press `scale(0.97)` over `120ms`, animating `transform` and `opacity` only (zero `transition: all`). One subject-grounded signature moment: **Cryptographic Lock-Snap Seal**, a mechanical ink-stamp settle when a NUT-11 P2PK voucher is locked or a NUT-12 DLEQ proof passes verification. Full `prefers-reduced-motion: reduce` fallback renders instant opacity transitions and a static verified seal.
- **Depth Thesis:** Elevation is declared once per component family: crisp `1px` hairline borders (`#CFD8D4`) govern layout structure and operational tables; layered offset shadow (`elevation.stub`) is reserved exclusively for the tactile Purpose Voucher Stub and active voucher/modal sheets. WebGL and 3D are `None` by deliberate constraint: mid-range Android phones on 3G/2G in Dakar require fast paint and zero GPU memory overhead.

---

## 2. Color Palette & Roles

KeurBon uses **3 core brand/surface hues + 1 deliberate accent** (plus functional crimson strictly for destructive/error states). Every normal text pairing meets or exceeds WCAG 2.1 AA (`>= 4.5:1`), and large/graphical accent pairs exceed `>= 3.0:1`.

| Semantic Token | Hex | Role & Strict Usage Boundary | Verified Contrast Ratios |
|---|---|---|---|
| `--ink-primary` | `#0E1E2B` | Deep Atlantic Slate Ink. Primary headings, body text, strong icons, active nav text. | `15.30:1` on Mist (`#F1F4F2`), `16.33:1` on Stock (`#FAFBF9`) |
| `--ink-secondary` | `#3D515F` | Secondary explanatory copy, table headers, inactive nav labels. | `7.46:1` on Mist, `7.96:1` on Stock |
| `--ink-muted` | `#4C616F` | Helper text, timestamps, field hints, secondary metadata. | `5.84:1` on Mist, `6.23:1` on Stock |
| `--surface-canvas` | `#F1F4F2` | Mineral Mist Paper. Primary page canvas beneath the subtle daylight wash. | Ground layer |
| `--surface-recessed` | `#E3E9E5` | Recessed structural bands, segmented toggle tracks, disabled field fills. | `13.76:1` with `--ink-primary` |
| `--surface-voucher` | `#FAFBF9` | Crisp Voucher Stock. Tactile Purpose Voucher Stub, form inputs, active verification sheet. | `16.33:1` with `--ink-primary` |
| `--brand-emerald` | `#0C5C44` | Baobab Emerald. Cryptographic lock seal, NUT-12 DLEQ verified state, settled status, vendor counter confirm action. | `7.21:1` on Mist, `7.69:1` on Stock, `7.69:1` with `#FAFBF9` text |
| `--brand-emerald-tint` | `#E5F2ED` | Subtle verified status row/pill fill paired exclusively with `--brand-emerald` text. | `6.94:1` (`#0C5C44` on `#E5F2ED`) |
| `--accent-saffron-solid` | `#9B5305` | Sahel Saffron (Accessible Text & Primary Solid Button). Primary action buttons, active locked-sats normal text, focus indicators on accent controls. | `5.22:1` on Mist, `5.57:1` on Stock, `5.57:1` (`#FAFBF9` on `#9B5305`), `5.21:1` on Saffron Tint |
| `--accent-saffron-hover` | `#844604` | Primary button hover/pressed fill. | `7.08:1` (`#FAFBF9` on `#844604`) |
| `--accent-saffron-large` | `#B8650A` | Sahel Saffron (Large Display & Graphical). Strictly restricted to bold numbers `>= 24px`, icon strokes, and non-text graphical accents (`>= 3:1` AA large/UI). Never used for normal `< 18.66px` body text. | `3.87:1` on Mist, `4.13:1` on Stock (passes 3:1 large/UI) |
| `--accent-saffron-decor` | `#D98218` | Decorative Sahel Saffron. Guilloche security band lines, perforation accent rules, or solid badge background ONLY with `--ink-primary` (`#0E1E2B`) text. | `5.77:1` (`#0E1E2B` on `#D98218`) |
| `--accent-saffron-tint` | `#FBF2E6` | Warm highlight tint for active pending/refundable callouts paired with `--accent-saffron-solid` text. | `5.21:1` (`#9B5305` on `#FBF2E6`) |
| `--semantic-destructive` | `#A62329` | Failed DLEQ check, unauthorized vendor key rejection, invalid token, destructive clear actions. | `6.55:1` on Mist, `6.99:1` on Stock, `6.29:1` on `#FBEBEC` |
| `--border-hairline` | `#CFD8D4` | Structural `1px` borders, operational ledger rules, input resting borders. | Structural divider |
| `--border-strong` | `#637683` | Active input borders, non-text UI control boundaries, unchecked checkboxes. | `4.26:1` on Mist, `4.55:1` on Stock (`>= 3:1` WCAG UI boundary) |

> **Color Lock Note:** No pure `#000000` or `#FFFFFF`. No purple, indigo, or cyan gradients. Functional colors (Emerald verified, Saffron pending/action, Crimson rejected) ALWAYS pair with an explicit text label and a distinct SVG icon so color is never the sole carrier of meaning.

---

## 3. Typography Rules

### Font Families & Rationale
- **Display & Headings (`Outfit`, weights 600, 700):** Geometric clarity with warm open apertures that reads authoritatively on both financial voucher headers and mobile counter screens without feeling generic. Selected from Skill 01's catalog (`Startup Bold / Bauhaus Geometric` family).
- **Body & Interface (`Source Sans 3`, weights 400, 500, 600):** Engineered for high-legibility operational UI and clean French diacritics (`é`, `è`, `ê`, `à`, `ç`, `ù`) at 16px on mid-range mobile LCD panels. Selected from Skill 01's `Corporate Trust` catalog entry.
- **Data & Cryptographic Literals (`JetBrains Mono`, weights 500, 600):** Used strictly for measurable financial figures (`FCFA`, `sats`), Nostr `npub` keys, Cashu token prefixes, SHA-256 voucher hashes, and locktime countdowns with `font-variant-numeric: tabular-nums`. Never used as a decorative heading costume.

### Production Font Loading Plan (Mandatory)
In the production Vite/React application, fonts MUST be self-hosted via `@fontsource` packages (zero runtime Google Fonts `<link>` dependency, enabling full offline/3G resilience in Dakar):
```ts
// src/main.tsx (production font load plan)
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/500.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
```
Catalog identification reference (for preview/tooling reference only, never a production `<link>`):
`https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Source+Sans+3:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap`

### Type Hierarchy Table

| Role | Family | Weight | Size | Line Height | Tracking | Wrapping & Notes |
|---|---|---|---|---|---|---|
| `displayHero` | Outfit | 700 | `clamp(2rem, 3.6vw, 3rem)` (32px to 48px) | `1.08` | `-0.028em` | `text-wrap: balance`; max 2 lines on desktop; no eyebrow above it |
| `h1` (Route Title) | Outfit | 700 | `clamp(1.75rem, 2.8vw, 2.25rem)` (28px to 36px) | `1.14` | `-0.024em` | `text-wrap: balance` |
| `h2` (Section Title) | Outfit | 600 | `clamp(1.375rem, 2vw, 1.625rem)` (22px to 26px) | `1.22` | `-0.018em` | More top margin (`32px+`) than bottom (`12px`) |
| `h3` (Sub-panel Title) | Outfit | 600 | `1.125rem` (18px) | `1.30` | `-0.01em` | Direct functional title |
| `bodyLarge` | Source Sans 3 | 400 | `1.0625rem` (17px) | `1.58` | `0em` | `max-width: 60ch`; `text-wrap: pretty` |
| `body` | Source Sans 3 | 400 | `1rem` (16px floor) | `1.55` | `0em` | `>= 16px` on mobile to prevent iOS input zoom |
| `label` | Source Sans 3 | 600 | `0.875rem` (14px) | `1.35` | `0em` | Always placed above inputs; never uppercase wide-track |
| `caption` | Source Sans 3 | 400 | `0.8125rem` (13px) | `1.45` | `0em` | Helper text, rate timestamps, protocol notes |
| `dataHero` | JetBrains Mono | 600 | `clamp(1.5rem, 2.4vw, 2rem)` | `1.15` | `-0.02em` | `tabular-nums`; voucher face value in FCFA / sats |
| `dataRow` | JetBrains Mono | 500 | `0.875rem` (14px) | `1.40` | `0em` | `tabular-nums`; `overflow-wrap: anywhere` for npub/token hashes |

### Browser Surface Polish (Mandatory)
- `-webkit-font-smoothing: antialiased` on `html`.
- `::selection { background: #E5F2ED; color: #0E1E2B; }`
- `caret-color: #9B5305;` on inputs.
- `text-underline-offset: 0.18em;` on inline links.
- Visible `:focus-visible { outline: 2px solid #0E1E2B; outline-offset: 2px; }` on every interactive control.

---

## 4. Component Stylings

Only components required by KeurBon's 5 operational routes are specified. Generic marketing cards, nested cards, and eyebrow pills are excluded.

### 4.1 Top Navigation Bar & Mobile Navigation Drawer
- **Structure:** Single-row desktop header (`height: 68px`, max `80px`, `border-bottom: 1px solid #CFD8D4`, solid `#FAFBF9` surface with zero decorative blur). Left: KeurBon geometric emblem SVG + wordmark (`Outfit 700`). Center: 5 single-word route links (`Aperçu`, `Émettre`, `Encaisser`, `Coffre`, `Commerçants` / `Overview`, `Issue`, `Redeem`, `Vault`, `Vendors`). Right: Segmented `FR | EN` toggle + compact Role Switcher (`Paris` / `Dakar`).
- **Active State:** `--ink-primary` text (`600`), bottom `2px solid #0C5C44` underline indicator aligned to the header bottom border.
- **Mobile (`< 1024px`):** Brand mark + `FR | EN` toggle + `44x44px` Menu button opening a clean top-down navigation sheet listing all 5 routes plus the Role Switcher. Zero horizontal wrapping or overflow at `390px`.

### 4.2 Tactile Purpose Voucher Stub (Signature Artifact)
- **Role:** The focal artifact on `/` and `/issue`, representing a real Cashu NUT-11 P2PK bearer voucher.
- **Anatomy:**
  - Outer shell: `--surface-voucher` (`#FAFBF9`), `border: 1px solid #CFD8D4`, `border-radius: 16px`, `box-shadow: var(--elevation-stub)`.
  - Top security band (`height: 14px`): Inline SVG guilloche weave (`#0C5C44` and `#D98218` at `14%` opacity) capped by a `1px` rule.
  - Perforation divider: Dashed `1px` line with opposing semicircular cutout notches (`12px` radius) separating the **Voucher Value & Vendor Lock** body from the **Cryptographic Proof & Refund Stub**.
  - Inner radius rule: Concentric (`16px` outer, `16px` padding -> nested QR/token frame uses `8px` radius, or `12px` inner with `4px` inset where applicable).
- **States:**
  - *Draft / Editing:* Neutral `--border-hairline` border, outline seal badge (`Brouillon non verrouillé` / `Unlocked draft`).
  - *Locked (NUT-11 P2PK):* Triggers **Lock-Snap Seal** animation; Baobab Emerald seal (`#0C5C44` text on `#E5F2ED` with `1px solid #0C5C44`), tabular FCFA + sats display, truncated vendor `npub`, and locktime countdown.
  - *Claimed / Spent (NUT-7):* Muted opacity on token copy control, clear `Encaissé · Reçu Nostr` / `Redeemed · Nostr Receipt` emerald stamp.
  - *Expired / Refundable:* Warm Saffron tint (`#FBF2E6`) status strip with `--accent-saffron-solid` (`#9B5305`) label and direct `Récupérer les fonds` / `Reclaim funds` action.

### 4.3 Primary, Secondary & Destructive Buttons
- **Sizing:** Minimum `44px` height on all viewports (`padding: 10px 18px`), `border-radius: 8px`, `font-weight: 600`, single-line label (max 3 words), no decorative trailing arrows.
- **Primary (Action Emphasis):** Fill `--accent-saffron-solid` (`#9B5305`), text `#FAFBF9` (`5.57:1`). Hover: `#844604`. Active: `transform: scale(0.97)` over `120ms`.
- **Primary Verified (Vendor Claim / Cryptographic Confirm):** Fill `--brand-emerald` (`#0C5C44`), text `#FAFBF9` (`7.69:1`). Hover: `#094A36`.
- **Secondary:** Fill `#FAFBF9`, `border: 1px solid #637683`, text `#0E1E2B`. Hover: `#E3E9E5`.
- **Destructive:** Fill `#A62329`, text `#FAFBF9` (`6.99:1`), or outline `1px solid #A62329` with `#A62329` text on `#FBEBEC`.
- **Disabled:** `opacity: 0.48`, `cursor: not-allowed`, no hover/press transform, native `disabled` attribute.
- **Loading:** Preserves button width (zero layout shift), replaces icon with crisp 16px SVG ring spinner (`aria-busy="true"`), keeps action verb visible (`Verrouillage...` / `Locking...`).

### 4.4 Currency & Form Controls (FCFA / Sats, Vendor Picker, Locktime)
- **Labels:** Explicit `<label for="...">` directly above every control (`14px`, `600`, `--ink-primary`). Placeholder-as-label is forbidden.
- **Inputs:** `min-height: 46px`, `16px` font size, `#FAFBF9` fill, `1px solid #637683`, `border-radius: 8px`. Focus: `border-color: #0E1E2B` + `2px` focus ring.
- **Helper & Error Text:** Persistent helper text (`13px`, `--ink-muted`) below input; inline validation error (`13px`, `#A62329`, connected via `aria-describedby` and `role="alert"`) naming both the exact cause and the fix.
- **Quick Preset Chips:** Horizontal wrap group (`gap: 8px`, `min-height: 44px` tap targets) for FCFA denominations (`5 000`, `15 000`, `25 000`, `50 000`) and refund windows (`24h`, `72h`, `7j`). Active chip uses `--ink-primary` fill with `#FAFBF9` text.

### 4.5 Cryptographic Inspection Rail (`/redeem`)
- **Role:** Linear 3-row operational verification ledger showing real-time offline and mint checks for a pasted/scanned Cashu token:
  1. `Verrou NUT-11 P2PK` (Vendor pubkey match + refund locktime parsed offline)
  2. `Preuve NUT-12 DLEQ` (Offline cryptographic mint signature check)
  3. `Règlement & Reçu Nostr` (Mint Schnorr swap + zero-PII kind 30078 receipt broadcast)
- **States:** `idle` (empty prompt instructing vendor to paste token or scan QR), `loading` (sequential check indicator), `verified` (Baobab Emerald icon + tabular key fingerprint), `error` (Crimson `#A62329` banner explaining exact cryptographic failure, e.g. wrong vendor private key or already spent NUT-7 proof, with clear retry/reset action).

### 4.6 Hairline Operational Ledger Rows (`/ledger` & `/vendors`)
- **Structure:** Full-width hairline-ruled rows (`border-top: 1px solid #CFD8D4`, `padding: 16px 0`) instead of repeated cards. Desktop uses an aligned multi-column grid; mobile (`< 768px`) collapses each row cleanly into a 2-tier stacked record with zero horizontal scrolling.
- **Empty State:** Structured inline guidance row matching the ledger's typography and hairline grammar: states why the ledger is empty (`Aucun bon émis dans ce navigateur` / `No vouchers issued in this browser`) and provides a single direct primary button to `/issue` or a JSON backup import trigger.

---

## 5. Layout Principles & 5-Route Architecture

### Grid, Spacing & Measure
- **Spacing Scale:** Strict 4px/8px progression (`4, 8, 16, 24, 32, 48, 64px`). Tight grouping inside controls (`8px`), clear separation between distinct operational blocks (`32px to 48px`), more margin above headings than below.
- **Container:** `max-width: 1200px`, centered, horizontal gutters `16px` mobile / `32px` desktop.
- **Body Prose Measure:** `60ch to 72ch` maximum on desktop; `35ch to 55ch` on mobile.
- **Structural Fingerprint (6 Axes):**
  1. *Section-heading placement:* Left-aligned inline with content spine (zero eyebrows, zero decorative `01/02/03` numbering).
  2. *Body composition:* Asymmetric 7/5 and 5/7 split-desk grids alternating with full-width hairline-ruled operational tables.
  3. *Divider language:* Crisp `1px` hairline rules (`#CFD8D4`) plus perforated voucher notch line on the stub.
  4. *Button voice:* Solid rectangular (`8px` radius) Sahel Saffron primary + sharp outlined Slate secondary.
  5. *Visual treatment:* Tactile cryptographic Voucher Stub + crisp vector QR/seal geometry (zero decorative illustrations or stock photos).
  6. *Reveal pattern:* Subtle `scale(0.95) -> 1` single-play entrance + subject-grounded Lock-Snap seal on action.

### Complete 5-Route Map & Navigation Model
All 5 routes share the persistent top header on desktop (and mobile drawer on `< 1024px`) with deep-linkable URLs and predictable back navigation.

| Route | Title (FR / EN) | Primary User & Job | Structural Composition |
|---|---|---|---|
| `/` | `Aperçu` / `Overview` | Both roles + Btrust judges. Understand KeurBon, switch live demo persona (Paris Sender / Dakar Vendor), inspect an active Purpose Voucher Stub, and jump directly into issuing or redeeming. | Asymmetric 7/5 split desk: concise thesis + primary actions + hairline protocol spec table (left) beside a live tactile Purpose Voucher Stub (right). |
| `/issue` | `Émettre` / `Issue` | Diaspora sender (Paris/NY/Madrid). Convert FCFA to sats, choose a verified Dakar vendor & purpose category, set automatic refund locktime, mint a real Cashu NUT-11 P2PK voucher, and export via QR, SMS text, or print. | Asymmetric 5/7 live builder: left configuration desk (amount, vendor, locktime, mint button) paired with sticky right Purpose Voucher Stub that snaps locked on mint. |
| `/redeem` | `Encaisser` / `Redeem` | Dakar neighborhood vendor. Paste or scan a Cashu token, run offline NUT-11 lock inspection and NUT-12 DLEQ verification, claim with vendor Schnorr key, and publish a zero-PII Nostr receipt. | Full-width framed counter workspace: top token intake strip + 2-column verification rail & settlement receipt sheet below a crisp hairline divider. |
| `/ledger` | `Coffre` / `Vault` | Diaspora sender. Track all issued vouchers, check live NUT-7 spend state against the mint, monitor refund locktime countdowns, reclaim expired funds in one click, and export/import local JSON backup. | Summary totals bar (tabular mono) over a hairline-ruled operational ledger table with inline row actions (`Vérifier NUT-7`, `Récupérer`, `Copier`). |
| `/vendors` | `Commerçants` / `Vendors` | Senders, vendors, and auditors. Browse Dakar neighborhood vendors by category/district with `npub` fingerprints, and independently verify any zero-PII Nostr kind 30078 fulfillment receipt signature. | Filterable hairline vendor directory (left 7 cols) beside the independent Nostr Receipt Verifier utility panel (right 5 cols). |

### Desktop Wireframe: `/` Overview & `/issue` Split Desk
```text
+-----------------------------------------------------------------------------+
| [Mark] KeurBon   Aperçu  Émettre  Encaisser  Coffre  Commerçants   [FR|EN]  |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Des bons d'achat ciblés,           |  +---------------------------------+  |
|  verrouillés pour Dakar.            |  |//////// GUILLOCHE BAND /////////|  |
|                                     |  |  BON AFFECTÉ · SANTÉ            |  |
|  Concise 2-sentence explanation     |  |  25 000 FCFA   /   40 322 sats  |  |
|  of NUT-11 P2PK, NUT-12 offline     |  |  Pharmacie Médina · Dakar       |  |
|  DLEQ, and Nostr zero-PII receipts. |  ) - - - - - - - - - - - - - - - - (  |
|                                     |  |  npub1medina...9f4a             |  |
|  [ Émettre un bon ]  [ Comptoir ]   |  |  [SEAL: VERROUILLÉ NUT-11]      |  |
|                                     |  |  Expiration: 72h · Auto-refund  |  |
|  ---------------------------------  |  +---------------------------------+  |
|  NUT-11 P2PK   | Vendor pubkey lock |                                       |
|  NUT-12 DLEQ   | Offline proof check|                                       |
|  Nostr 30078   | Zero-PII receipt   |                                       |
+-----------------------------------------------------------------------------+
```

---

## 6. Depth & Elevation

- **Rule of One Elevation System:** Never combine a floating drop shadow and a heavy border on generic layout boxes ("ghost cards" are banned).
  - **Level 0 (`--surface-canvas` `#F1F4F2`):** Atmospheric daylight ground.
  - **Level 1 (Structural Chrome & Tables):** Separated strictly by `1px solid #CFD8D4` hairline rules or recessed `#E3E9E5` bands. `box-shadow: none`.
  - **Level 2 (`--elevation-stub`):** Applied ONLY to the tactile Purpose Voucher Stub (`0 2px 4px rgba(14, 30, 43, 0.05), 0 14px 32px -12px rgba(14, 30, 43, 0.14)`), giving the paper voucher unmistakable physical presence over the mineral desk.
  - **Level 3 (`--elevation-sheet-active`):** Applied ONLY to active modal dialogs, mobile navigation drawers, and print/QR overlays (`0 4px 8px rgba(14, 30, 43, 0.06), 0 20px 44px -14px rgba(14, 30, 43, 0.18)`).
- **Concentric Corner Radius Law:** `outerRadius = innerRadius + padding` (or explicit scale step). Outer Voucher Stub `16px`, sheets `12px`, inputs/buttons `8px`, ledger rules `0px`, status badges `9999px` only when compact (`<= 28px` height).
- **QR & Media Outlines:** Generated QR codes and printable previews carry a `1px solid rgba(0, 0, 0, 0.1)` crisp outline on `#FAFBF9` quiet zones so high-glare phone cameras scan reliably.

---

## 7. Do's and Don'ts

### Do
- Use French-first copy with proper diacritics (`Émettre`, `Vérifié`, `Remboursement`, `Commerçants`) and instant EN parity.
- Show real cryptographic data shapes (Cashu `cashuB...` token prefix, `npub1...` keys, NUT-11 locktime UNIX/human countdown, NUT-12 DLEQ boolean result, Nostr event ID) and clearly label any demo preset as `Démo` / `Demo`.
- Keep every primary CTA specific (`Verrouiller le bon`, `Encaisser au comptoir`, `Récupérer les sats`).
- Design complete `empty`, `loading`, `error`, and `success` states for every async mint or relay action.
- Use custom inline SVG icons (`1.75px` stroke, consistent geometric weight) with `aria-hidden="true"` beside text.

### Don't
- **No em dashes (Unicode U+2014)** anywhere in UI copy, headings, labels, or helper text. Use commas, colons, periods, or parentheses.
- **No eyebrow kickers or uppercase micro-tags** above headings. Let the heading carry its own weight.
- **No nested cards or 3-equal-column feature card grids.** Use split-desk layouts and hairline-ruled tables.
- **No emojis as UI icons.**
- **No banned palettes or faces:** No `#F4F1EA` cream + serif + terracotta, no dark dashboard shell, no Inter/Roboto/Arial/Space Grotesk as display, no Fraunces/Instrument Serif, no purple/indigo AI gradients.
- **No fabricated claims, fake statistics, or fake testimonials.** Never display invented user counts, volume numbers, or quotes.
- **No `transition: all` or `scale(0)` entrances.**

---

## 8. Responsive Behavior

| Breakpoint | Target Device | Grid & Navigation Behavior | Touch & Typography Guarantees |
|---|---|---|---|
| `390px` (Mobile floor `375px`) | Mid-range Android phones in Dakar & diaspora mobile | Strict single-column collapse on all split-desk sections (`< 768px`). Top nav condenses to Mark + `FR|EN` + `44x44px` Menu drawer trigger. Ledger rows stack cleanly into 2-tier hairline blocks. Zero horizontal overflow (`scrollWidth <= clientWidth`). | Body text `>= 16px` (prevents iOS zoom). All buttons, chips, and inputs `>= 44x44px` with `>= 8px` gap. Safe-area padding (`env(safe-area-inset-bottom)`) on sticky footers/drawers. `min-h-[100dvh]`. |
| `768px` (Tablet) | Portrait tablets / small laptops | 2-column asymmetric split activates (`grid-template-columns: 1fr 1fr` on `/issue`, `7fr 5fr` on `/`). Gutters widen to `24px`. | Keyboard tab order follows visual reading flow top-to-bottom, left-to-right. |
| `1024px` (Desktop) | Standard laptops | Full single-line desktop navigation bar (all 5 routes + `FR|EN` + Role Switcher on one line, `<= 72px` height). Sticky Purpose Voucher Stub on `/issue`. | Prose measure capped at `65ch`. |
| `1440px` (Wide) | Judge & desktop monitors | `1200px` max-width container stays centered over the mineral daylight canvas with generous structural whitespace. | No edge-to-edge text sprawl; tabular ledger columns align cleanly. |

**Low-Bandwidth 3G/2G Resilience:** Zero external icon CDNs, zero WebGL, zero heavy raster hero photos, self-hosted subsetted `@fontsource` woff2 files, and full offline NUT-11 / NUT-12 inspection before any network call is needed.

---

## 9. Signature, Motion & Depth

### Motion Tier & Tokens
- **Declared Dials:** `ENERGY 2 / RHYTHM 2 / MOTION 2` and `VARIANCE 6 / MOTION 5 / DENSITY 5`.
- **Curves:** Primary deceleration `cubic-bezier(0.23, 1, 0.32, 1)`; symmetric state shifts `cubic-bezier(0.77, 0, 0.175, 1)`. Never use `ease-in` on entrances.
- **Properties:** Animate `transform` and `opacity` only (plus targeted `border-color` / `background-color` on hover). Never use `transition: all`.

### Motion Plan Across Interactions
1. **Page / Section Entrance:** Content blocks enter once from `opacity: 0; transform: translateY(10px) scale(0.95)` to `opacity: 1; transform: translateY(0) scale(1)` over `260ms` with `cubic-bezier(0.23, 1, 0.32, 1)`. Stagger between primary columns capped at `45ms`. Scroll-revealed sections play once and remain visible permanently.
2. **Tactile Press Feedback:** Buttons and interactive chips scale to `0.97` on `:active` over `120ms`.
3. **Frequency-Gated Controls:** High-frequency actions (keyboard Tab navigation, `FR | EN` text swap, FCFA numeric keystrokes, Escape close) do not animate to keep data entry instantaneous.
4. **Signature Moment: Cryptographic Lock-Snap Seal:**
   - **Trigger:** Locking a NUT-11 P2PK voucher on `/issue` or completing offline NUT-12 DLEQ verification on `/redeem`.
   - **Choreography (`420ms` total):**
     - `0%`: Seal starts at `opacity: 0; transform: scale(1.18) rotate(-4deg)`.
     - `55%`: Snaps firmly onto the voucher stock at `opacity: 1; transform: scale(0.96) rotate(0deg)`.
     - `100%`: Settles cleanly at `opacity: 1; transform: scale(1) rotate(0deg)` while the surrounding stub executes a single subtle `translateY(2px) -> 0` tactile settle and a single emerald hairline ring fades out (`scale(1) -> scale(1.06)`, `opacity: 0.45 -> 0`).
   - **Subject Grounding:** Mirrors the physical satisfaction of an official postal counter ink stamp sealing a verified bearer voucher.
5. **Reduced-Motion Fallback (`@media (prefers-reduced-motion: reduce)`):**
   - Disables all scale, translate, and rotation keyframes.
   - Replaces entrance and Lock-Snap Seal with an immediate opacity reveal (`duration: 0.01ms`) so the verified Baobab Emerald seal and updated voucher state remain unmistakably clear with zero spatial motion.

### Depth & Background Summary
- **Background Treatment:** Layered Mineral Mist Paper (`#F1F4F2`) with subtle Atlantic-emerald and Sahel-saffron daylight radial washes plus geometric guilloche security linework on the voucher stub.
- **Depth Language:** Flat `1px` borders for layout and ledger architecture; selective layered offset shadow reserved strictly for the tactile Purpose Voucher Stub and active sheets; `None` for WebGL/3D (justified by outdoor mid-range mobile performance in Dakar).
