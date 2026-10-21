---
name: Institutional Utility Baseline
colors:
  surface: '#f6fafc'
  surface-dim: '#d6dbdd'
  surface-bright: '#f6fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f6'
  surface-container: '#eaeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#dfe3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2c3133'
  inverse-on-surface: '#edf1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#4a5f7f'
  primary: '#07203c'
  on-primary: '#ffffff'
  primary-container: '#203653'
  on-primary-container: '#8a9fc1'
  inverse-primary: '#b2c8ec'
  secondary: '#016a62'
  on-secondary: '#ffffff'
  secondary-container: '#9defe3'
  on-secondary-container: '#0d6f66'
  tertiary: '#2b1e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#453201'
  on-tertiary-container: '#b69a5f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#b2c8ec'
  on-primary-fixed: '#021c38'
  on-primary-fixed-variant: '#324866'
  secondary-fixed: '#a0f1e6'
  secondary-fixed-dim: '#84d5ca'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#fedf9d'
  tertiary-fixed-dim: '#e1c384'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#584411'
  background: '#f6fafc'
  on-background: '#181c1e'
  surface-variant: '#dfe3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes an institutional-grade, highly dependable digital utility for academic residential infrastructure. Built specifically for complex room allocation, verification workflows, and student occupancy administration, the aesthetic balances collegiate prestige with contemporary administrative efficiency.

The visual style is **Corporate / Modern**, guided by precise functionalism:
- **Tone:** Authoritative, dependable, crystal clear, and structured.
- **Audience:** Collegiate administrators, housing wardens, and university students seeking transparent and equitable room reservations.
- **Emotional Drivers:** High trust, procedural fairness, low anxiety, and unambiguous data representation.
- **Visual Rhythm:** Crisp surface tiers, micro-radii, balanced hairline borders, and strict tabular alignment. The system eschews decorative excess in favor of legibility, structured grids, and instant status recognition.

## Colors

The color system delivers high legibility and operational clarity across dense inventory maps, data tables, and application processes:

- **Primary (`#203653` - Deep Institutional Navy):** Used for primary action buttons, high-level navigation chrome, key brand markers, and active selection anchors.
- **Secondary (`#2C8279` - Muted Teal):** Provides progressive emphasis, focused states, interactive badges, and successful stage progress.
- **Tertiary (`#D4B779` - Sandstone Gold):** Highlights premium quotas, merit tiers, and specialized structural notices without invoking hazard warnings.
- **Neutral (`#E2E6E8` - Border Neutral):** Forms the backbone of clean component outlines, structural dividers, and subtle table gridlines.
- **Backgrounds & Canvas Surfaces:**
  - Base Canvas: Warm Ivory (`#F7F6F1`) to reduce glare during long administrative sessions.
  - Surface Card / Modal: Solid White (`#FFFFFF`).
  - Subtle Surface Tints: Soft Mint (`#E7F2ED`) for active occupancy rows and contextual banners.
- **Typography & Content Hierarchy:**
  - Deep Text (`#263345`): High-contrast editorial headlines, form labels, and critical metrics.
  - Secondary Text (`#627084`): Subtitles, helper text, and inactive metadata.
- **Functional Allocation Status System:**
  - Available Bed / Unit: `#1E7B54` (Forest Green).
  - Roommate Intent / Reservation Pending: `#E06A26` (Warm Orange).
  - Occupied / Unavailable: `#C93B3B` (Crimson Red).
  - Active Selection / Outline Focus: `#1D63B8` (Direct Blue).
  - System Alert / Notice: `#D97706` (Amber Warning).

## Typography

Typography relies on **Inter** configured with tabular lining numbers (`tnum`, `lnum`) to ensure precision in room counts, USN IDs, block identifiers, and statistical capacity boards.

- **Scale & Rhythm:** Modest sizing steps prioritize density and clarity over theatrical contrast. Headlines feature tight letter-spacing to emphasize authority without appearing heavy.
- **Data Grids & Bed Matrices:** Tabular figures must be enforced on all numeric metrics, timestamps, and capacity counts to prevent layout jitter during live updates.
- **Uppercase Usage:** Reserved exclusively for micro-labels (`label-sm`), university acronyms, block designations, and room status tags with increased letter-spacing (`+0.04em`).

## Layout & Spacing

The layout model employs a responsive 12-column grid system tuned for dense inventory management, structural forms, and contextual side panels:

