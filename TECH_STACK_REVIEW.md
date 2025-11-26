# QuantiBI Tech Stack Review & Recommendations

## Current Tech Stack

### Data Storage
- **MongoDB** (Mongoose)
  - User metadata & auth
  - Workspace & dataset metadata
  - Chart specs & dashboard layouts
  - Report metadata
  - File paths (currently stores `filePath` for CSV/XLS uploads)

- **Local File System** (via multer)
  - CSV/XLSX files stored in `uploads/` directory
  - No distributed storage or S3 integration
  - Not suitable for production (single server, no backup, scaling issues)

### Query Engines
- **Google BigQuery** (primary)
  - Handles SQL generation for external datasets
  - Used via service pattern in `bigquery.js`
  - Requires user-provided credentials

- **PostgreSQL** (optional support)
  - Loaded conditionally in `charts.js`
  - Minimal integration

- **No local query engine** (CSV/XLSX files are parsed in-memory via `csv-parse` and `xlsx` libraries)

### Current Limitations
1. **File Storage**: Files uploaded locally without S3 integration
2. **Query Engine for CSV/XLSX**: In-memory parsing only—no proper SQL query engine
3. **Scalability**: Single-node file storage; no distributed handling
4. **PDF Generation**: Not implemented for reports
5. **Chart Thumbnails**: Not generated or cached

---

## Your Proposed Tech Stack

### Storage
- **MongoDB**: User metadata, dataset metadata, S3 keys/paths, profiles, chart specs, dashboards, report metadata (S3 PDF key)
- **S3**: Actual CSV/XLSX files, chart thumbnails, report PDFs, temp assets

### Query Engine
- **DuckDB**: 
  - Download/stream file from S3 to temp directory
  - Mount file as DuckDB table
  - Run OpenAI-generated SQL
  - Return results

---

## Analysis & Recommendations

### ✅ Strengths of Proposed Stack

1. **Production-Ready Storage**
   - S3 is enterprise-grade, scalable, and highly available
   - MongoDB metadata + S3 files = clean separation of concerns
   - S3 has built-in versioning, encryption, and backup

2. **Better Query Engine Choice**
   - **DuckDB** is ideal for this use case:
     - Serverless OLAP engine (no infrastructure management)
     - Excellent CSV/XLSX support natively
     - Fast in-process SQL execution
     - Lower latency than BigQuery for small-medium files
     - Can handle queries on remote files efficiently
   - Requires only `duckdb` npm package (~5MB)

3. **Cost Efficiency**
   - DuckDB + S3 << BigQuery costs for typical BI use case
   - BigQuery charges per query (100+ MB minimum); DuckDB is free
   - S3 storage is cheap (~$0.023/GB/month)

4. **Flexibility**
   - Users upload files instead of needing external DB credentials
   - Simpler onboarding (no DB connection configuration needed)
   - Works offline for file-based analysis

5. **Report Generation**
   - Generate PDFs server-side (using `puppeteer` or `pdfkit`)
   - Store in S3
   - Link from MongoDB report metadata

### ⚠️ Trade-offs to Consider

| Current | Proposed | Trade-off |
|---------|----------|-----------|
| BigQuery for external data | DuckDB for files only | **Loss**: Can't query user's existing DBs; **Gain**: Simpler UX, cost savings |
| In-memory parsing | DuckDB + temp files | **Gain**: SQL support, better performance; **Loss**: Disk I/O for large files (>100MB) |
| Local file storage | S3 + temp staging | **Gain**: Scalable, secure; **Loss**: AWS dependency, setup complexity |
| No thumbnails/PDFs | S3-stored assets | **Gain**: Rich reports, caching; **Loss**: Storage cost (minimal) |

---

## Implementation Roadmap

### Phase 1: Core Architecture (Weeks 1-2)
1. **Add S3 Integration**
   - Install `aws-sdk` or `@aws-sdk/client-s3`
   - Create service module `quantibi-backend/src/services/s3.js`
   - Implement: upload, download, delete, listObjects
   - Update Database model to store S3 keys instead of file paths

2. **Add DuckDB Query Engine**
   - Install `duckdb` npm package
   - Create service module `quantibi-backend/src/services/duckdb.js`
   - Implement: 
     - `streamFileFromS3ToDuckDB(s3Key)` → DuckDB connection
     - `executeQuery(connection, sql)` → results
     - `detectSchema(filePath)` → column types

3. **Update File Upload Route**
   - Redirect uploads to S3 instead of local `uploads/`
   - Store S3 key in MongoDB `Database.filePath`
   - Delete local files after S3 upload

### Phase 2: Query Generation (Weeks 3-4)
1. **Update Chart Generation**
   - Replace BigQuery logic with DuckDB calls
   - Keep BigQuery support for power users
   - Update `charts.js` to dispatch queries to DuckDB service

