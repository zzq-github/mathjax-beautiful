# react-mathjax-beautiful

## 1.0.3

### Patch Changes

- Add an independent React release path using `react-vX.Y.Z` tags, with package identity, version, source and artifact integrity checks.
- Gate publication on regression tests, type checking, builds and isolated installation of the real package tarball in React 18 and React 19 consumers.
- Verify ESM/CommonJS imports, CSS subpaths, actual server rendering, TypeScript Bundler/NodeNext declarations and Vite consumer builds before publication.
- Include shared sanitizer fixes from the current source tree and publish the exact verified artifact with provenance.

## 1.0.0

### Major Changes

- 修复 React 组件中符号面板和常用公式未渲染为 MathJax SVG 的问题。

## 0.1.0

### Minor Changes

- Initial React formula component MVP with MathJax preview, symbol panels, theme and locale controls, shared LaTeX utilities, and style.css exports.
