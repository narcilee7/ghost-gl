# Release Checklist

This document tracks the tasks needed to publish ghost-gl to npm and announce it publicly.

## Pre-Release Checklist

### Package Configuration

- [x] Package name: `ghost-gl-core` (available on npm)
- [x] Version: `0.0.0` → bump to `0.1.0` for first release
- [x] License: MIT
- [x] Type: module (ESM + CJS dual format)
- [x] Side effects: false (tree-shakeable)
- [x] Exports map configured
- [x] Publish config: public access + provenance

### Documentation

- [x] README.md with:
  - [x] Clear value proposition
  - [x] Performance benchmarks
  - [x] Comparison table with alternatives
  - [x] Quick start guide
  - [x] API reference
  - [x] Architecture overview
  - [x] Roadmap
- [x] CONTRIBUTING.md
- [x] CHANGELOG.md
- [x] Code of Conduct (referenced in CONTRIBUTING)
- [x] Examples in `examples/` directory

### Repository Setup

- [x] GitHub Actions CI workflow
- [x] GitHub Actions Release workflow
- [x] Issue templates (bug report, feature request)
- [x] PR template
- [x] Changesets configuration

### Code Quality

- [x] TypeScript strict mode
- [x] 90+ tests passing
- [x] Benchmark suite
- [x] Biome linting/formatting
- [x] Build verification

### NPM Registry Setup

- [ ] Create npm organization `ghost-gl`
- [ ] Create automation token for GitHub Actions
- [ ] Add `NPM_TOKEN` secret to repository

## Release Process

### Step 1: Version Bump

```bash
# Create changeset
pnpm changeset

# Select packages to bump
# ghost-gl-core: minor (0.0.0 → 0.1.0)

# Version packages
pnpm release:version
```

### Step 2: Build and Test

```bash
pnpm verify
```

### Step 3: Create Release PR

```bash
git add .
git commit -m "chore(release): prepare 0.1.0"
git push origin release/0.1.0
```

Create PR and merge to main.

### Step 4: Automated Publish

The release workflow will automatically:
1. Build packages
2. Publish to npm with provenance
3. Create GitHub release

### Step 5: Post-Release

- [ ] Verify package on npm: https://www.npmjs.com/package/ghost-gl-core
- [ ] Verify GitHub release created
- [ ] Update documentation site (if applicable)
- [ ] Announce on social media / relevant communities

## Post-Release Roadmap

### Immediate (Week 1-2)

- [ ] Monitor for critical issues
- [ ] Respond to initial feedback
- [ ] Fix any documentation issues

### Short-term (Month 1-2)

- [ ] React bindings (`ghost-gl-react`)
- [ ] More examples (React, Vue, vanilla JS)
- [ ] Documentation site

### Medium-term (Month 3-6)

- [ ] Vue bindings (`ghost-gl-vue`)
- [ ] Animation support
- [ ] Touch/mobile gestures
- [ ] Performance monitoring API

### Long-term (6+ months)

- [ ] Server-side rendering support
- [ ] Persistence adapters
- [ ] Layout templates/presets
- [ ] Accessibility audit

## Notes

### Package Naming

- Core: `ghost-gl-core` ✅ Available
- React: `ghost-gl-react` ✅ Available
- Vue: `ghost-gl-vue` ✅ Available

### Branding

- Project name: ghost-gl
- Tagline: "High-performance virtualized grid layout engine for heavy components"
- Logo: TBD (ghost icon with grid overlay)

### Community

- GitHub Discussions: Enable after release
- Discord: Consider creating a server
- Twitter/X: Create account for announcements
