# Quick Start: Publishing Your First Release

Your automatic update system is now fully configured! Here's how to publish your first release.

## What's Been Set Up

- ✅ GitHub Actions workflow for automatic builds
- ✅ Update checking UI in Settings screen
- ✅ Electron-updater configuration
- ✅ Repository URLs configured

## Publishing a Release (3 Simple Steps)

### 1. Update the Version

Edit `package.json` line 4:
```json
"version": "1.0.1"
```

Commit and push:
```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push
```

### 2. Create and Push a Tag

```bash
git tag v1.0.1
git push origin v1.0.1
```

### 3. Create a GitHub Release

1. Go to: https://github.com/Kas4366/Design-upload-manager/releases/new
2. Select tag: `v1.0.1`
3. Title: `Version 1.0.1`
4. Add release notes describing what's new
5. Click "Publish release"

That's it! GitHub Actions will automatically build and attach the installer.

## What Happens Next

- GitHub Actions builds the installer (takes ~5-10 minutes)
- The installer (.exe) and update manifest (latest.yml) are uploaded to the release
- Users can check for updates in Settings and download the new version

## How Users Update

Users open your app, click Settings, and click "Check for Updates". If a new version is available, they can download and install it with one click.

## Testing Updates

Before releasing to users:
1. Build and install version 1.0.0
2. Create a test release for version 1.0.1
3. Open the installed app and check for updates
4. Verify it downloads and installs correctly

## First Release Checklist

- [ ] Version number updated in package.json
- [ ] Changes committed and pushed to GitHub
- [ ] Git tag created and pushed
- [ ] GitHub Release created with release notes
- [ ] GitHub Actions build completed successfully
- [ ] Installer and latest.yml files attached to release

## Need Help?

See `RELEASE-GUIDE.md` for detailed instructions and troubleshooting.

## Repository

Your repository: https://github.com/Kas4366/Design-upload-manager
