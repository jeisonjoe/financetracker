# UI Design & Styling Rules

## Typography & Text Styling
- **Uppercase & Tracking:** Avoid using uppercase text (`text-transform: uppercase`) and custom letter spacing (`tracking`) unnecessarily. Use uppercase and tracking only when explicitly necessary.
- **Font Weight Restrictions:** Do not use `bold` font weight (700+). Bold is the lowest priority. Stick strictly to `regular` (400), `medium` (500), and `semibold` (600, maximum allowed weight).

## Elevation & Borders
- **Shadows & Glows:** Avoid heavy `box-shadow` or glow effects unless explicitly requested.
- **Borders:** Do not impose harsh, stark, or high-contrast borders on containers, cards, and UI elements.

## Layout & Components
- **Eyebrows:** Do not add eyebrow labels (small sub-headers/labels above main titles) unnecessarily.

## Theme & Color Scheme
- **Light Mode Only:** The application operates exclusively in Light Mode. Do not include dark mode (`dark:`) utility classes or dark theme variants.

## Scrolling & Scrollbars
- **Global Custom Scrollbar:** Always enforce the custom sleek scrollbar style across all scrolling elements and containers (`overflow-y-auto`, `overflow-x-auto`, `overflow-auto`, lists, sidebars, modals, dropdowns). Never allow default operating system or browser scrollbars (such as grey Windows scrollbars) to appear.
- **Scrollbar Specs:** Use thin, transparent-track scrollbars with rounded translucent thumbs (`var(--theme-scrollbar-thumb)`). When hiding scrollbars completely, use `.no-scrollbar`.

## Design Consistency
- **Design System Alignment:** Always inspect and strictly match the existing application's design system (color tokens, typography, button styles, borders, and modal structures) before creating or modifying UI elements. Ensure complete visual harmony across all screens.

# Codebase Architecture & Workflow Guidelines

## Code Quality & Reusability
- **DRY & Standardization:** Always implement features in a standardized, modular way. Avoid code duplication across files to maintain long-term codebase health.
- **Component Reusability:** Audit existing UI elements and utilities before building new ones. Always reuse existing components or extract reusable components before building new features.

## Requirements & Decision Making
- **Solution Evaluation:** When presented with a new requirement, evaluate available options to choose the cleanest, most maintainable solution before proceeding.
- **No Assumptions:** Do not guess or make assumptions on ambiguous requirements. Always ask for explicit clarification.
