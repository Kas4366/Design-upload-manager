# Release Guide

This guide explains how to publish new versions of the Design Upload Manager application with automatic updates.

## Overview

The application uses GitHub Actions to automatically build and publish releases. Users can check for updates directly from the Settings screen in the application.

## Prerequisites

Before creating a release, ensure:

1. All changes are committed and pushed to the main branch
2. The application builds successfully locally: `npm run build`
3. You have push access to the GitHub repository
4. GitHub Actions is enabled for the repository

## Release Process

### Step 1: Update Version Number

Edit `package.json` and increment the version number following [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.0 → 1.0.1): Bug fixes and minor changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

```json
{
  "version": "1.0.1"
}
```

### Step 2: Commit Version Change

```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push origin main
```

### Step 3: Create and Push Git Tag

Create a tag that matches the version number (prefixed with 'v'):

```bash
git tag v1.0.1
git push origin v1.0.1
```

**Important:** The tag MUST start with 'v' followed by the version number (e.g., v1.0.1, v2.0.0)

### Step 4: Create GitHub Release

1. Go to your repository on GitHub
2. Click on "Releases" in the right sidebar
3. Click "Create a new release"
4. Select the tag you just created (v1.0.1)
5. Enter a release title (e.g., "Version 1.0.1")
6. Add release notes describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)
7. Click "Publish release"

### Step 5: Wait for GitHub Actions

Once you create the release, GitHub Actions will automatically:

1. Check out your code
2. Install dependencies
3. Build the Vite application
4. Build the Electron installer
5. Upload the installer and update manifest files to the release

This process typically takes 5-10 minutes. You can monitor progress in the "Actions" tab on GitHub.

### Step 6: Verify Release

After the build completes:

1. Go to the release page on GitHub
2. Verify that these files are attached:
   - `Design Upload Manager-Setup-X.X.X.exe` (the installer)
   - `latest.yml` (the update manifest)

## How Users Get Updates

Users can check for updates from within the application:

1. Click the Settings icon in the application
2. Scroll to the "About" section
3. Click "Check for Updates"
4. If an update is available, they can download and install it directly

The update process:
- Downloads the new version in the background
- Shows progress in the Settings screen
- Installs on application restart
- Preserves all user data and settings

## Testing Updates Locally

Before releasing to users, test the update process:

1. Build and install the current version
2. Increment the version and create a test release
3. Open the installed app and check for updates
4. Verify the update downloads and installs correctly

## Troubleshooting

### Build Fails in GitHub Actions

- Check the Actions log for error messages
- Ensure all dependencies are in package.json
- Verify the Node.js version matches (20.x)
- Make sure electron/icon.ico exists

### Users Don't See Updates

- Verify latest.yml was uploaded to the release
- Check that the version in package.json matches the tag
- Ensure users have an internet connection
- Confirm the repository URL in electron-builder.yml is correct

### Update Download Fails

- Check that the .exe file is properly attached to the release
- Verify the file isn't corrupted (download and test manually)
- Ensure users have sufficient disk space

## Version History

Keep track of releases in RELEASE-NOTES.md to help users understand what changed in each version.

## Best Practices

1. **Test Before Release**: Always test the built application before creating a release
2. **Clear Release Notes**: Write detailed, user-friendly release notes
3. **Semantic Versioning**: Follow semver consistently
4. **Frequent Releases**: Release often with small, focused changes
5. **Backup Strategy**: Keep previous versions available in case of issues

## Emergency Rollback

If a release has critical issues:

1. Delete the problematic release from GitHub
2. Users on the old version won't see the update
3. Users who already updated will need to manually reinstall the previous version
4. Create a new release with fixes as soon as possible

## Security Considerations

- Never commit secrets or API keys to the repository
- GitHub Actions uses the GITHUB_TOKEN for releases (automatically provided)
- The update process uses HTTPS and verifies signatures
- Users see the version number before installing updates
