---
name: Luminescent Slate
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#1f1f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e4e2e4'
  on-surface-variant: '#c0c6d6'
  inverse-surface: '#e4e2e4'
  inverse-on-surface: '#303032'
  outline: '#8b91a0'
  outline-variant: '#414754'
  surface-tint: '#aac7ff'
  primary: '#aac7ff'
  on-primary: '#003064'
  primary-container: '#3e90ff'
  on-primary-container: '#002957'
  inverse-primary: '#005db8'
  secondary: '#47e266'
  on-secondary: '#003910'
  secondary-container: '#09bf49'
  on-secondary-container: '#004615'
  tertiary: '#e9b3ff'
  on-tertiary: '#510074'
  tertiary-container: '#c863fb'
  on-tertiary-container: '#460066'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00468d'
  secondary-fixed: '#6cff82'
  secondary-fixed-dim: '#47e266'
  on-secondary-fixed: '#002106'
  on-secondary-fixed-variant: '#00531a'
  tertiary-fixed: '#f6d9ff'
  tertiary-fixed-dim: '#e9b3ff'
  on-tertiary-fixed: '#310048'
  on-tertiary-fixed-variant: '#7200a3'
  background: '#131315'
  on-background: '#e4e2e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 3rem
  margin-sm: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an uncompromising dedication to clarity, restraint, and tactile precision inspired directly by the principles of Apple Human Interface Guidelines. It operates primarily as a canvas for user focus: high contrast, ultra-refined dark aesthetics, and purposeful optical depth. 

The aesthetic is built upon modern glassmorphic architecture. It balances deep, obsidian-like planes with frosted crystalline translucency, precise inner highlights, and vibrant, luminous iOS/macOS system accents. It serves professionals and power users who expect instantaneous comprehension, whisper-quiet layouts, and sophisticated micro-interactions. Every visual component conveys physical intent without visual clutter—utilizing generous negative space, crisp hairline boundaries, and brief, punchy typographic direction.

## Colors

The palette revolves around deep, authentic chromatic blacks accented by Apple-native vibrant hues that pierce through the darkness with crystal clarity.

- **Background Canvas & Surfaces:** The absolute base surface is `#000000`, stepping up to `#1C1C1E` (surface-elevated-primary) and `#2C2C2E` (surface-elevated-secondary). Semi-transparent layers leverage translucent values (`rgba(255, 255, 255, 0.05)` through `rgba(255, 255, 255, 0.12)`) over blurs.
- **Accents:** 
  - **Electric Cyan (`#0A84FF`)**: Primary action, active navigation tabs, interactive state highlights.
  - **Emerald Neon (`#30D158`)**: Positive confirmations, telemetry status, financial growth indicators, live states.
  - **Vibrant Purple (`#BF5AF2`)**: Feature callouts, badges, creative modes, AI/intelligence touchpoints.
- **Text & Foreground Hierarchy:**
  - **Primary Label:** `#FFFFFF` (100% white for pristine contrast)
  - **Secondary Label:** `rgba(235, 235, 245, 0.60)`
  - **Tertiary Label:** `rgba(235, 235, 245, 0.30)`
  - **Separators & Strokes:** `rgba(255, 255, 255, 0.08)` hairline borders

## Typography

Typography delivers immediate scannability using crisp, geometric sans-serif shapes with optical tracking calibrations matching Apple's dynamic type curve.

- **Weight Strategy:** Headlines favor semibold (`600`) and bold (`700`) weights with tight negative letter tracking to produce solid visual anchor points. Body text stays lightweight (`400`) to guarantee high legibility across dark surfaces without bloom.
- **Copy Restraint:** Micro-copy must remain short, declarative, and imperative. Eliminate filler phrasing and explanatory paragraphs where interface patterns or status chips communicate intent intuitively.
- **Responsive Handling:** Desktop displays leverage negative letter-spacing (-0.03em) on display sizes for punchy editorial strength, while mobile breakpoints downscale headline sizes smoothly to maintain balanced viewports.

## Layout & Spacing

This layout system operates on an 8pt spatial grid with generous breathing room to isolate interactive focal points.

- **Canvas & Grids:** A 12-column responsive fluid grid anchored by maximum content containers (`1280px`). Gutters scale from `1rem` on mobile to `1.5rem` on desktop. Outer canvas margins contract to `1.25rem` on mobile while expanding to `3rem` on desktop for an uncluttered, spacious frame.
- **Spacing Rhythm:** Layout elements maintain clean breathing room via consistent gap tokens. Tightly coupled internal elements (icon-to-text, badge internals) rely on `space-xs` and `space-sm`. Macro sections, nested cards, and module stacks leverage `space-lg` and `space-xl`.
- **Adaptation Rules:** Multi-column dashboard tiles fold cleanly from 3-4 columns on desktop down to 2 columns on tablet, resolving to a single-column stacked card hierarchy on mobile screens.

