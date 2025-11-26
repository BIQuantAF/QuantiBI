# Phase 1 Implementation Guide: S3 + DuckDB Integration

## Overview
This document guides you through setting up AWS S3 for file storage and DuckDB for querying local files in QuantiBI.

## What Was Added

### 1. Backend Dependencies
Added to `package.json`:
- `@aws-sdk/client-s3`: AWS SDK for S3 operations
- `duckdb`: Local query engine (lightweight SQL support)

### 2. S3 Service Module (`src/services/s3.js`)
Provides helper functions for S3 operations:

```javascript
// Upload a file
const result = await s3Service.uploadFile(fileBuffer, 'data.csv', workspaceId);
// Returns: { key, size, originalFileName }

// Download file to temp directory
const localPath = await s3Service.downloadFileToTemp(s3Key, tempDir);

// Get file metadata
const metadata = await s3Service.getFileMetadata(s3Key);

// Delete file
await s3Service.deleteFile(s3Key);

// Get signed URL for direct S3 access
const url = await s3Service.getSignedDownloadUrl(s3Key);

// List files in workspace
const files = await s3Service.listFilesInWorkspace(workspaceId);

// Clean up local temp file
s3Service.cleanupLocalFile(filePath);
```

### 3. DuckDB Service Module (`src/services/duckdb.js`)
Provides SQL query engine for local files:

```javascript
// Execute SQL query on file
const results = await duckdbService.executeQuery(filePath, sql);

// Detect schema from file
const schema = await duckdbService.detectSchema(filePath);
// Returns: [{ name: 'column', type: 'VARCHAR' }, ...]

// Get sample data for preview
const { columns, rows, totalRows } = await duckdbService.getSampleData(filePath, 100);

// Execute chart query
const { columns, rows } = await duckdbService.executeChartQuery(filePath, sql);
```

### 4. Database Model Updates
Added S3-related fields to `Database.js`:
- `s3Key`: S3 object key
- `s3Bucket`: S3 bucket name
- `s3Url`: S3 file URL
- `fileSize`: File size in bytes

Kept `filePath` and `fileType` for backward compatibility with existing uploads.

### 5. Environment Configuration
Added to `.env`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=quantibi-files-dev
S3_TEMP_FOLDER=temp/
S3_FILES_FOLDER=files/
```

## Setup Instructions

### Step 1: Install Dependencies
```bash
cd quantibi-backend
npm install
```

This will install `@aws-sdk/client-s3` and `duckdb` packages.

### Step 2: Configure AWS Credentials

#### Option A: Local Development (Recommended)
1. Create an AWS IAM user with S3 access
2. Generate access keys (Access Key ID + Secret Access Key)
3. Add to `.env`:
   ```env
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

#### Option B: Using AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

### Step 3: Create S3 Bucket
```bash
aws s3 mb s3://quantibi-files-dev --region us-east-1
```

Or use AWS Console:
1. Go to S3 dashboard
2. Click "Create bucket"
3. Name: `quantibi-files-dev`
4. Region: `us-east-1`
5. Block public access (keep checked)

### Step 4: Set Bucket Policy

#### Option A: Using AWS Console (Easiest)

1. **Get your AWS Account ID:**
   - Go to: https://console.aws.amazon.com/iam/home#/security_credentials
   - Look for **Account ID** (12-digit number, e.g., `123456789012`)
   - Copy it

2. **Go to S3 bucket policy:**
   - Go to: https://s3.console.aws.amazon.com/
   - Click `quantibi-files-dev` bucket
   - Click **Permissions** tab
   - Scroll to **Bucket Policy**
   - Click **Edit**

3. **Paste this policy** (replace `YOUR_AWS_ACCOUNT_ID` with your 12-digit Account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::quantibi-files-dev",
        "arn:aws:s3:::quantibi-files-dev/*"
      ]
    }
  ]
}
```

**Example** (if your Account ID is `123456789012`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::quantibi-files-dev",
        "arn:aws:s3:::quantibi-files-dev/*"
      ]
    }
  ]
}
```

4. **Click Save changes**

#### Option B: Using Node.js Script (if you prefer CLI)

If you have Node.js installed and AWS SDK available:

