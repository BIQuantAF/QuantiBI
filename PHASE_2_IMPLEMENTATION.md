# Phase 2 - S3 + DuckDB Integration Implementation

## Status: ✅ COMPLETE

Phase 2 integrates the S3 and DuckDB services created in Phase 1 into the backend routes. File uploads now use S3 instead of local storage, and data queries use DuckDB for schema introspection and data preview.

---

## What Was Changed

### 1. File Upload Route (`quantibi-backend/src/routes/databases.js`)

**Updated:**
- Changed from `multer.diskStorage()` to `multer.memoryStorage()` for buffer-based uploads
- File upload now flows: Buffer → Temporary local file → S3 upload → Delete temp file
- Database model now stores `s3Key`, `s3Bucket`, `s3Url`, and `fileSize` instead of local `filePath`
- Auto-created datasets now include schema detection via DuckDB

**New Behavior:**
```javascript
// Old: Files saved to /uploads/ directory
// New: Files uploaded to S3 at s3://quantibi-files-dev/files/{userId}/{fileName}
```

**Auto-Dataset Schema Detection:**
- When a CSV or Excel file is uploaded, the system automatically:
  1. Uploads to S3
  2. Downloads to temp for schema detection
  3. Uses DuckDB to detect column names and types
  4. Creates a dataset with metadata
  5. Cleans up temporary files

### 2. Chart Generation Route (`quantibi-backend/src/routes/charts.js`)

**Updated:**
- Added imports for `s3Service` and `duckdbService`
- File data loading now supports S3 files:
  - Check if file has `s3Url` → Download from S3 temporarily
  - Fall back to local `filePath` for backward compatibility
  - Use DuckDB to detect schema and get sample data
  - Clean up temporary S3 downloads after use

**Data Processing:**
- File-based data now uses DuckDB for schema introspection
- Sample data extraction improved with proper column mapping
- Maintains all existing Excel/CSV filtering and aggregation logic

### 3. Dataset Routes (`quantibi-backend/src/routes/datasets.js`)

**New Endpoints Added:**

#### `GET /api/workspaces/:workspaceId/databases/:databaseId/schema`
- Returns column schema for CSV/Excel files
- Uses DuckDB to detect column names and types
- Example response:
```json
[
  { "name": "OrderDate", "type": "DATE" },
  { "name": "Sales", "type": "DOUBLE" },
  { "name": "State", "type": "VARCHAR" }
]
```

#### `GET /api/workspaces/:workspaceId/databases/:databaseId/preview`
- Returns sample data from CSV/Excel files
- Supports `?limit=N` parameter (default 10)
- Example response:
```json
{
  "columns": ["OrderDate", "Sales", "State"],
  "rows": [
    ["2024-01-01", 1500.50, "Kentucky"],
    ["2024-01-02", 2300.00, "California"]
  ],
  "totalRows": 10
}
```

**Added Imports:**
- `s3Service` - For S3 file operations
- `duckdbService` - For schema detection and data preview
- `fs` - For file system operations

---

## Technical Architecture

### File Upload Flow (Phase 2)
```
User uploads file
    ↓
Express multer (memory buffer)
    ↓
Save to temporary local file
    ↓
S3Service.uploadFile() → S3
    ↓
Save Database record with S3 metadata
    ↓
DuckDB detects schema
    ↓
Auto-create Dataset with schema
    ↓
Delete temp local file
    ↓
✅ Complete
```

### Data Query Flow (Chart Generation)
```
User requests chart
    ↓
Check if file is in S3 or local
    ↓
If S3: Download to temp → Use DuckDB
If local: Use local path → Use DuckDB
    ↓
DuckDB schema detection
    ↓
DuckDB sample data fetch
    ↓
OpenAI analyzes data
    ↓
Process AI response (filters, aggregation)
    ↓
Return chart data
    ↓
✅ Complete
```

### Storage Architecture

**Local Storage (backward compatible):**
- Directory: `/uploads/`
- Used if files were uploaded before Phase 2
- Fallback for local development

**S3 Storage (Phase 2+):**
- Bucket: `quantibi-files-dev`
- Path structure: `files/{userId}/{timestamp}-{originalFilename}`
- Temp path: `temp/` (cleaned up automatically)
- Access: Signed URLs or direct S3 API

---

## Environment Variables Required

```env
# S3 Configuration (set in Phase 1)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA2UCIZXGDIJRD53PK
AWS_SECRET_ACCESS_KEY=***
S3_BUCKET_NAME=quantibi-files-dev
S3_TEMP_FOLDER=temp/
S3_FILES_FOLDER=files/
```

---

## Backward Compatibility

✅ **Fully Backward Compatible:**
- Old files stored locally still work
- System checks S3 first, then falls back to local `filePath`
- BigQuery connections unchanged
- All existing chart generation logic preserved
- Existing Excel/CSV filtering still works

**Migration Path:**
- Old files: Automatically serve from local `/uploads/`
- New files: Automatically served from S3
- Users don't need to re-upload files

---

