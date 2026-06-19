---
'ghost-gl-core': patch
'ghost-gl-react': patch
'ghost-gl-adapter-core': patch
'ghost-gl-vue': patch
---

Introduce `ghost-gl-adapter-core` as a framework-agnostic host bridge, refactor `ghost-gl-react` to use it, and add a new Vue 3 adapter `ghost-gl-vue`. Also fixes `LayoutRuntimeOptions` to accept a `policy` so collision direction and auto-compact behavior are actually honored by the layout engine.
