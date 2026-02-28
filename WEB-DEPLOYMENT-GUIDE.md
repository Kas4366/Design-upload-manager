# Web Application Deployment Guide

## Overview

The Design Upload Manager has been successfully converted from a desktop Electron application to a modern web application with cloud-based storage and session management.

## Key Features

### Cloud-Based Architecture
- **Supabase Storage**: All design files (PDFs/JPGs) are stored in Supabase Storage
- **Session Management**: Sessions identified by CSV filename for easy recognition
- **Auto-Save**: All designer actions automatically saved to cloud
- **Session Recovery**: Resume work from any browser, any computer

### File Saving Options
1. **File System Access API** (Chrome, Edge, Opera)
   - Select save folder once
   - Files save directly to local folders with proper structure (BL, CD, etc.)
   - Works exactly like desktop app

2. **ZIP Download Fallback** (All browsers)
   - Files downloaded as organized ZIP
   - Folder structure maintained inside ZIP
   - Designer extracts to desired location

### Session Management
- CSV filename used as session identifier
- "Resume existing session" when uploading same CSV
- All uploaded files and placements restored
- Progress tracking (X of Y orders completed)

## Deployment to Netlify

### Prerequisites
1. Netlify account
2. GitHub repository connected to Netlify
3. Supabase project with environment variables

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Convert to web application with cloud storage"
git push origin main
```

### Step 2: Create Netlify Site
1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Step 3: Configure Environment Variables
In Netlify dashboard → Site settings → Environment variables, add:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 4: Deploy
Click "Deploy site" and wait for build to complete.

## Database Setup

The migration has already been applied with:
- `design-files` storage bucket
- `session_uploaded_files` table
- `session_positions` table
- Updated `processing_sessions` table with CSV filename support

All tables have appropriate RLS policies for public access (ready for auth in future).

## Browser Compatibility

### Fully Supported (File System Access API)
- Google Chrome 86+
- Microsoft Edge 86+
- Opera 72+

### Supported with ZIP Fallback
- Firefox (all versions)
- Safari (all versions)
- Any other modern browser

## How It Works

### 1. Upload CSV
- Designer uploads CSV file
- App checks if session exists with same filename
- If exists: "Resume session?" → loads all files and placements
- If new: Creates new session

### 2. Upload Design Files
- Designer uploads PDF/JPG for each tab
- Files immediately uploaded to Supabase Storage
- File URL stored in database
- Progress auto-saved

### 3. Place Order Numbers
- Designer places order number on each design
- Position saved to database immediately
- Can resume later - position restored

### 4. Save Files Locally
- **First time**: Designer selects save location
- **Subsequent saves**: Files save automatically to same location
- Folder structure (BL, CD, etc.) created automatically
- SKU routing rules applied as before

### 5. Session Cleanup
- Auto-cleanup after 30 days (configurable)
- Manual cleanup available in settings
- Deletes files from storage and database

## Key Differences from Desktop App

| Feature | Desktop App | Web App |
|---------|-------------|---------|
| Installation | Required | None - just open URL |
| File Storage | Local file system | Supabase Cloud Storage |
| Session Storage | Local database | Cloud database |
| Save Location | Selected each time | Selected once, remembered |
| Access | Single computer | Any browser, any computer |
| Updates | Manual download | Automatic (refresh page) |
| Collaboration | Not possible | Multiple designers simultaneously |

## Security Considerations

### Current Implementation (MVP)
- Public access to storage and database
- No authentication required
- Suitable for trusted internal team use

### Future Enhancement
- Add Supabase Auth for user accounts
- RLS policies already structured for auth
- Update policies to check `auth.uid()`
- Add user roles (designer, checker, admin)

## Cost Estimates (Supabase Free Tier)

- **Storage**: 1GB (250+ orders with designs)
- **Database**: 500MB (unlimited with cleanup)
- **Bandwidth**: 2GB/month
- **API Requests**: 50,000/month

With 30-day auto-cleanup, most users stay well under free tier limits.

## Troubleshooting

### "No permission to write to selected folder"
Browser removed folder permission. Click "Change Save Location" in settings.

### Files downloading as ZIP instead of saving directly
Browser doesn't support File System Access API. This is expected behavior - extract ZIP to desired location.

### Session not loading uploaded files
Files stored in cloud. Check network connection and Supabase Storage permissions.

### Old sessions taking up space
Use "Cleanup" tab in settings to manually delete old sessions. Auto-cleanup runs after 30 days.

## Development

### Local Development
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

### Test Build Locally
```bash
npm run preview
```

## Migration from Desktop App

### For Users
1. Export any in-progress orders from desktop app
2. Access web app URL
3. Upload CSV to continue work
4. Select save location in settings (one time)
5. Continue as normal

### Data Migration
No data migration needed - desktop and web apps use same Supabase database. However, desktop app sessions won't have CSV filenames. After deploying web app, old desktop sessions will need to be cleaned up manually.

## Support

For issues or questions, check:
1. Browser console for error messages
2. Supabase dashboard for storage/database issues
3. Netlify deploy logs for build problems
