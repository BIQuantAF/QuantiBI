# Report Feature Redesign - Phase 2.1

## Overview

Completely redesigned the report feature to:
- ✅ Accept **datasets** instead of charts as input
- ✅ Automatically **analyze** the dataset and create 1-page reports
- ✅ **Auto-generate suggested charts** based on the data
- ✅ Display reports in a **full-page view** (not modal popup)
- ✅ **Export to PDF** with professional formatting
- ✅ **Share reports publicly** with shareable links
- ✅ Async report generation with AI analysis

---

## Backend Changes

### 1. Report Model (`src/models/Report.js`)

**New Fields:**
- `datasetId` (required) - Reference to the dataset being analyzed
- `shareToken` - Unique token for public sharing
- `isPublic` - Boolean to enable/disable public access
- `sections` - Array of report sections with structured content
  - `type`: 'title' | 'summary' | 'metric' | 'insight' | 'chart' | 'conclusion'
  - `title`, `content`, `metrics` - Section-specific data

**Removed:**
- Requirement for `chartIds` (now optional and auto-generated)

**New Indexes:**
- `datasetId` for quick filtering
- `shareToken` for public report retrieval

### 2. Reports Route (`src/routes/reports.js`)

**New Endpoints:**

#### POST `/api/workspaces/:workspaceId/reports` (updated)
```json
{
  "title": "Q4 Sales Report",
  "description": "Analysis of Q4 sales data",
  "datasetId": "507f1f77bcf86cd799439011"  // Changed from chartIds
}
```

**Response:** Returns report in draft status, triggers async AI analysis

---

#### GET `/api/reports/public/:shareToken` (new)
- **Access:** Public (no auth required)
- **Purpose:** Retrieve shared reports publicly
- **Response:** Full report data with all analysis

---

#### POST `/api/workspaces/:workspaceId/reports/:reportId/share` (new)
- **Access:** Private (workspace member only)
- **Purpose:** Generate public share link
- **Response:**
```json
{
  "shareUrl": "https://app.quantibi.com/report/abc123token",
  "shareToken": "abc123token"
}
```

---

### 3. Report Generation Pipeline

**New Function:** `generateReportFromDataset(reportId, dataset)`

**Flow:**
1. **Data Retrieval**
   - Download file from S3 if file-based database
   - Query schema and preview data via DuckDB
   - Extract 100 sample rows

2. **AI Analysis (OpenAI GPT-4o-mini)**
   - Receives dataset schema, sample data, and statistics
   - Generates structured JSON with:
     - `summary` - 2-3 sentence executive summary
     - `metrics` - 3-5 key statistics with labels and formats
     - `insights` - 3-5 actionable insights
     - `chartSuggestions` - Recommended 2-3 charts with types and columns

3. **Report Assembly**
   - Converts AI response into structured `sections` array
   - Creates professional 1-page layout
   - Stores metrics, insights, and chart recommendations

4. **Error Handling**
   - Updates report with error status and message if generation fails
   - Gracefully handles missing data or API errors
   - Cleans up temporary files

**Imports Added:**
```javascript
const crypto = require('crypto');  // For shareToken generation
const Dataset = require('../models/Dataset');
const Database = require('../models/Database');
```

---

## Frontend Changes

### 1. Type Definitions (`src/types/index.ts`)

**New Types:**

```typescript
// Report section structure
export interface ReportSection {
  type: 'title' | 'summary' | 'metric' | 'insight' | 'chart' | 'conclusion';
  title?: string;
  content?: string;
  chartId?: string;
  metrics?: {
    label: string;
    value: string;
    format: string;  // 'percentage', 'number', 'currency'
  };
}

// Updated Report interface
export interface Report {
  _id: string;
  workspace: string;
  createdBy: string;
  title: string;
  description?: string;
  datasetId: string;           // ← Changed from chartIds
  chartIds: string[];          // ← Now optional (auto-generated)
  sections?: ReportSection[];  // ← New: structured report content
  summary?: string;
  insights?: string[];
  status: 'draft' | 'completed' | 'failed';
  error?: string;
  shareToken?: string;         // ← New: for public sharing
  isPublic?: boolean;          // ← New: public access flag
  createdAt: string;
  updatedAt: string;
}

export interface ReportCreate {
  title: string;
  description?: string;
  datasetId: string;  // ← Changed from chartIds
}
```