## Elevation & Depth

Visual hierarchy does not use murky, dark drop shadows. Instead, it relies on Apple-style optical translucency, specular boundary highlights, and stacked ambient glass.

- **Backdrop Diffusion:** Glassmorphic surfaces use intense background blur (`backdrop-filter: blur(24px) saturate(180%)`) paired with low-opacity dark tints (`rgba(28, 28, 30, 0.72)`).
- **Hairline Strokes:** Surfaces are framed with an ultra-thin boundary stroke (`1px solid rgba(255, 255, 255, 0.08)`). Elevated or interactive hover panels step up this highlight to `rgba(255, 255, 255, 0.16)`.
- **Inner Specular Gleam:** Top-level elevated cards incorporate an inner rim highlight (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.10)`) to simulate the refraction of milled frosted crystal.
- **Floating Modals & Overlays:** Highest-tier elements (sheets, popovers, action sheets) combine backdrop blur with a subtle tinted shadow (`0 20px 48px rgba(0, 0, 0, 0.65)`).

## Shapes

The shape system relies on continuous, super-elliptical curvature (squircle morphology) reflecting hardware enclosure corners.

- **Containers & Shells:** Standard interface cards utilize `rounded-2xl` (`1.5rem` / `24px`) to `rounded-3xl` (`2rem` / `32px`), producing smooth transitions between content boundaries.
- **Pills & Chips:** All badges, action chips, input tags, and standard buttons adopt full pill shapes (`rounded-full` / `9999px`). 
- **Nested Curvature Match:** Child elements placed inside rounded containers preserve concentricity by calculating child radii proportionally to prevent awkward corner clashing.

## Components

### Buttons
- **Primary:** Full pill profile (`rounded-full`). Filled with solid `#0A84FF` (or contextual accent `#30D158`), pure white typography, `font-weight: 600`. Subtle top highlight line (`inset 0 1px 0 rgba(255, 255, 255, 0.2)`).
- **Secondary (Glass):** Frosted pill with `background: rgba(255, 255, 255, 0.08)`, `backdrop-blur: 16px`, bordered with `rgba(255, 255, 255, 0.08)`. On hover: `background: rgba(255, 255, 255, 0.14)`.
- **Destructive:** Frosted dark base with text and active borders set to `#FF453A`.

### Badges & Pill Chips
- **Status Indicators:** Fully rounded capsule pills (`padding: 4px 10px`, `label-sm`).
- **Styling:** Low-opacity tinted glass fills corresponding to meaning (e.g., `#30D158` at `12%` opacity with `#30D158` text and `rgba(48, 209, 88, 0.25)` hairline border).
- **Indicator Dot:** Optional 6px circular jewel dot with a soft radial glow (`box-shadow: 0 0 6px currentColor`).

### Cards & Panels
- **Base Card:** Built with `border-radius: 24px`, `background: rgba(28, 28, 30, 0.65)`, `backdrop-filter: blur(20px)`, and `border: 1px solid rgba(255, 255, 255, 0.08)`. 
- **Interior Padding:** Consistent `space-lg` (`1.5rem`).
- **Interactive State:** Hover elevates border luminance to `rgba(255, 255, 255, 0.16)` and slightly brightens the interior fill.

### Input Fields
- **Container:** Rounded pill or `rounded-xl` container with subtle recessed translucent fill (`rgba(0, 0, 0, 0.40)`), enclosed by `1px solid rgba(255, 255, 255, 0.10)`.
- **Text & Placeholder:** Input value in `#FFFFFF`, placeholder text subdued to `rgba(235, 235, 245, 0.30)`.
- **Focus:** Crisp outline in `#0A84FF` with zero offset shadow, preserving razor-sharp edge precision.

### Lists & Row Groups
- **Inset Grouped Style:** Lists follow the iOS inset card structure, gathering related rows inside a single glass container with `rounded-2xl` corners.
- **Row Dividers:** Hairline divider lines (`rgba(255, 255, 255, 0.06)`) indented to align with textual content, omitting the divider beneath the final row.

### Checkboxes, Toggles & Radios
- **Switches:** Classic iOS-style smooth pill toggles. Inactive state: `rgba(255, 255, 255, 0.16)` track. Active state: vibrant `#30D158` track with a stark white circular thumb casting a soft ambient drop shadow.
- **Checkboxes & Radios:** Circular indicators featuring a hairline perimeter, filling smoothly with `#0A84FF` and a crisp white inner icon upon selection.

### Segmented Controls
- **Dock Container:** Glass capsule with recessed dark fill (`rgba(0, 0, 0, 0.35)`) and `p-1` interior padding.
- **Active Segment:** Distinct elevated glass thumb (`background: rgba(255, 255, 255, 0.14)`, `backdrop-blur: 12px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.4)`), moving smoothly between segments.