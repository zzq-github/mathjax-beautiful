# vue-mathjax-beautiful

## 1.4.2

### Patch Changes

- Fix local image insertion by preserving sanitized `blob:` image sources (#7).
- Restore the editor caret when inserting images or formulas, cancelling the formula dialog, and editing existing formulas; keep formula SVGs noneditable and avoid duplicate LaTeX delimiters (#8).
- Add configurable symbol width, height and gap, including CSS units, zero gaps and independent sizing per component (#9, #10).
- Gate releases on regression tests, type checks and isolated tarball installation, runtime imports, declarations and consumer builds. Publish the exact verified artifact.
- Fix bundled declarations so they include shared types, contain no implementation bodies or workspace imports, and remain compatible with the Vue 3.3 peer dependency floor.

## 1.4.0

### Minor Changes

- Align and harden the public API surface.
  - Export the documented components, utilities, composables, data helpers, and public types from the package root.
  - Add the `vue-mathjax-beautiful/style.css` export while keeping `vue-mathjax-beautiful/dist/style.css` compatible.
  - Expose HTML sanitizing helpers and sanitize rendered MathJax SVG/HTML before `v-html` usage.
  - Stabilize MathJax loading APIs and add regression tests for runtime exports, type exports, `loadMathJax`, `sanitizeHtml`, and style subpaths.
  - Update README API documentation to match the actual component props, events, and utility exports.