```bash
# Edit the script and add your Account ID
cd quantibi-backend
# Open: setup-s3-policy.js
# Change: const AWS_ACCOUNT_ID = 'YOUR_ACCOUNT_ID_HERE';
# To your 12-digit Account ID

# Run the script
node setup-s3-policy.js
```

**Note:** You'll see a warning that the bucket is now publicly accessible—this is normal. The policy only allows operations from your AWS account root.

### Step 5: Test Configuration
```bash
cd quantibi-backend
node -e "
const s3Service = require('./src/services/s3');
console.log('S3 Service loaded successfully');
"
```

## Integration Steps (Phase 2)

### Next: Update File Upload Routes
The next phase will:
1. Modify `datasets.js` upload route to use S3 instead of local storage
2. Update chart generation to download files from S3 and use DuckDB
3. Update dataset preview to use DuckDB for schema detection

### File Upload Flow (To Be Implemented)
```
User Upload
    ↓
Express Route (datasets.js)
    ↓
S3 Service: uploadFile()
    ↓
S3 Bucket (persisted)
    ↓
Database Model: save s3Key
    ↓
Success Response to Frontend
```

### Chart Generation Flow (To Be Implemented)
```
User Request: Generate Chart
    ↓
S3 Service: downloadFileToTemp()
    ↓
Local Temp File
    ↓
DuckDB Service: executeChartQuery()
    ↓
Chart Data Results
    ↓
S3 Service: cleanupLocalFile()
    ↓
Response to Frontend
```

## Development Tips

### Testing S3 Operations
```javascript
// In quantibi-backend/src/index.js or a test file
const s3Service = require('./services/s3');

// Test upload
const buffer = Buffer.from('name,age\nAlice,30\n');
const result = await s3Service.uploadFile(buffer, 'test.csv', 'workspace-123');
console.log('Upload result:', result);
```

### Testing DuckDB Queries
```javascript
const duckdbService = require('./services/duckdb');

// Test schema detection
const schema = await duckdbService.detectSchema('/path/to/file.csv');
console.log('Schema:', schema);

// Test sample data
const sample = await duckdbService.getSampleData('/path/to/file.csv');
console.log('Sample:', sample);
```

### Monitoring S3 Files
```bash
# List all files in S3 bucket
aws s3 ls s3://quantibi-files-dev/ --recursive

# Download a specific file
aws s3 cp s3://quantibi-files-dev/files/workspace-123/file.csv ./

# Delete old files
aws s3 rm s3://quantibi-files-dev/ --recursive --exclude "files/*" --include "temp/*"
```

## Cost Estimates
- **S3 Storage**: ~$0.023/GB/month
- **S3 Requests**: 
  - PUT: $0.005 per 1,000 requests
  - GET: $0.0004 per 1,000 requests
- **DuckDB**: Included (runs locally, no service costs)

For 1,000 active users with 10MB avg files:
- **Storage**: ~$0.23/month
- **Requests** (5 queries/user/month): ~$7/month
- **Total**: ~$7/month

## Troubleshooting

### "AWS_ACCESS_KEY_ID not set"
**Solution**: Add credentials to `.env` file or use AWS CLI `aws configure`

### "NoSuchBucket" error
**Solution**: Create S3 bucket matching `S3_BUCKET_NAME` environment variable

### "AccessDenied" when uploading to S3
**Solution**: Check IAM user permissions include `s3:PutObject` action

### DuckDB parse error on CSV
**Solution**: Ensure CSV file has proper formatting (quoted fields if contains commas)

## Files Modified/Created

### Created
- `quantibi-backend/src/services/s3.js` (210 lines)
- `quantibi-backend/src/services/duckdb.js` (280 lines)

### Modified
- `quantibi-backend/package.json` (added @aws-sdk/client-s3, duckdb)
- `quantibi-backend/src/models/Database.js` (added s3Key, s3Bucket, s3Url, fileSize fields)
- `quantibi-backend/.env` (added AWS_* variables)

## Next Steps (Phase 2)
1. Update file upload route to use S3
2. Update chart generation to download from S3 + use DuckDB
3. Update dataset preview to use DuckDB for schema detection
4. Add S3 lifecycle policy for temp file cleanup

## References
- [AWS S3 JavaScript SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [DuckDB Documentation](https://duckdb.org/docs/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BestPractices.html)
