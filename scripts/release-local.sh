#!/bin/bash

# Local Release Script for ghost-gl
# Usage: ./scripts/release-local.sh [package-name] [version]
# Example: ./scripts/release-local.sh core 0.1.1

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to root directory
cd "$ROOT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ghost-gl Local Release Script                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Check npm login status
print_step "Checking npm login status..."
NPM_USER=$(npm whoami 2>/dev/null || echo "")
if [ -z "$NPM_USER" ]; then
    print_error "Not logged in to npm"
    echo ""
    echo "Please login first:"
    echo "  npm login"
    exit 1
fi
print_success "Logged in as: $NPM_USER"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# Install semver if not present
if ! command -v semver &> /dev/null; then
    print_step "Installing semver..."
    npm install -g semver
fi

# Available packages
PACKAGES=("core" "react")
PACKAGE_DIRS=("packages/core" "packages/react")
PACKAGE_NAMES=("ghost-gl-core" "ghost-gl-react")

# Select package
if [ -n "$1" ]; then
    SELECTED_PACKAGE="$1"
else
    echo ""
    echo "Select package to release:"
    for i in "${!PACKAGES[@]}"; do
        echo "  $((i+1)). ${PACKAGES[$i]} (${PACKAGE_NAMES[$i]})"
    done
    echo ""
    read -p "Enter number (1-${#PACKAGES[@]}): " choice
    
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "${#PACKAGES[@]}" ]; then
        print_error "Invalid selection"
        exit 1
    fi
    
    SELECTED_PACKAGE="${PACKAGES[$((choice-1))]}"
fi

# Find package index
PACKAGE_INDEX=-1
for i in "${!PACKAGES[@]}"; do
    if [ "${PACKAGES[$i]}" = "$SELECTED_PACKAGE" ]; then
        PACKAGE_INDEX=$i
        break
    fi
done

if [ $PACKAGE_INDEX -eq -1 ]; then
    print_error "Unknown package: $SELECTED_PACKAGE"
    echo "Available: ${PACKAGES[*]}"
    exit 1
fi

PACKAGE_DIR="${PACKAGE_DIRS[$PACKAGE_INDEX]}"
PACKAGE_NAME="${PACKAGE_NAMES[$PACKAGE_INDEX]}"

echo ""
print_step "Selected package: ${GREEN}$PACKAGE_NAME${NC}"

# Check if package exists
if [ ! -d "$PACKAGE_DIR" ]; then
    print_error "Package directory not found: $PACKAGE_DIR"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./$PACKAGE_DIR/package.json').version")
print_step "Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Determine new version
if [ -n "$2" ]; then
    NEW_VERSION="$2"
else
    echo ""
    echo "Select version bump:"
    echo "  1. patch ($CURRENT_VERSION → $(npx semver $CURRENT_VERSION -i patch))"
    echo "  2. minor ($CURRENT_VERSION → $(npx semver $CURRENT_VERSION -i minor))"
    echo "  3. major ($CURRENT_VERSION → $(npx semver $CURRENT_VERSION -i major))"
    echo "  4. custom"
    echo ""
    read -p "Enter number (1-4): " version_choice
    
    case $version_choice in
        1) NEW_VERSION=$(npx semver $CURRENT_VERSION -i patch) ;;
        2) NEW_VERSION=$(npx semver $CURRENT_VERSION -i minor) ;;
        3) NEW_VERSION=$(npx semver $CURRENT_VERSION -i major) ;;
        4) 
            read -p "Enter custom version: " NEW_VERSION
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
fi

# Validate version
if ! npx semver "$NEW_VERSION" &> /dev/null; then
    print_error "Invalid version: $NEW_VERSION"
    exit 1
fi

echo ""
print_step "New version: ${GREEN}$NEW_VERSION${NC}"

# Check if version already exists on npm
print_step "Checking npm registry..."
if npm view "$PACKAGE_NAME@$NEW_VERSION" version &> /dev/null; then
    print_error "Version $NEW_VERSION already exists on npm"
    exit 1
fi
print_success "Version $NEW_VERSION is available"

# Confirm release
echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
echo -e "  Package:    ${GREEN}$PACKAGE_NAME${NC}"
echo -e "  Version:    ${YELLOW}$CURRENT_VERSION${NC} → ${GREEN}$NEW_VERSION${NC}"
echo -e "  Directory:  $PACKAGE_DIR"
echo -e "  Publisher:  $NPM_USER"
echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Are you sure you want to release? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_warning "Release cancelled"
    exit 0
fi

# Update version
print_step "Updating version..."
cd "$PACKAGE_DIR"
npm version "$NEW_VERSION" --no-git-tag-version
cd "$ROOT_DIR"

# Install dependencies
print_step "Installing dependencies..."
pnpm install --frozen-lockfile

# Run checks
print_step "Running lint..."
pnpm lint

print_step "Running type check..."
pnpm typecheck

print_step "Running tests..."
pnpm test

# Build
print_step "Building package..."
pnpm build

# Navigate to package directory for publishing
cd "$PACKAGE_DIR"

# Dry run first
print_step "Running dry-run publish..."
npm publish --dry-run

echo ""
read -p "Dry-run complete. Proceed with actual publish? (yes/no): " confirm_publish

if [ "$confirm_publish" != "yes" ]; then
    print_warning "Publish cancelled"
    # Revert version change
    git checkout package.json
    exit 0
fi

# Publish
print_step "Publishing to npm..."
npm publish --access public

print_success "Published $PACKAGE_NAME@$NEW_VERSION to npm!"

# Git commit and tag
cd "$ROOT_DIR"
git add "$PACKAGE_DIR/package.json"
git commit -m "chore(release): $PACKAGE_NAME@$NEW_VERSION"
git tag -a "$PACKAGE_NAME@$NEW_VERSION" -m "Release $PACKAGE_NAME@$NEW_VERSION"

echo ""
print_success "Created git commit and tag"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Release complete!${NC}"
echo -e ""
echo -e "  Package: ${YELLOW}$PACKAGE_NAME${NC}"
echo -e "  Version: ${GREEN}$NEW_VERSION${NC}"
echo -e ""
echo -e "  Don't forget to push:"
echo -e "    git push origin main"
echo -e "    git push origin $PACKAGE_NAME@$NEW_VERSION"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
