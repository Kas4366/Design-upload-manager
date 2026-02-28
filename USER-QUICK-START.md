# Design Upload Manager - Quick Start Guide

## First Time Setup (One Time Only)

### 1. Select Save Location
1. Open the web app
2. Click **Settings** (gear icon)
3. Click **"Select Save Location"**
4. Choose the folder where you want design files saved
5. Click **"Save Settings"**

**Note**: Your browser will remember this location. You only do this once!

### 2. Configure Folder Types (If Not Already Done)
1. In Settings, click **"Folder Types"** tab
2. Add folder types: BL, CD, etc.
3. These are the subfolders created when saving files

## Daily Workflow

### Starting a New Order Batch

1. **Upload CSV**
   - Click **"Upload Order CSV File"**
   - Drag and drop or click to select your CSV file
   - App checks if you've worked on this CSV before
   - If existing session found: Click **"Resume"** to continue where you left off

2. **For Each Order:**

   a. **Upload Design Files**
      - Click **"Upload"** button for each tab
      - Select PDF or JPG file
      - File automatically saves to cloud (you can close browser and come back)

   b. **Place Order Number**
      - Click **"Place Order Number"** button
      - Click where you want the order number on the design
      - Adjust font size and rotation if needed
      - Click **"Save Position"**
      - Position automatically saved (you can close browser and come back)

   c. **Select Folder**
      - Choose destination folder (BL, CD, etc.)
      - Folder selection saved automatically

3. **Save Files**
   - Click **"Save Order"** when all tabs are complete
   - Files save automatically to your selected location
   - Folders created automatically based on SKU rules

### Resuming Work

1. **Load Existing Session**
   - Click **"Load Existing Session"** button on home screen
   - See all your recent CSV uploads
   - Click on the session you want to resume
   - All your uploaded files and placements are restored

2. **Or Upload Same CSV Again**
   - Upload the same CSV file
   - App asks: "Resume existing session?"
   - Click **"Yes"** to continue where you left off

## Browser Compatibility

### Best Experience (Direct File Saving)
- **Google Chrome** - Recommended
- **Microsoft Edge** - Recommended
- **Opera**

### Also Works (ZIP Download)
- **Firefox** - Files download as ZIP
- **Safari** - Files download as ZIP
- Any modern browser

## Tips & Tricks

### ✨ Never Lose Work
- Everything saves automatically to cloud
- Close browser anytime - work is saved
- Resume from any computer

### ✨ Find Your Sessions Easily
- Sessions named by CSV filename
- Example: "January_Orders_Batch_1.csv"
- Easy to find and resume

### ✨ Track Progress
- See "5 of 10 orders completed"
- Know exactly where you left off
- Orders marked complete after saving

### ✨ Multiple Tabs
- Work on multiple order batches
- Open different sessions in different tabs
- Each session independent

## Common Questions

### Q: Where are my files saved?
**A**: Files save to the location you selected in Settings. Subfolders (BL, CD, etc.) are created automatically based on SKU rules.

### Q: Can I change my save location?
**A**: Yes! Go to Settings → Click "Change Save Location" → Select new folder.

### Q: What if I uploaded the wrong file?
**A**: Just upload the correct file - it will replace the previous one automatically.

### Q: Can I work on multiple order batches at once?
**A**: Yes! Each CSV creates a separate session. Work on as many as you want.

### Q: What happens to old sessions?
**A**: Sessions older than 30 days are automatically archived. You can manually delete old sessions in Settings → Cleanup tab.

### Q: Can I use this on my phone or tablet?
**A**: The app works, but it's designed for desktop use. File saving may not work on mobile - files will download as ZIP instead.

### Q: What if my browser crashes?
**A**: No problem! Your work is saved in the cloud. Just reopen the app and resume your session.

### Q: Can someone else work on my session?
**A**: Each session is tied to the CSV filename. If someone uploads the same CSV, they'll see your session. Coordinate with your team to avoid conflicts.

## Troubleshooting

### Files Downloading as ZIP Instead of Saving Directly
**Cause**: Your browser doesn't support the File System Access API.
**Solution**: Switch to Chrome or Edge for direct saving, or extract the ZIP files manually.

### "No Permission to Write to Selected Folder"
**Cause**: Browser lost permission to your save folder.
**Solution**: Go to Settings → Click "Change Save Location" → Reselect the folder.

### Can't Find My Session
**Cause**: Session might be archived or deleted.
**Solution**: Check Settings → Cleanup tab to see all sessions.

### Files Not Uploading
**Cause**: Network issue or Supabase connection problem.
**Solution**: Check your internet connection and try again.

## Keyboard Shortcuts

- **Ctrl/Cmd + S** - Save current order (when ready)
- **Esc** - Close modals/dialogs
- **Tab** - Navigate between form fields

## Getting Help

If you encounter issues:
1. Check your internet connection
2. Try refreshing the page
3. Check if files are actually saved in your folder
4. Contact your administrator with screenshots of any error messages

## Best Practices

1. ✅ **Name your CSV files clearly** - Makes sessions easy to find
2. ✅ **Complete orders in order** - Easier to track progress
3. ✅ **Save regularly** - Click "Save Order" when complete
4. ✅ **Clean up old sessions** - Keep the list manageable
5. ✅ **Use Chrome or Edge** - Best experience with direct file saving

## Updates

The app updates automatically - just refresh your browser to get the latest version. No need to download or install anything!

---

**Enjoy your improved workflow!** 🎉