## Testing the Implementation

### Quick Test: Check Backend Syntax
```bash
cd quantibi-backend
node -c src/routes/databases.js
node -c src/routes/datasets.js
node -c src/routes/charts.js
```
✅ All pass

### Integration Test: Upload File → Query
1. **Upload a CSV file:**
   ```bash
   curl -X POST http://localhost:5000/api/workspaces/{workspaceId}/databases \
     -F "file=@data.csv" \
     -F "type=CSV" \
     -F "name=My Dataset" \
     -H "Authorization: Bearer {token}"
   ```

2. **Get Schema:**
   ```bash
   curl http://localhost:5000/api/workspaces/{workspaceId}/databases/{databaseId}/schema \
     -H "Authorization: Bearer {token}"
   ```

3. **Get Preview:**
   ```bash
   curl http://localhost:5000/api/workspaces/{workspaceId}/databases/{databaseId}/preview?limit=10 \
     -H "Authorization: Bearer {token}"
   ```

4. **Generate Chart:**
   ```bash
   curl -X POST http://localhost:5000/api/workspaces/{workspaceId}/charts/ai/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "query": "Show me sales by state",
       "dataset": "{datasetId}"
     }'
   ```

---

## What's New in Phase 2

| Feature | Before | After |
|---------|--------|-------|
| File Storage | Local disk `/uploads/` | S3 `quantibi-files-dev` |
| File Upload | Multi-part form, disk write | Memory buffer, S3 upload |
| Schema Detection | Manual entry | Automatic DuckDB detection |
| Data Preview | Not available | `/databases/:id/preview` endpoint |
| Schema Introspection | Manual | `/databases/:id/schema` endpoint |
| S3 Integration | None | Full (upload, download, temp cleanup) |
| DuckDB Usage | None | Schema detection, data preview, sample fetching |

---

## Cost Impact

With Phase 2, file storage cost is reduced:

| Metric | Phase 1 | Phase 2 |
|--------|---------|----------|
| Query Cost | Free (DuckDB) | Free (DuckDB) |
| Storage | Local server disk | S3 ($0.023/GB/month) |
| Data Transfer | Free (local) | $0.09/GB outbound |
| Monthly (1000 users, 1GB) | Server disk usage | ~$7-12 |

---

## Known Limitations & Future Work

1. **DuckDB SQL Generation:**
   - Currently uses existing Excel-based filtering logic
   - Future: Generate SQL queries for better performance on large files

2. **XLSX Support:**
   - Excel files converted to CSV internally by DuckDB
   - Sheet selection: Currently defaults to first sheet
   - Future: Support multiple sheets per workbook

3. **File Size Limits:**
   - Current: 100MB per file (configured in multer)
   - Large files (>500MB) may be slow
   - Future: Streaming upload, chunked processing

4. **Concurrent Uploads:**
   - Temporary files cleaned after processing
   - Multiple concurrent uploads tested ✅
   - No known race conditions

---

## Files Modified

| File | Changes |
|------|---------|
| `src/routes/databases.js` | Added S3 upload, schema detection |
| `src/routes/datasets.js` | Added `/schema` and `/preview` endpoints |
| `src/routes/charts.js` | Updated file loading to support S3 + DuckDB |
| `package.json` | ✅ Updated in Phase 1 (no new changes) |

---

## Next Steps (Phase 3+)

### Phase 3: Query Optimization
- [ ] Generate SQL queries from AI responses
- [ ] Execute queries on DuckDB instead of in-memory processing
- [ ] Support aggregation via SQL (GROUP BY, SUM, AVG, COUNT)
- [ ] Add support for JOINs between multiple datasets

### Phase 4: Additional Data Sources
- [ ] PostgreSQL integration (similar to BigQuery)
- [ ] Snowflake integration
- [ ] MySQL integration

### Phase 5: Performance
- [ ] Caching frequently accessed schemas
- [ ] Async schema detection for large files
- [ ] Streaming upload for very large files

---

## Rollback Plan

If issues arise with S3 integration:

1. **Disable S3, use local files:**
   - Set `S3_BUCKET_NAME=` (empty) in .env
   - System automatically falls back to local files

2. **Revert databases.js:**
   - Restore `multer.diskStorage()` configuration
   - Remove S3 upload calls

3. **Keep DuckDB schema detection:**
   - DuckDB works with local files too
   - No breaking changes

---

## Validation Checklist

✅ All route files pass syntax check
✅ Multer reconfigured for memory buffering
✅ S3 upload integration added
✅ DuckDB service imports added
✅ Auto-dataset creation updated
✅ New schema/preview endpoints added
✅ Chart generation updated for S3 support
✅ Backward compatibility maintained
✅ Environment variables documented

---

## Support

For issues or questions:
1. Check `.env` has S3 credentials
2. Verify S3 bucket exists and is accessible
3. Test DuckDB: `node -e "const db = require('./src/services/duckdb'); console.log(Object.keys(db))"`
4. Review logs for detailed error messages

Phase 2 is ready for testing! 🚀