- **Desktop (1280px+):** 12 columns, 24px gutters, fixed structural sidebar (260px) housing collegiate navigation, fluid master-detail split screens.
- **Tablet (768px – 1279px):** 8 columns, 16px gutters, collapsible drawer navigation, stacked filter ribbons.
- **Mobile (< 768px):** 4 columns, 12px gutters, 16px screen margin. Room selection grids shift from architectural matrices into vertical list cards.
- **Vertical Spacing Rhythm:** Strictly anchored to multiples of 4px and 8px. Form inputs use compact 8px internal gaps, while dashboard KPI summary cards feature 16px internal padding with 16px grid separation.

## Elevation & Depth

Visual hierarchy is maintained through structured **tonal layering and low-contrast outlines** rather than heavy drop shadows:

- **Surface Levels:**
  - Base: Flat `#F7F6F1` canvas.
  - Surface Level 1 (Panels, Cards, Tables): Solid `#FFFFFF` bordered with `1px solid #E2E6E8`.
  - Surface Level 2 (Selected Units, Floating Filter Bars, Tooltips): `#FFFFFF` elevated with a refined, ultra-diffused shadow: `0 4px 12px -2px rgba(32, 54, 83, 0.08)`.
  - Active Selection / Drag State: Elevated border halo `2px solid #1D63B8` combined with an ambient highlight `0 0 0 3px rgba(29, 99, 184, 0.15)`.
- **Modals & Flyouts:** Surface `#FFFFFF` encased in `1px solid #E2E6E8`, underpinned by an institutional backdrop dim of `rgba(23, 40, 59, 0.45)`.

## Shapes

The design system enforces a soft, structured micro-radius (`roundedness: 1`):
- **Base Components (Inputs, Buttons, Badges, Dropdowns):** `4px` (`0.25rem`). This preserves crisp lines and high data density across floor matrices.
- **Containers & Cards:** `8px` (`0.5rem`). Applied to room detail cards, metric widgets, and allocation dialogs.
- **Modal Dialogs & Main Sheets:** `12px` (`0.75rem`) max boundary radius.
- **Bed & Seat Tokens:** Rectilinear `4px` modules reflecting architectural floorplans rather than circular tokens.

## Components

### Buttons
- **Primary:** Background `#203653`, text `#FFFFFF`, border `none`, hover background `#17283B`. Active press state shifts down `1px`.
- **Secondary (Progressive):** Background `#2C8279`, text `#FFFFFF`, hover background `#236B63`. Used for progression actions like "Confirm Bed Allocation."
- **Tertiary / Neutral Outline:** Background `#FFFFFF`, text `#263345`, border `1px solid #E2E6E8`. Hover background `#F7F6F1`.
- **Destructive:** Background `#FFFFFF`, text `#C93B3B`, border `1px solid #C93B3B`. Hover background `#FFF5F5`.
- **Dimensions:** Height 36px for standard forms, 44px for primary mobile calls-to-action; padding 0 16px.

### Badges & Status Chips
- Height 24px, 4px border radius, font `label-sm`.
- **Available:** Background `#E7F2ED`, text `#1E7B54`, border `1px solid #A8D5C2`.
- **Occupied:** Background `#FDE8E8`, text `#C93B3B`, border `1px solid #F8B4B4`.
- **Reserved / Roommate Intent:** Background `#FFF0E6`, text `#E06A26`, border `1px solid #FFD1B3`.
- **Special / NRI / Merit Quota:** Background `#FAF4E6`, text `#9C7A2E`, border `1px solid #D4B779`.

### Interactive Allocation Grid (Bed Matrix)
- Interactive room cubes representing Single, Double, Triple, or Quad occupancies.
- **Unselected / Vacant Bed:** `#FFFFFF` background, `1px solid #E2E6E8` outline with green status indicator dot.
- **Selected Bed:** `1.5px solid #1D63B8` outline, `#EBF3FC` background fill, blue badge marker.
- **Locked / Occupied Bed:** `#F0F2F4` fill, muted crosshatch or secondary text indicating occupant USN.

### Form Inputs & Selects
- Height 38px, surface `#FFFFFF`, text `#263345`, placeholder `#627084`.
- Border `1px solid #E2E6E8`. Hover border `#627084`. Focus border `1.5px solid #203653` with zero optical jump.
- Error state: Border `#C93B3B`, contextual inline message below in `body-sm`.

### Metric & KPI Cards
- Base `#FFFFFF`, border `1px solid #E2E6E8`, internal padding 16px.
- Metric values rendered in `Inter Bold` with tabular numbers. Includes accompanying secondary caption (`Total Rooms`, `Available Beds`, `Applications Under Review`).

### Tables & Student Data Rows
- Header row: Surface `#F7F6F1`, text `label-md` `#627084`, uppercase tracking, border bottom `1px solid #E2E6E8`.
- Cell rows: `#FFFFFF` background, 44px minimum height, border bottom `1px solid #E2E6E8`. Hover state tint `#F7F6F1`.