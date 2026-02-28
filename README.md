# Design Upload Manager - Web Application

A cloud-based web application for managing order processing, design uploads, and automated file organization for production workflows.

## Overview

The Design Upload Manager is a modern web application that allows designers to process orders, upload design files, place order numbers, and save files to organized folders - all through their web browser with cloud-based session management.

## Key Features

### Cloud-Based Architecture
- **Supabase Cloud Storage**: All design files stored securely in the cloud
- **CSV-Based Sessions**: Sessions identified by CSV filename for easy recognition
- **Auto-Save Everything**: All uploads and placements automatically saved
- **Resume Anywhere**: Continue work from any browser, any computer
- **Never Lose Work**: Everything persists in the cloud

### File Saving Options
- **File System Access API** (Chrome, Edge, Opera): Save directly to local folders
- **ZIP Export** (Firefox, Safari): Download organized ZIP files
- **One-Time Setup**: Select save location once, remembered forever

### Core Functionality
- **CSV Order Import**: Upload CSV files with automatic parsing and validation
- **Order Management Dashboard**: View, filter, and search orders by SKU and status
- **Multi-Tab Upload Interface**: Handle multiple design files per order
- **PDF Order Number Placement**: Interactive tool for positioning order numbers
- **Automated File Organization**: Save to correct folders based on SKU routing rules
- **SKU Routing Rules**: Configure automatic folder routing (CH, CD, BL, etc.)
- **Folder Types Manager**: Configure destination folders for different SKU types
- **Session Recovery**: Load and resume existing sessions anytime

### Advanced Features
- **Smart Tab Calculation**: CD items get 2 tabs, others based on quantity × lines
- **Position Memory**: Save order number positions for each SKU
- **Image URL Extraction**: Automatically extract customer-provided image URLs
- **Customization Detection**: Identify customized vs ready-made orders
- **Progress Tracking**: Real-time progress (5 of 10 orders completed)
- **Auto-Cleanup**: Sessions archived after 30 days (configurable)
- **Multi-Designer Support**: Multiple designers work simultaneously on different CSVs

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Cloud Storage**: Supabase Storage
- **Database**: Supabase (PostgreSQL)
- **File Saving**: File System Access API + JSZip fallback
- **PDF Processing**: PDF.js (viewing) + pdf-lib (manipulation)
- **CSV Parsing**: PapaParse
- **Build Tool**: Vite
- **Deployment**: Netlify

## Database Schema

### Tables

1. **sku_positions**: Stores saved order number positions for each SKU
2. **app_settings**: Application configuration (folder paths)
3. **sku_routing_rules**: SKU pattern matching rules for folder routing
4. **processing_sessions**: Track CSV upload sessions
5. **order_items**: Individual order items with all metadata

## Quick Start

### For Users

1. Open the web app URL (provided by your administrator)
2. First time: Click **Settings** → **Select Save Location** (one time only)
3. Upload your CSV file
4. Upload design files and place order numbers
5. Save files to your local folders

**Full guide**: See [USER-QUICK-START.md](USER-QUICK-START.md)

### For Administrators

**Deployment**: See [WEB-DEPLOYMENT-GUIDE.md](WEB-DEPLOYMENT-GUIDE.md)

**Summary of Changes**: See [CONVERSION-SUMMARY.md](CONVERSION-SUMMARY.md)

## Development

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account with database and storage configured

### Local Development
```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production
```bash
npm run build
```

### Deploy to Netlify
```bash
# Push to GitHub
git push origin main

