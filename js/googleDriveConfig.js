// ========================================
// GOOGLE DRIVE CONFIGURATION
// ========================================
// Get your Client ID from Google Cloud Console:
// 1. Go to https://console.cloud.google.com/
// 2. Create project "JMart Safety App"
// 3. Enable "Google Drive API"
// 4. Go to "Credentials" → Create OAuth Client ID
// 5. Add BOTH authorized origins:
//    - https://davidethepingpong.github.io
//    - https://jmart-steel-safety.web.app
//    - https://jmart-steel-safety.firebaseapp.com
// 6. Copy Client ID below
// ========================================
const GOOGLE_CLIENT_ID = '920798274486-rh1p59hihjkj9k04qmn5e3rbs57g55q8.apps.googleusercontent.com';
const GOOGLE_API_KEY = ''; // Optional - only needed for public files
const DRIVE_FOLDER_NAME = 'JMart Steel';  // Main company folder - consolidated structure
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

// ========================================
// DRIVE FOLDER STRUCTURE CONFIGURATION
// Unified folder structure for all JMart Steel files
// ========================================
const DRIVE_FOLDERS = {
  // Safety forms go into 01_Safety_Compliance subfolders
  forms: {
    'prestart': '01_Safety_Compliance/Pre-Start_Checklists',
    'inspection': '01_Safety_Compliance/Site_Inspections',
    'incident': '01_Safety_Compliance/Incident_Reports',
    'toolbox': '01_Safety_Compliance/Toolbox_Talks',
    'itp': '03_ITPs/General',
    'steel-itp': '03_ITPs/Structural_Steel',
    'training': '05_Training/Certificates'
  },
  // Photos go into project folders
  photos: '02_Projects',  // Will create {ProjectName}/Photos/{Date}/
  // Finance/receipts for future Steel integration
  finance: '11_Finance',
  // AI agent outputs for future Steel integration
  agents: '12_AI_Agents'
};

// Check if Google Drive is configured
const isGoogleDriveConfigured = GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
