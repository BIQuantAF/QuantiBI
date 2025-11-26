# Phase 1 Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      QuantiBI Frontend                           │
│                      (React + TypeScript)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/JSON
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Backend                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Routes Layer                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • datasets.js (upload files)  [TO BE UPDATED]          │  │
│  │  • charts.js (generate charts)  [TO BE UPDATED]         │  │
│  │  • databases.js (manage connections)  [TO BE UPDATED]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│      ┌──────────────────┼──────────────────┐                   │
│      ▼                  ▼                  ▼                   │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│  │ S3 Service │   │DuckDB Svc │   │ Mongoose   │            │
│  │ (NEW ✨)   │   │ (NEW ✨)   │   │  Models    │            │
│  └────────────┘   └────────────┘   └────────────┘            │
└────────┬──────────────────┬───────────────────┬─────────────┘
         │                  │                   │
         │                  │                   │
    ┌────▼───────┐  ┌──────▼──────┐  ┌────────▼─────────┐
    │     AWS     │  │   Local     │  │    MongoDB      │
    │    S3       │  │  File System│  │                 │
    │  Bucket     │  │   /tmp/     │  │  Users, Datasets│
    │             │  │             │  │  Charts, Reports│
    └─────────────┘  └─────────────┘  └─────────────────┘
```

## Upload Flow (Phase 2)

```
User uploads file
       │
       ▼
Express Route: datasets.js
   POST /upload
       │
       ├─ Extract file from request
       │
       ├─ Validate file type (CSV, XLSX)
       │
       ├─ Call s3Service.uploadFile()
       │    │
       │    ├─ Generate unique S3 key (files/workspace-123/timestamp-random.csv)
       │    │
       │    ├─ Upload buffer to S3
       │    │
       │    └─ Return s3Key & metadata
       │
       ├─ Call duckdbService.detectSchema()
       │    │
       │    ├─ Download file from S3 to /tmp/
       │    │
       │    ├─ Parse CSV/XLSX
       │    │
       │    └─ Return column schema
       │
       ├─ Save to Database model
       │    {
       │      workspace: id,
       │      name: 'Sales Data',
       │      type: 'CSV',
       │      s3Key: 'files/workspace-123/...',
       │      s3Bucket: 'quantibi-files-dev',
       │      fileSize: 1024,
       │      schema: [...]
       │    }
       │
       └─ Return 201 with database record
```

## Query Flow (Phase 2)

```
User requests chart from dataset
       │
       ▼
Express Route: charts.js
   POST /generate
       │
       ├─ Get dataset by ID
       │
       ├─ Get s3Key from database record
       │
       ├─ Generate SQL via OpenAI
       │    (Based on natural language query)
       │
       ├─ Call s3Service.downloadFileToTemp()
       │    │
       │    ├─ Create /tmp/quantibi/ directory
       │    │
       │    ├─ Download s3Key from S3
       │    │
       │    └─ Return local file path
       │
       ├─ Call duckdbService.executeChartQuery()
       │    │
       │    ├─ Open CSV/XLSX file
       │    │
       │    ├─ Create virtual table in DuckDB
       │    │
       │    ├─ Execute SQL query
       │    │
       │    └─ Return aggregated results
       │
       ├─ Transform results to Chart.js format
       │
       ├─ Call s3Service.cleanupLocalFile()
       │    │
       │    └─ Delete /tmp/quantibi/filename
       │
       └─ Return 200 with chart data
```

## File Organization

```
quantibi-backend/
├── src/
│   ├── services/
│   │   ├── s3.js                    ✨ NEW - S3 operations
│   │   ├── duckdb.js               ✨ NEW - DuckDB queries
│   │   ├── bigquery.js             ✅ Existing (keep for power users)
│   │   └── usage.js                ✅ Existing
│   │
│   ├── routes/
│   │   ├── datasets.js             📝 TO UPDATE - use S3
│   │   ├── charts.js               📝 TO UPDATE - use DuckDB
│   │   └── databases.js            📝 TO UPDATE - remove file ops
│   │
│   ├── models/
│   │   ├── Database.js             ✅ UPDATED - added s3* fields
│   │   ├── Chart.js                ✅ Existing
│   │   └── Dataset.js              ✅ Existing
│   │
│   └── index.js                    ✅ Existing
│
├── uploads/                        ⚠️  DEPRECATED (Phase 2)
│   └── file-*.csv                  (will migrate to S3)
│
├── temp/                           ✨ NEW (temporary storage)
│   └── duckdb-*.db
│   └── quantibi/
│       └── downloaded-files
│
├── package.json                    ✅ UPDATED - added deps
├── .env                            ✅ UPDATED - added AWS vars
└── .env.example                    📝 TO UPDATE - add AWS template
```

## Data Flow: End-to-End

```
SCENARIO: User uploads CSV, generates chart, downloads report