---

### 2. API Service (`src/services/api.ts`)

**New Methods:**

```typescript
// Get public report by share token (no auth)
async getPublicReport(shareToken: string): Promise<any>

// Create public share link
async shareReport(workspaceId: string, reportId: string): 
  Promise<{ shareUrl: string; shareToken: string }>
```

**Updated Methods:**
```typescript
// Now accepts datasetId instead of chartIds
async createReport(workspaceId: string, reportData: { 
  title: string; 
  description?: string; 
  datasetId: string  // ← Changed
}): Promise<any>
```

---

### 3. Reports List Component (`src/components/reports/Reports.tsx`)

**Changes:**
- Click report to view full page (not modal)
- Modal changed to dataset selection instead of chart selection
- Removed ReportDetailModal (replaced with full page)
- Reports list shows status and summary preview

**CreateReportModal:**
```jsx
<CreateReportModal>
  - Report Title (required)
  - Description (optional)
  - Dataset Selection (required)
</CreateReportModal>
```

---

### 4. New Report Page Component (`src/components/reports/ReportPage.tsx`)

**Features:**
- Full-page professional report view
- 1-page layout with clear sections:
  - Title page with metadata
  - Executive Summary
  - Key Metrics (grid display)
  - Key Insights (numbered list)
  - Recommended Visualizations
  - Conclusion
- Real-time polling for report generation (every 3s)
- Shows generation status: Processing → Completed/Failed
- Two action buttons:
  - **Share**: Generate public link, copy to clipboard
  - **Download PDF**: Export as professional PDF

**PDF Export:**
- Uses `html2pdf.js` library
- Filename: `{reportTitle}.pdf`
- A4 portrait format
- Professional styling preserved
- 10mm margins

---

### 5. Public Report Page Component (`src/components/reports/PublicReportPage.tsx`)

**Features:**
- Same layout as ReportPage
- **No authentication required**
- Only download PDF button (no share)
- Loaded via share token from URL
- Error handling for expired/invalid tokens

---

### 6. Route Updates (`src/App.tsx`)

**New Routes:**

```typescript
// Private: Report page for authenticated user
<Route path="/workspaces/:workspaceId/reports/:reportId" element={
  <ProtectedRoute>
    <div>
      <Navigation />
      <ReportPage />
    </div>
  </ProtectedRoute>
} />

// Public: Share link for anyone
<Route path="/report/:shareToken" element={
  <PublicReportPage />
} />
```

**Imports Added:**
- `ReportPage` from `./components/reports/ReportPage`
- `PublicReportPage` from `./components/reports/PublicReportPage`

---

## New Dependencies

### Frontend
```json
"html2pdf.js": "^0.10.1"  // PDF export library
```

Install with: `npm install html2pdf.js`

---

## User Flow

### Creating a Report
1. User clicks "Generate Report" button
2. Modal opens: Select dataset + enter title/description
3. Click "Generate" → Report created in draft status
4. AI analysis runs asynchronously (backend)
5. After ~10-30 seconds, report status → "Completed"
6. Report displays automatically after completion

### Viewing Reports
1. Click report in list → Opens full page
2. See animated status indicator while generating
3. Once complete, displays:
   - Executive summary
   - Key metrics (formatted nicely)
   - 3-5 insights
   - Chart recommendations
4. Can download as PDF or share

### Sharing Reports
1. From report page, click "Share" button
2. Public link generated and copied to clipboard
3. Share link URL: `https://app.quantibi.com/report/{shareToken}`
4. Anyone with link can view (read-only)
5. Public report still has download PDF option

### Downloading PDF
1. Click "Download PDF" button
2. Browser downloads professional 1-page PDF
3. Includes all report content formatted for printing

---

## AI Analysis Details

**Prompt Strategy:**
- Analyzes dataset schema (column names and types)
- Extracts numeric columns
- Calculates statistics (avg, max, min, count)
- Includes sample rows
- Requests structured JSON response

