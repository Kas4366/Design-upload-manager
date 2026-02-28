# Database Connection Troubleshooting Guide

## Issue Summary
Users experiencing "TypeError: Failed to fetch" errors when trying to save column mappings or access settings.

## What Was Fixed

### 1. Enhanced Supabase Client Initialization
- Added validation to ensure Supabase URL and Anon Key are defined before creating the client
- Added detailed console logging to help diagnose connection issues
- Added error handling that throws descriptive errors if credentials are missing

**Location**: `src/lib/supabase.ts`

### 2. Improved Error Handling in Settings Screen
- Clear error state before attempting new operations
- Better error messages that indicate database connection issues
- Added detailed console logging throughout the save and load processes

**Location**: `src/components/SettingsScreen.tsx`

### 3. Enhanced Column Mappings Service
- Added extensive console logging to track the save process
- Better error messages that distinguish between database errors and connection issues
- Added `.select()` calls after insert/update to verify operations succeeded

**Location**: `src/lib/columnMappings.ts`

### 4. Improved Vite Configuration
- Explicitly load environment variables from .env file
- Use Vite's `loadEnv` function to ensure variables are available at build time
- Define environment variables in the `define` section for consistent access

**Location**: `vite.config.ts`

### 5. Added Database Connection Test
- App now tests database connection on startup
- Logs connection status to console for debugging

**Location**: `src/App.tsx`

## How to Diagnose the Issue

### Step 1: Check Environment Variables
1. Open the app
2. Open Developer Tools (F12 or Ctrl+Shift+I)
3. Go to the Console tab
4. Look for messages about Supabase configuration

**Expected output:**
```
Testing Supabase connection...
Database connection successful!
```

**If you see an error:**
```
Supabase configuration missing!
```
This means the environment variables are not being loaded properly.

### Step 2: Check the .env File
The `.env` file should contain:
```
VITE_SUPABASE_URL=https://dsjyogmvplpllzduuscq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Test Column Mapping Save
1. Go to Settings
2. Upload a sample CSV
3. Map the columns
4. Click "Save Column Mapping"
5. Watch the Console tab for detailed logs

**Expected logs:**
```
Saving column mappings...
Starting saveColumnMappings...
Existing mapping: null (or existing data)
Inserting new mapping... (or Updating existing mapping...)
Insert successful: [data]
Column mappings saved successfully
```

**If you see errors:**
- "Failed to fetch" = Network issue or incorrect Supabase credentials
- "Database error: ..." = Issue with the database query or permissions
- "Failed to connect to database" = Cannot reach Supabase servers

## Database Verification

The following database objects were verified as existing:
- Table: `csv_column_mappings` ✓
- Table: `app_settings` ✓
- RLS Policies: Configured for public access ✓

## Common Solutions

### Solution 1: Development Mode
If running in development mode (`npm run dev`):
1. Stop the dev server
2. Delete the `node_modules/.vite` cache folder
3. Restart the dev server: `npm run dev`

### Solution 2: Production Build
If running as a packaged Electron app:
1. Rebuild the app: `npm run build`
2. Rebuild the Electron app: `npm run electron:build`
3. Install and run the new build

### Solution 3: Check Internet Connection
- Verify you have an active internet connection
- Try accessing https://dsjyogmvplpllzduuscq.supabase.co in a browser
- Check if any firewall or antivirus is blocking the connection

### Solution 4: Verify Supabase Project
1. Log into Supabase dashboard
2. Go to Settings > API
3. Verify the Project URL matches the one in `.env`
4. Verify the anon/public key matches the one in `.env`
5. Check that the project is not paused or suspended

## Next Steps

If the issue persists after trying the above solutions:

1. **Check the browser console** for detailed error messages
2. **Share the console logs** - they will show exactly where the connection is failing
3. **Test the Supabase connection directly** using the browser:
   ```javascript
   // In browser console:
   fetch('https://dsjyogmvplpllzduuscq.supabase.co/rest/v1/app_settings?select=*', {
     headers: {
       'apikey': 'YOUR_ANON_KEY_HERE',
       'Content-Type': 'application/json'
     }
   }).then(r => r.json()).then(console.log)
   ```

4. **Check Supabase logs** in the Supabase dashboard under "Database > Logs"