1. UPLOAD PHASE
   User selects file.csv
   │
   ├─ Frontend: POST /api/datasets/upload (multipart/form-data)
   │
   ├─ Backend:
   │   ├─ s3Service.uploadFile(buffer, 'file.csv', workspaceId)
   │   │  └─ S3 Bucket: files/workspace-123/1700000000-abc.csv ✅
   │   │
   │   ├─ duckdbService.detectSchema(temp/file.csv)
   │   │  └─ Result: [{ name: 'Product', type: 'VARCHAR' }, ...]
   │   │
   │   └─ Database.create({ s3Key: '...', schema: [...] })
   │
   └─ Response: 201 Created { datasetId, schema, s3Key }

2. CHART GENERATION PHASE
   User: "Show sales by product"
   │
   ├─ Frontend: POST /api/charts (query: "Show sales by product")
   │
   ├─ Backend:
   │   ├─ OpenAI generates SQL: "SELECT product, SUM(amount) FROM data GROUP BY product"
   │   │
   │   ├─ s3Service.downloadFileToTemp('files/workspace-123/1700000000-abc.csv')
   │   │  └─ Local: /tmp/quantibi/1700000000-abc.csv ✅
   │   │
   │   ├─ duckdbService.executeChartQuery(local_path, sql)
   │   │  ├─ Load CSV into DuckDB
   │   │  ├─ Execute: SELECT product, SUM(amount) FROM data GROUP BY product
   │   │  └─ Result: [
   │   │         { product: 'Widget', sum: 5000 },
   │   │         { product: 'Gadget', sum: 3000 }
   │   │      ]
   │   │
   │   ├─ Format for Chart.js (labels, datasets)
   │   │
   │   ├─ s3Service.cleanupLocalFile(/tmp/quantibi/1700000000-abc.csv)
   │   │  └─ Deleted ✅
   │   │
   │   └─ Database.create({ title: '...', type: 'bar', data: {...} })
   │
   └─ Response: 201 Created { chartId, chart_data }

3. REPORT GENERATION PHASE (Future)
   User: "Generate AI report from these charts"
   │
   ├─ Backend (async):
   │   ├─ OpenAI: "Summarize these chart insights"
   │   │
   │   └─ Generate PDF:
   │       ├─ Puppeteer renders HTML → PDF
   │       │
   │       ├─ s3Service.uploadFile(pdfBuffer, 'report.pdf')
   │       │  └─ S3: files/workspace-123/report-1700000000.pdf ✅
   │       │
   │       └─ Report.update({ pdfS3Key: '...', status: 'completed' })
   │
   └─ Frontend polls /api/reports/:id until status=completed
```

## Database Schema Changes

### Before (Phase 0)
```javascript
Database {
  filePath: 'uploads/file-123.csv',  // Local storage
  fileType: 'CSV'
}
```

### After (Phase 1)
```javascript
Database {
  filePath: 'uploads/file-123.csv',  // Keep for backward compat
  fileType: 'CSV',
  
  // NEW S3 fields
  s3Key: 'files/workspace-123/1700000000-abc.csv',
  s3Bucket: 'quantibi-files-dev',
  s3Url: 'https://s3.amazonaws.com/.../file.csv',
  fileSize: 1024
}
```

## Environment Variables

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# S3 Storage Organization
S3_BUCKET_NAME=quantibi-files-dev           # Bucket name
S3_TEMP_FOLDER=temp/                        # Temporary files folder
S3_FILES_FOLDER=files/                      # Persistent files folder
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Upload 10MB CSV to S3 | ~2-5s | Depends on network |
| Download 10MB from S3 to temp | ~2-5s | Depends on network |
| Parse 10MB CSV in DuckDB | ~100-200ms | Local processing |
| Execute simple aggregation | ~50-100ms | In-memory query |
| **Total for chart generation** | **~5-11s** | End-to-end |

vs BigQuery: **20-30s** (due to API calls)
vs In-Memory (old): **1-2s** (but doesn't scale to 100MB+)

## Scaling Strategy

1. **Immediate** (0-100K users)
   - S3 Standard tier
   - DuckDB in-process
   - Temp files cleaned up after 1 hour

2. **Medium** (100K-1M users)
   - S3 with intelligent-tiering
   - DuckDB on separate process pool
   - Lambda functions for async processing

3. **Large** (1M+ users)
   - S3 with lifecycle policies
   - DuckDB cluster or replace with Presto/Trino
   - Message queue for async jobs (SQS/RabbitMQ)
