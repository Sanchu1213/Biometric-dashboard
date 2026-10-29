---
name: Navkis College HR & Biometrics
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001d31'
  on-tertiary-container: '#188ace'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a professional, institutional aesthetic tailored for academic human resources and biometric attendance tracking at Navkis College of Engineering. The visual narrative balances authoritative institutional trust with modern digital efficiency. 

The aesthetic is anchored in a **Corporate / Modern** framework, prioritizing extreme legibility, high predictability, and functional clarity. The emotional response is one of calm assurance, precision, and operational reliability—critical for administrative staff, faculty, and institutional leadership managing sensitive attendance and personnel data.

- **Primary Persona:** Institutional administrators and HR personnel seeking rapid data ingestion and zero-friction reporting.
- **Tone:** Authoritative, clean, structured, and respectful of academic dignity.
- **Visual Distinction:** Restrained use of color, high-density data presentation with generous breathing room, and absolute clarity in status communication.

## Colors

The color palette is purposefully restrained, utilizing deep slate and navy tones to convey institutional stability, contrasted with crisp light backgrounds and precise semantic status indicators.

- **Primary (`#0f172a`):** Deep slate-navy used for primary structural headers, major typographic hierarchy, and dominant interactive elements.
- **Secondary (`#1e3a8a`):** Rich academic navy reserved for active states, primary buttons, and key navigation highlights.
- **Tertiary (`#0284c7`):** Professional sky blue utilized for supporting data visualizations, links, and informational tags.
- **Neutral (`#f8fafc`):** Clean, pale slate-white canvas providing an optimal, low-fatigue reading background for dense data tables and dashboard cards.
- **Semantic Status Tones:** Positive green (`#15803d`) for verified attendance, warning amber (`#b45309`) for late arrivals or pending reviews, and negative red (`#b91c1c`) for absences and security exceptions.

## Typography

Typography functions as the primary vehicle for data hierarchy in this dense administrative dashboard. **Inter** is selected for its neutral, systematic, and utilitarian character, ensuring flawless readability across complex data tables, biometric logs, and analytical charts.

- **Scale & Density:** Type sizes are optimized for high-information-density screens. Body text is set at a crisp 14px for data grids, stepping up to 16px for primary descriptions.
- **Weights:** Restricted primarily to Regular (400), Medium (500), and Semi-bold (600) to maintain a sober, professional register. Avoid light or heavy display weights.
- **Mobile Adjustments:** `headline-xl` scales down to 26px on viewports under 768px to prevent awkward wrapping in mobile administrative headers.

## Layout & Spacing

The layout is constructed on a **Fixed grid** philosophy with responsive fluid breakpoints, ensuring that administrative dashboards align predictably across widescreen desktop monitors used in HR offices and tablets carried by floor wardens.

- **Grid Structure:** 12-column structural grid on desktop, compressing to 4 columns on mobile devices.
- **Rhythm:** Built on an 8px foundational spacing scale. Gutters are held at a consistent 24px (`1.5rem`) to cleanly separate dashboard widgets without creating disjointed isolation.
- **Responsive Behavior:** Outer margins scale from 16px on mobile to 32px on desktop. Sidebar navigation locks to a fixed width of 260px on desktop and collapses into an off-canvas drawer on smaller viewports.

## Elevation & Depth

Visual hierarchy relies on **Low-contrast outlines** combined with subtle **Tonal layers**, avoiding heavy drop shadows in favor of a clean, flat, institutional paper metaphor.

- **Surfaces:** Use pure white (`#ffffff`) surfaces floating atop the pale slate neutral background (`#f8fafc`) to denote interactive cards and data containers.
- **Borders:** Define spatial boundaries using crisp, low-contrast slate borders (`#e2e8f0`). Avoid pure black borders.
- **Shadows:** Reserve ultra-soft, diffused shadows (`0 1px 3px rgba(15, 23, 42, 0.05)`) exclusively for floating elements like dropdown menus, modals, and sticky table header rows.

## Shapes

A **Soft** shape language (`0.25rem` base rounding) is deployed to soften the inherent rigidity of data-heavy administrative interfaces without sacrificing corporate seriousness.

- **Containers & Cards:** Standard cards, input fields, and modal containers use `0.5rem` (`rounded-lg`) corner radii to feel approachable yet structured.
- **Badges & Pills:** Status indicators, avatars, and data tags utilize full pill rounding (`9999px`) to instantly differentiate meta-information from structural content.
- **Interactive Controls:** Buttons and form inputs maintain a consistent `0.375rem` radius for a responsive, tactile feel.

## Components

Components are engineered for high-throughput administrative workflows, minimizing clicks and maximizing data clarity.

- **Buttons:** Primary actions utilize deep navy (`#0f172a`) backgrounds with white text and subtle hover darkening. Secondary actions use ghost borders with slate text. Destructive actions (e.g., revoking biometric access) use semantic red.
- **Status Badges:** Compact pill indicators utilizing soft background tints and solid semantic text (e.g., Light green background with `#15803d` text for "Present").
- **Input Fields:** Clean bordered fields featuring high-contrast placeholder text (`#64748b`), clear focus rings in secondary navy (`#1e3a8a`), and embedded icon slots for search and biometric device IDs.
- **Data Tables:** The cornerstone component. Features sticky headers, alternating row hover states (`#f1f5f9`), right-aligned numeric data, and embedded status badges.
- **Cards & Metric Widgets:** Elevated white containers showcasing key biometric KPIs (e.g., Total Attendance Rate, Late Entries, Biometric Sync Status) with large metric typography and subtle trend indicators.
- **Biometric Log Feeds:** Specialized timeline lists displaying real-time entry/exit logs with device identifier tags and timestamp micro-typography.