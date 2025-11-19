# Publishing @webx/sig

This package is configured to publish to both NPM and GitHub Packages.

## Prerequisites

### NPM Registry
1. Create an NPM account at https://www.npmjs.com
2. Generate an access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
3. Add the token to GitHub Secrets:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN`
   - Paste your NPM token

### GitHub Packages
- No additional setup needed, uses `GITHUB_TOKEN` automatically

## Publishing

### Option 1: Automatic (Recommended)
Create a GitHub release:
```bash
# Tag your version
git tag v1.0.0
git push origin v1.0.0

# Then create a release on GitHub from this tag
```
The package will automatically publish to both registries.

### Option 2: Manual Workflow
Go to Actions → Publish Package → Run workflow

### Option 3: Local Publishing
```bash
# Build the package
npm run build

# Publish to NPM
npm publish --access public

# Publish to GitHub Packages (requires .npmrc configuration)
npm publish --registry=https://npm.pkg.github.com --access public
```

## Package Visibility

Both publications are configured as **public** and accessible to everyone:

- **NPM**: `npm install @webx/sig`
- **GitHub**: `npm install @webx/sig --registry=https://npm.pkg.github.com`

## Version Management

Update version before publishing:
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```
