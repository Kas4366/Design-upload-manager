# Release Notes

## Version 1.0.2 - 2026-01-29

### Improvements
- **Redesigned Correction Check Modal**: New 3-column layout for better design review
  - Left sidebar: Order details (order number, Veeqo ID, product, SKU, tab info, folder destination)
  - Center: Larger PDF viewer for better design inspection
  - Right sidebar: Customization details (customer notes, additional options, customer images)
  - Navigation arrows moved to bottom of PDF for easier access
  - Customer images now clickable to view full size in new window
  - Improved review notes section with larger textarea

---

# Release Process Guide

This document explains how to create and release updates for the Design Upload Manager desktop application.

## Prerequisites

Before you begin, make sure you have:
- A GitHub account with access to your repository
- Git installed on your computer
- Node.js and npm installed

## Initial GitHub Setup

### 1. Update GitHub Configuration

Open `electron-builder.yml` and update the following fields:
```yaml
publish:
  provider: github
  owner: YOUR_GITHUB_USERNAME  # Replace with your GitHub username
  repo: YOUR_REPO_NAME         # Replace with your repository name
```

### 2. Push Your Code to GitHub

If you haven't already created a GitHub repository:
1. Go to https://github.com and create a new repository
2. Follow GitHub's instructions to push your code

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Creating a New Release

Follow these steps every time you want to release an update:

### Step 1: Update Version Number

1. Open `package.json` in a text editor
2. Find the `"version"` field near the top (e.g., `"version": "1.0.0"`)
3. Update it to your new version number following semantic versioning:
   - **Major** (1.x.x): Breaking changes
   - **Minor** (x.1.x): New features, backward compatible
   - **Patch** (x.x.1): Bug fixes

Example:
```json
{
  "name": "design-upload-manager",
  "version": "1.1.0",  ← Update this line
  "description": "Desktop Order Management and Design Upload System",
  ...
}
```

### Step 2: Build the Installer

1. Double-click `build-installer.bat` in the project root
2. Wait for the build process to complete (this may take a few minutes)
3. When finished, you'll find two important files in the `release` folder:
   - `Design Upload Manager-Setup-[version].exe` - The installer
   - `latest.yml` - Update metadata file

### Step 3: Create a GitHub Release

1. **Go to your GitHub repository** in your web browser

2. **Click on "Releases"** in the right sidebar (or go to `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases`)

3. **Click "Create a new release"** or "Draft a new release"

4. **Fill in the release information:**
   - **Tag version**: Type `v` followed by your version number (e.g., `v1.1.0`)
     - Important: The tag MUST start with `v` and match the version in package.json
   - **Release title**: Give it a descriptive name (e.g., `Version 1.1.0 - New Features`)
   - **Description**: List the changes in this version
     ```
     ## Changes in this version

     ### New Features
     - Added automatic update checking
     - Improved PDF processing speed

     ### Bug Fixes
     - Fixed issue with CSV parsing
     - Resolved folder path validation error

     ### Installation
     Download and run the Setup.exe file below.
     ```

5. **Upload the files:**
   - Click "Attach binaries by dropping them here or selecting them"
   - Upload **BOTH** files from the `release` folder:
     - `Design Upload Manager-Setup-[version].exe`
     - `latest.yml`
   - Make sure both files are uploaded before publishing

6. **Publish the release:**
   - Check "Set as the latest release" (should be checked by default)
   - Click "Publish release"

### Step 4: Verify the Release

After publishing:
1. The release should appear on your repository's releases page
2. Both files should be visible and downloadable
3. The release should be marked as "Latest"

## How Users Get Updates

### First-Time Installation
Users download the installer from your GitHub Releases page and run it.

### Checking for Updates
1. Users open the application
2. Click the Settings icon
3. Scroll to the "About" section
4. Click "Check for Updates"

### Installing Updates
1. If an update is available, users see a notification with the new version number
2. They click "Download and Install" to confirm
3. The update downloads with a progress bar
4. When complete, they click "Restart and Install"
5. The app restarts with the new version

## Troubleshooting

### Build Errors

**Problem**: `npm install` fails
- **Solution**: Delete the `node_modules` folder and `package-lock.json`, then run `build-installer.bat` again

**Problem**: Build fails with "Cannot find module"
- **Solution**: Make sure all dependencies are properly installed by running `npm install` manually

**Problem**: Installer creation fails
- **Solution**: Make sure you have enough disk space and that no antivirus is blocking the build process

### GitHub Release Issues

**Problem**: Update check doesn't find new version
- **Solution**:
  - Make sure the GitHub tag starts with `v` (e.g., `v1.1.0`)
  - Verify both `.exe` and `latest.yml` are uploaded
  - Check that the release is marked as "Latest"
  - Wait a few minutes as updates may be cached

**Problem**: Update download fails
- **Solution**:
  - Make sure the release is public (not draft)
  - Verify the `.exe` file is properly uploaded and not corrupted
  - Check the file size matches the built installer

**Problem**: Users see "Update check failed" error
- **Solution**:
  - Verify the `owner` and `repo` in `electron-builder.yml` are correct
  - Make sure your repository is public or users have access
  - Check your internet connection

### Version Number Issues

**Problem**: Wrong version displays in app
- **Solution**: The app reads version from `package.json`. Make sure you updated it before building.

**Problem**: Update says "You're up to date" but new version exists
- **Solution**:
  - Verify the version in the GitHub release tag matches the version in your built `package.json`
  - Make sure the tag follows the format `vX.Y.Z` (with lowercase 'v')

## Best Practices

1. **Always test locally** before publishing a release
2. **Use meaningful version numbers** that communicate the type of changes
3. **Write clear release notes** so users know what changed
4. **Keep old releases** on GitHub for users who need to downgrade
5. **Update regularly** but not too frequently - bundle fixes into releases
6. **Announce updates** to your users through appropriate channels

## Version History Template

Keep track of your releases in a `CHANGELOG.md` file:

```markdown
# Changelog

## [1.1.0] - 2026-01-23
### Added
- Automatic update checking in Settings
- Progress bar for update downloads

### Fixed
- CSV parsing issue with special characters

## [1.0.0] - 2026-01-20
### Added
- Initial release
- Order management dashboard
- PDF design upload
- CSV import functionality
```

## Additional Resources

- [Semantic Versioning Guide](https://semver.org/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [electron-builder Documentation](https://www.electron.build/)

## Need Help?

If you encounter issues not covered in this guide:
1. Check the build logs in the console
2. Review the error messages carefully
3. Ensure all prerequisites are met
4. Try rebuilding from a clean state (delete `node_modules`, `dist`, and `release` folders)
