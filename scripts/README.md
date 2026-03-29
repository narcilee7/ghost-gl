# Scripts

This directory contains utility scripts for the ghost-gl project.

## release-local.sh

Interactive local release script for publishing packages to npm.

### Prerequisites

```bash
# Login to npm (one-time)
npm login

# Install semver (optional, for version bump calculation)
npm install -g semver
```

### Usage

```bash
# Interactive mode
./scripts/release-local.sh

# Quick release with package name
./scripts/release-local.sh core

# Release with specific version
./scripts/release-local.sh core 0.1.1
```

### What it does

1. Checks npm login status
2. Lets you select package (core/react)
3. Lets you choose version bump (patch/minor/major/custom)
4. Validates version is available on npm
5. Runs lint, typecheck, tests
6. Builds the package
7. Dry-run publish
8. Publishes to npm
9. Creates git commit and tag

### After Release

```bash
# Push the commit and tag
git push origin main
git push origin ghost-gl-core@0.1.1
```
