---
name: Precision Admin
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#434654'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#4c5e83'
  on-secondary: '#ffffff'
  secondary-container: '#bfd2fd'
  on-secondary-container: '#475a7e'
  tertiary: '#34445f'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b5b78'
  on-tertiary-container: '#c3d3f5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#b4c7f1'
  on-secondary-fixed: '#041b3c'
  on-secondary-fixed-variant: '#34476a'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#b7c7e8'
  on-tertiary-fixed: '#091c35'
  on-tertiary-fixed-variant: '#374763'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is engineered for high-density information environments where clarity, speed of recognition, and professional reliability are paramount. The target audience consists of data analysts, system administrators, and operations managers who require a tool that recedes into the background to let the data lead.

The aesthetic follows a **Corporate / Modern** approach with a focus on **High-Contrast** utility. It prioritizes functional minimalism, utilizing generous whitespace not for artful expression, but for cognitive decompression in data-heavy views. The UI should feel objective, systematic, and authoritative, evoking a sense of calm control through perfect alignment and logical hierarchy.

## Colors

The palette is anchored by a sterile primary white background to maximize contrast and minimize visual noise. 

- **Primary Action**: A vibrant Corporate Blue (#0052CC) is reserved exclusively for interactive elements, primary buttons, and active navigational states.
- **Typography**: Dark Navy (#172B4D) is used for headings and primary text to ensure WCAG AAA compliance. Secondary text uses a Slate Gray (#42526E).
- **Surface**: A subtle light gray (#F4F5F7) is used for sidebar backgrounds and secondary containers to create clear structural zoning without relying on heavy borders.
- **Success/Warning/Error**: Use standard semantic colors (Green, Amber, Red) but maintain the same saturation levels as the primary blue for visual cohesion.

## Typography

The system utilizes **Inter** as the primary typeface due to its exceptional legibility in UI contexts and its systematic, neutral character. For data-specific strings, IDs, and technical labels, **JetBrains Mono** is employed to provide a clear visual distinction between narrative text and system data.

- **Headings**: Use tight tracking and semi-bold/bold weights to anchor page sections.
- **Body**: Default to 14px for standard dashboard views to maximize information density without sacrificing readability.
- **Monospace**: Use exclusively for "status" chips, IDs, and tabular figures to ensure numerical alignment.

## Layout & Spacing

The layout is built on a **12-column fluid grid** for the main content area, paired with a **Fixed Sidebar** (typically 240px or 280px). 

- **Grid System**: Use a 24px gutter to maintain clear separation between data widgets.
- **Spacing Rhythm**: A strict 4px baseline grid governs all internal padding. Use 16px (md) for standard padding within cards and 8px (sm) for related grouped elements.
- **Responsive Behavior**: On tablets, the sidebar collapses into a hamburger menu. On mobile, grid columns stack vertically, and horizontal padding reduces to 16px to conserve screen real estate.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, flat professional look.

- **Level 0 (Background)**: The base canvas is white (#FFFFFF) or light gray (#F4F5F7).
- **Level 1 (Cards/Containers)**: Background is white with a 1px solid border (#DFE1E6). No shadow is used for static elements.
- **Level 2 (Overlays/Dropdowns)**: Uses a very soft, high-diffusion shadow (0px 4px 12px rgba(0,0,0,0.08)) to indicate temporary elevation over the base content.
- **Interaction**: On hover, interactive cards should not lift but rather change border color to the primary blue or add a subtle background tint.

## Shapes

The shape language is **Soft** (Level 1), utilizing a 4px (0.25rem) radius for standard components like buttons and input fields. This provides a modern touch while maintaining the structured, "squared-off" feel appropriate for a professional enterprise environment. Large containers (cards) may use up to 8px (0.5rem) to distinguish major sections of the UI.

## Components

- **Buttons**: Primary buttons are solid Corporate Blue with white text. Secondary buttons use a transparent background with a 1px border. No gradients or inner shadows.
- **Input Fields**: 1px solid border (#DFE1E6). On focus, the border changes to Corporate Blue with a 2px outer glow (halo) of the same color at 20% opacity.
- **Data Tables**: Zero-border on individual cells; use horizontal dividers only (#DFE1E6). Row zebra-striping is optional for very wide tables, using #F4F5F7.
- **Chips/Badges**: Small (10px-12px) with a subtle background tint and dark text (e.g., a "Success" badge has a pale green background and dark green text).
- **Cards**: Pure white background, 1px border, no shadow. Headers within cards should have a subtle bottom divider to separate titles from content.
- **Sidebar**: High-contrast dark navy (#172B4D) or light gray (#F4F5F7). Active items are indicated by a vertical 3px bar in Corporate Blue on the leading edge.