# Netlify auto-deploys from GitHub
# Or use Netlify CLI:
netlify deploy --prod
```

## Usage Guide

### 1. Initial Setup

1. Launch the application
2. Click **Settings** to configure folder paths:
   - **Date Folder Path**: Main folder for saving processed designs
   - **Pre-Made Designs Folder**: Folder containing ready-made design templates
3. Click **SKU Rules** to review or modify routing rules
   - Default rules route CH → CH folder, CD → CD folder, BL → BL folder
   - Add custom rules as needed with priority ordering

### 2. Processing Orders

1. Click **Upload CSV** on the home screen
2. Select your order CSV file (must contain: id, order_number, sku, title, quantity, number_of_lines)
3. The app automatically:
   - Creates a processing session
   - Parses all orders
   - Calculates required upload tabs
   - Detects customization needs
   - Extracts customer image URLs

### 3. Uploading Designs

1. Select an order from the left sidebar
2. For each tab:
   - Click to upload a PDF file
   - Click "Place Order Number" to position the order number on the design
   - Drag the order number preview to desired location
   - Adjust font size as needed
   - Click "Apply Position"
3. Once all tabs have PDFs and order numbers placed, click **Save Design Files**
4. Files are automatically saved to the correct folder with proper naming

### 4. File Naming Convention

- Single items: `{veeqo_id}.pdf`
- CD items: `{veeqo_id}-Front.pdf`, `{veeqo_id}-Inside.pdf`
- Multiple items: `{veeqo_id}-1.pdf`, `{veeqo_id}-2.pdf`, etc.

### 5. Managing Multiple Sessions

- Click **New Session** to start processing a new CSV
- Previous session data is preserved in the database
- Track completion progress in the header

## CSV Format Requirements

Your CSV must include these columns:

- `id`: Veeqo internal order number (used for filename)
- `order_number`: Display order number (placed on PDF)
- `sku`: Product SKU code
- `title`: Product title
- `quantity`: Order quantity (numeric)
- `number_of_lines`: Number of lines (numeric)
- `customer_note`: Customer notes (optional)
- `additional_options`: Additional options (optional)

Example:

```csv
id,order_number,sku,title,quantity,number_of_lines,customer_note,additional_options
12345,ORD-001,CH-BASIC,Basic Card,1,1,"Please use blue color",""
12346,ORD-002,CD-SPECIAL,Special Card Personalised,2,1,"Customer image: https://example.com/image.jpg",""
```

## Keyboard Shortcuts

Currently, all interactions are mouse-based. Future versions may include keyboard shortcuts.

## Troubleshooting

### CSV won't upload
- Ensure CSV has required columns
- Check for proper CSV formatting
- Verify file is not corrupted

### Can't save files
- Check that date folder path is configured in Settings
- Ensure folder path exists and is accessible
- Verify SKU routing rules are defined and active
- Check disk space

### Order numbers not appearing
- Ensure you clicked "Place Order Number" for each tab
- Verify position was applied (green checkmark should appear)
- Try adjusting font size if text is too small

### Electron app won't start
- Delete `node_modules` and run `npm install` again
- Check Node.js version (must be 18+)
- Verify no port conflicts on 5173

## Development Scripts

- `npm run dev`: Start Vite dev server (web only)
- `npm run electron:dev`: Start Electron in development mode
- `npm run build`: Build for production
- `npm run electron:build`: Build and package desktop app
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking

## Architecture

### Frontend Structure

```
src/
├── components/          # React components
│   ├── CSVUpload.tsx           # CSV file upload interface
│   ├── OrderDashboard.tsx      # Order list with filtering
│   ├── OrderUploadTabs.tsx     # Multi-tab upload interface
│   ├── PDFPlacementModal.tsx   # Order number placement tool
│   ├── SettingsScreen.tsx      # App settings configuration
│   └── SKURoutingRules.tsx     # Routing rules management
├── lib/                 # Utility libraries
│   ├── csvParser.ts            # CSV parsing logic
│   ├── pdfProcessor.ts         # PDF manipulation
│   ├── fileSaver.ts            # File saving operations
│   ├── supabase.ts             # Database client
│   ├── db.ts                   # Database helpers
│   └── types.ts                # TypeScript definitions
└── App.tsx              # Main application component
```

### Electron Structure

```
electron/
├── main.cjs             # Main process (Node.js)
├── preload.cjs          # Preload script (IPC bridge)
└── icon.ico             # Application icon
```

## Security Considerations

- Database credentials stored in environment variables
- File system access restricted to selected folders only
- No sensitive data logged to console
- All IPC communications use contextIsolation

## Future Enhancements

Potential features for future versions:

- Automatic pre-made design upload for non-customized CH items
- Batch processing of multiple orders
- Print queue integration
- Order history and analytics
- Drag-and-drop file upload
- Undo/redo functionality
- Keyboard shortcuts
- Dark mode theme
- Multi-language support

## License

Proprietary - Internal use only

## Support

For issues or questions, contact the development team.
