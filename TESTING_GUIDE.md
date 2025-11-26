# Quick Testing Guide - CSV Upload & Report Generation

## Prerequisites
- Backend running: `cd quantibi-backend && npm run dev` (runs on http://localhost:5000)
- Frontend running: `cd quantibi-frontend && npm start` (runs on http://localhost:3000)
- AWS credentials configured in `.env`
- MongoDB connection active

---

## Manual Testing Steps

### 1. Create a Test CSV File
Create `test-dataset.csv`:
```csv
Product,Q1,Q2,Q3,Q4
Electronics,45000,52000,58000,65000
Clothing,32000,35000,38000,41000
Home,28000,31000,34000,38000
Sports,18000,19000,20000,22000
Books,12000,13000,14000,15000
```

### 2. Test CSV Upload
1. Navigate to http://localhost:3000
2. Log in with Firebase credentials
3. Go to Datasets section
4. Click "Upload CSV"
5. Select `test-dataset.csv`
6. **Expected**: 
   - ✅ File uploaded successfully
   - ✅ No 500 errors
   - ✅ Dataset appears in list with 5 rows
   - ✅ Schema shows: Product (VARCHAR), Q1-Q4 (BIGINT)

### 3. Test Report Generation
1. Go to Reports section
2. Click "Generate Report"
3. Select the dataset you just uploaded
4. **Expected**:
   - ✅ Report starts generating
   - ✅ Status shows "Processing"
   - ✅ Report completes within 10 seconds
   - ✅ Report shows Summary, Insights, Statistics sections

### 4. Test PDF Export
1. In the generated report, click "Export as PDF"
2. **Expected**:
   - ✅ PDF downloads successfully
   - ✅ PDF contains all sections with proper formatting

### 5. Test Public Sharing
1. In the report, click "Share"
2. Copy the public link
3. Open link in new incognito window
4. **Expected**:
   - ✅ Report visible without login
   - ✅ PDF export available
   - ✅ Share link shows report title and summary

---

## Automated Test

Run the end-to-end test:
```bash
cd C:\Users\atfit\Documents\QuantiBI
node test-csv-upload.js
```

**Expected Output**:
```
✅ File uploaded to S3
✅ File downloaded from S3
✅ Schema detected: 4 columns
✅ ALL TESTS PASSED!
```

---

## Debugging

### If CSV Upload Fails (500 Error)
1. Check backend logs for error details
2. Verify AWS credentials in `.env`
3. Verify S3 bucket `quantibi-files-dev` exists
4. Check AWS region is `eu-north-1`
5. Verify file size < 5MB

### If Schema Detection Fails
1. Check that file is valid CSV
2. Verify column headers are present
3. Check for special characters in column names
4. Try with simpler CSV (fewer columns)

### If Report Generation Fails
1. Check OpenAI API key is valid
2. Check MongoDB connection
3. Verify dataset has data
4. Check backend logs for specific error

---

## Curl Commands for Testing

### Upload CSV
```bash
curl -X POST http://localhost:5000/api/workspaces/{workspaceId}/databases \
  -H "Authorization: Bearer {firebaseToken}" \
  -F "file=@test-dataset.csv" \
  -F "type=CSV" \
  -F "name=My Test Data"
```

### Create Report from Dataset
```bash
curl -X POST http://localhost:5000/api/workspaces/{workspaceId}/reports \
  -H "Authorization: Bearer {firebaseToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "{datasetId}",
    "title": "Test Report"
  }'
```

### Get Report Status
```bash
curl -X GET http://localhost:5000/api/workspaces/{workspaceId}/reports/{reportId} \
  -H "Authorization: Bearer {firebaseToken}"
```

### Access Public Report
```bash
curl -X GET http://localhost:5000/api/public/reports/{shareToken}
```

---

## Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| File Upload | < 2 seconds | Depends on file size and network |
| Schema Detection | < 1 second | Via DuckDB |
| Report Generation | 5-10 seconds | Via OpenAI API |
| PDF Export | < 2 seconds | Client-side rendering |

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 500 error on upload | Check AWS credentials and region |
| "File not found" | Verify S3 download functionality |
| Schema not detected | Check CSV format and DuckDB syntax |
| Report generation stuck | Check OpenAI API quota |
| PDF export blank | Check browser console for errors |
| Public link not working | Verify share token in database |

---

## Success Criteria

✅ **CSV Upload**:
- [ ] File uploads without error
- [ ] File appears in S3 bucket
- [ ] Auto-dataset created
- [ ] Schema detected correctly

✅ **Report Generation**:
- [ ] Report starts processing
- [ ] Status updates to "Completed"
- [ ] All sections (Summary, Insights, Stats) populated
- [ ] AI analysis is relevant to data

✅ **PDF Export**:
- [ ] PDF downloads successfully
- [ ] All text and formatting preserved
- [ ] Images/charts render correctly

✅ **Public Sharing**:
- [ ] Share link accessible without login
- [ ] Report displays correctly
- [ ] PDF export available in public view

---

**Last Updated**: December 22, 2024
**Status**: Ready for Testing ✅