**AI Output (parsed):**
```json
{
  "summary": "Executive summary text (2-3 sentences)",
  "metrics": [
    {
      "label": "Total Revenue",
      "value": "$2.5M",
      "format": "currency"
    }
  ],
  "insights": [
    "Key insight 1",
    "Key insight 2"
  ],
  "chartSuggestions": [
    {
      "title": "Revenue Trend",
      "type": "line",
      "columns": ["date", "revenue"]
    }
  ]
}
```

**Model Used:**
- Default: `gpt-4o-mini` (cost-effective)
- Configurable via `process.env.OPENAI_MODEL`

---

## Database Schema Changes

### Report Collection

**Old:**
```javascript
{
  _id, workspace, createdBy, title, description,
  chartIds,  // Array of chart IDs
  summary, insights, status, error,
  createdAt, updatedAt
}
```

**New:**
```javascript
{
  _id, workspace, createdBy, title, description,
  datasetId,  // Single dataset ID (required)
  chartIds,   // Auto-generated chart suggestions (optional)
  sections,   // Structured report content with type, title, content
  summary, insights, status, error,
  shareToken, // Unique token for public sharing
  isPublic,   // Public access enabled
  createdAt, updatedAt
}
```

---

## Error Handling

**Frontend:**
- Loading state while generating
- Status indicators: Processing/Completed/Failed
- Error messages displayed if generation fails
- Graceful fallback if PDF export fails

**Backend:**
- Validates dataset exists
- Validates workspace access
- Handles S3 download failures
- Handles DuckDB schema detection failures
- Cleans up temporary files
- Updates report with error status

---

## Testing Checklist

- [ ] Create report from dataset → Status shows "draft" then "completed"
- [ ] Report displays all sections correctly
- [ ] Click into report → Opens full page (not modal)
- [ ] Share button generates public link
- [ ] Public link accessible without login
- [ ] Download PDF creates file with correct name
- [ ] PDF includes all report content
- [ ] Report list shows multiple reports
- [ ] Delete report removes from list
- [ ] Error handling: Invalid dataset
- [ ] Error handling: AI API failure
- [ ] Type checking: `npm run type-check` passes ✓

---

## Environment Variables

**Backend:** None new (uses existing `OPENAI_API_KEY`, `OPENAI_MODEL`)

**Frontend:**
- `REACT_APP_API_URL` (existing)
- `REACT_APP_FRONTEND_URL` (recommended, for share links)

---

## Deployment Notes

1. Install new dependency: `npm install html2pdf.js`
2. Run type check: `npm run type-check` (should pass)
3. Build frontend: `npm run build`
4. Backend changes compatible with existing reports
5. Note: Old chart-based reports still accessible (backward compatible)

---

## Future Enhancements

- [ ] Auto-generate actual charts instead of just recommendations
- [ ] Support multiple datasets per report
- [ ] Add custom styling/branding to reports
- [ ] Email report links to team members
- [ ] Schedule automatic report generation
- [ ] Add interactive elements to public reports
- [ ] Export to other formats (Excel, PowerPoint)
- [ ] Compare reports across time periods

---

## File Changes Summary

### Backend
- **Modified:**
  - `src/models/Report.js` - Added sections, datasetId, shareToken
  - `src/routes/reports.js` - New endpoints, dataset-based logic
  
- **Dependencies:**
  - `crypto` (built-in)
  - `Dataset`, `Database` models

### Frontend
- **Created:**
  - `src/components/reports/ReportPage.tsx` - Private report view
  - `src/components/reports/PublicReportPage.tsx` - Public report view
  
- **Modified:**
  - `src/components/reports/Reports.tsx` - Dataset selection modal
  - `src/types/index.ts` - New Report types, ReportSection
  - `src/services/api.ts` - New API methods
  - `src/App.tsx` - New routes
  - `package.json` - Added html2pdf.js

- **Dependencies Added:**
  - `html2pdf.js@^0.10.1`

---

## Summary

The report feature has been completely redesigned to focus on **dataset analysis** rather than chart curation. Reports are now:
- **AI-powered**: Automatic analysis and insights
- **Full-page**: Professional single-page layout
- **Shareable**: Public links with no auth required
- **Exportable**: Professional PDF download
- **Async**: Non-blocking generation process

This makes QuantiBI's reporting capabilities much more powerful and user-friendly! 📊✨
