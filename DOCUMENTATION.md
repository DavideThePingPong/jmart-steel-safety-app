# JMart Steel Safety App

A comprehensive mobile-friendly safety management Progressive Web App (PWA) for JMart Steel, designed for steel fabrication and installation operations in NSW, Australia.

## Quick Start

**Option 1: Open in Browser**
Simply open `jmart-safety-app.html` in any modern web browser (Chrome, Safari, Firefox, Edge).

**Option 2: Install as App (Recommended)**
1. Open the file in Chrome or Safari on your phone/tablet
2. Wait for the "Install" prompt OR:
   - **iPhone/iPad**: Tap Share â "Add to Home Screen"
   - **Android**: Tap menu (â®) â "Install App" or "Add to Home Screen"
3. Launch from your home screen like a native app!

## Features

### ð Pre-Start Checklists
- Automatic date display
- Supervisor name and site selection
- Builder dropdown (Fdc, Hunter Mason, Built, Lendlease, etc.)
- GPS-enabled address capture
- Work areas, tasks, machinery controls, hazards, and permits sections
- Conditional fields (Plant/Equipment, High Risk Works, SWMS coverage)
- Safety issues from previous shift tracking
- Translator support with signature
- Team member signatures (7 workers)

### ð Subcontractor Site Inspection
- Site and location details
- 10-point inspection checklist with Yes/No/N/A options:
  - Site boxes condition
  - Electrical leads and tools tagged/tested
  - Equipment retagging needs
  - Exclusion zones
  - Permits status
  - Penetration coverage
  - Equipment inspection status
  - Worker safety concerns
  - Builder requests
- Inspector signature capture

### ð ITP Form (Inspection Test Plan)
3-page comprehensive form:

**Page 1 - Title Page:**
- Site selection and location
- Conducted on date/time
- Prepared by (Scott Seeho / Davide Casolini)

**Page 2 - Inspection Sections:**
- Pre-construction meeting tracking
- High Risk Workshop status
- Shopdrawings approval
- Procurement (glass orders, specifications)
- Installation of Glass (damage checks, fixings, RL heights, curing)
- Installation of Handrails (specifications, spigots, welding)
- Handover and Finalisation

**Page 3 - Sign Off:**
- Builder signoff with signature
- Comments and notes for future correspondence

### ð¥ Toolbox Talks
- Site and builder selection
- Prepared by dropdown
- 28+ safety topics to select:
  - Manual Handling, Working at Heights, Hot Work Safety
  - PPE Requirements, Emergency Procedures, Electrical Safety
  - Fire Safety, First Aid, Hazard Identification
  - Confined Spaces, Scaffolding, Crane Operations
  - Chemical Handling, Noise Protection, Mental Health
  - Lock Out Tag Out, Incident Reporting, SWMS
  - And more...
- Corrective action tracking
- Feedback and responses
- Team attendance with signatures

### â ï¸ Incident / Near Miss Reports
- Multiple incident types:
  - Near Miss
  - Injury
  - Property Damage
  - Environmental
- Date, time, and location capture
- Detailed description fields

### ð Emergency Information
- Quick access to emergency contacts:
  - 000 - Emergency Services
  - 13 10 50 - SafeWork NSW
  - 13 11 26 - Poisons Information
- Direct dial functionality

### âï¸ Settings
- Manage site list (add/remove sites)
- View team members

## PWA Features (Works Like a Native App!)

- **Install on Any Device**: Add to home screen on iPhone, iPad, Android, or desktop
- **Works Offline**: All forms work without internet - data syncs when back online
- **Fast Loading**: Cached resources for instant startup
- **Full Screen**: Runs without browser bars when installed
- **Auto-Save**: All data automatically saved to device storage

## Technology Stack

- React 18 (Production build)
- Tailwind CSS
- HTML5 Canvas (for signatures)
- Geolocation API
- LocalStorage for data persistence
- Progressive Web App (PWA) with Service Worker
- jsPDF for PDF generation

## Browser Compatibility

- â Chrome (Desktop & Mobile)
- â Safari (Desktop & iOS)
- â Firefox
- â Edge
- â Samsung Internet

## Data Storage

All data is stored locally on your device using browser localStorage:
- Forms are saved automatically
- Data persists between sessions
- Works offline
- Export to PDF available

## NSW WHS Act 2011 Compliant

This application is designed to help meet workplace health and safety requirements under the NSW WHS Act 2011.

## Version

v2.0 - PWA Edition with offline support

## Author

Created for JMart Steel - NSW Operations

---

**Need Help?** Content: davide@jmartsteel.com.au