2. **Update Dataset Preview**
   - Fetch file from S3 → DuckDB
   - Run `SELECT * LIMIT 100` to populate schema

3. **Test with Sample Files**
   - 1MB CSV, 50MB XLSX, 200MB CSV
   - Measure query latency and memory usage

### Phase 3: Reports & Assets (Weeks 5-6)
1. **PDF Generation**
   - Install `puppeteer` (headless Chrome) or `pdfkit`
   - Generate chart PNGs → embed in PDF template
   - Store PDF in S3
   - Update Report model with `pdfS3Key` field

2. **Chart Thumbnails** (optional)
   - Generate PNG on chart creation
   - Store in S3 at `thumbnails/{chartId}.png`
   - Use in chart list views

3. **Cleanup**
   - Implement S3 lifecycle policy for temp files
   - Add cron job to delete orphaned reports/thumbnails

---

## Updated Tech Stack (Post-Migration)

### Backend Dependencies (New)
```json
{
  "@aws-sdk/client-s3": "^3.x",
  "duckdb": "^0.9.x",
  "puppeteer": "^21.x",
  "pdfkit": "^0.13.x"
}
```

### Backend Architecture
```
quantibi-backend/src/
├── services/
│   ├── s3.js           (upload, download, delete)
│   ├── duckdb.js       (query, schema detection)
│   └── pdf.js          (chart → PDF, report generation)
├── routes/
│   ├── charts.js       (updated to use DuckDB)
│   └── datasets.js     (updated S3 paths)
└── models/
    ├── Database.js     (updated filePath → s3Key)
    └── Report.js       (added pdfS3Key)
```

### Environment Variables (New)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=quantibi-files-prod
S3_TEMP_FOLDER=temp/
```

---

## Migration Plan (Existing Data)

1. **Non-Destructive**
   - Keep MongoDB as-is (no schema changes needed immediately)
   - Add new S3 infrastructure alongside existing system
   - Create migration script to batch-upload existing files to S3

2. **Gradual Rollout**
   - New uploads → S3
   - Existing files → lazy migrate on first query (download from local, re-upload to S3, update DB)
   - After 30 days, delete local files

3. **Fallback**
   - If S3 fails, DuckDB service can still read from local `uploads/` directory
   - Routes can detect `filePath` vs `s3Key` and handle both cases

---

## Cost Analysis (Estimated Monthly)

### S3 Storage
- Assume 1000 active users, 10MB avg file per user = 10GB
- Cost: 10GB × $0.023/month = **$0.23/month** ✅ negligible

### S3 Requests
- 1000 users × 5 queries/month = 5,000 requests
- GET: 5,000 × $0.0004 = $2
- PUT: 1,000 × $0.005 = $5
- Total: **$7/month** ✅

### DuckDB
- Included in application (no separate service) = **$0/month**

### PDF Generation (Puppeteer)
- Light usage; runs on existing server = **$0/month** (compute only)

### vs BigQuery Comparison
- BigQuery at 10,000 queries/month @ 100MB avg = $50+/month ❌
- **Savings: $43+/month per 1000 users**

---

## My Assessment & Recommendation

### ✅ **I strongly recommend your proposed stack**

**Reasons:**
1. **Perfect fit for the use case** - DuckDB + S3 is industry-standard for file-based BI/analytics
2. **Cost-effective** - Orders of magnitude cheaper than BigQuery
3. **Better UX** - Users upload files; no database credentials needed
4. **Scalable** - S3 is infinitely scalable; DuckDB is serverless
5. **Future-proof** - Can still add BigQuery as power-user feature

### Current Gaps to Address
1. **S3 integration** - not currently in place; need to add
2. **DuckDB** - not currently used; need to integrate
3. **PDF generation** - not implemented; need to add
4. **File preview/schema detection** - currently ad-hoc; DuckDB makes this robust

### Implementation Priority
1. **High**: S3 + DuckDB (core functionality)
2. **Medium**: PDF generation (reports feature)
3. **Low**: Chart thumbnails (nice-to-have)

### Estimated Effort
- **S3 Integration**: 2-3 days (wrapper service + tests)
- **DuckDB Integration**: 3-4 days (schema detection, query routing, testing)
- **PDF Generation**: 2 days (template + Puppeteer setup)
- **Migration & Testing**: 2-3 days
- **Total**: ~2 weeks for full implementation

---

## Questions for You

1. **BigQuery Support**: Should we keep BigQuery as optional for power users (users who want to query their own enterprise DBs)?
2. **File Size Limits**: What's the max file size you want to support? (DuckDB handles GB-scale efficiently)
3. **AWS Account**: Do you already have AWS setup, or is this a new service?
4. **Timeline**: Can this be prioritized in the next sprint, or should it wait?

Let me know and I can start implementing! 🚀
