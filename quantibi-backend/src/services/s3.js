const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * S3 Service - Handles file uploads, downloads, and management
 */

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'quantibi-files';
const TEMP_FOLDER = process.env.S3_TEMP_FOLDER || 'temp/';
const FILES_FOLDER = process.env.S3_FILES_FOLDER || 'files/';

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File content
 * @param {string} originalFileName - Original filename
 * @param {string} workspaceId - Workspace ID for organization
 * @returns {Promise<{key: string, url: string, size: number}>}
 */
async function uploadFile(fileBuffer, originalFileName, workspaceId) {
  try {
    // Generate unique key
    const ext = path.extname(originalFileName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const key = `${FILES_FOLDER}${workspaceId}/${timestamp}-${random}${ext}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(ext),
      Metadata: {
        'original-filename': originalFileName,
        'workspace-id': workspaceId,
        'upload-timestamp': new Date().toISOString(),
      },
    };

    await s3Client.send(new PutObjectCommand(params));

    console.log(`✅ File uploaded to S3: ${key}`);

    return {
      key,
      size: fileBuffer.length,
      originalFileName,
    };
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Download file from S3 to local temp directory
 * @param {string} s3Key - S3 object key
 * @param {string} tempDir - Local temp directory path
 * @returns {Promise<string>} - Local file path
 */
async function downloadFileToTemp(s3Key, tempDir) {
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    const response = await s3Client.send(new GetObjectCommand(params));
    const fileContent = await response.Body.transformToByteArray();

    const fileName = path.basename(s3Key);
    const localPath = path.join(tempDir, fileName);

    fs.writeFileSync(localPath, fileContent);
    console.log(`✅ File downloaded from S3: ${localPath}`);

    return localPath;
  } catch (error) {
    console.error('❌ S3 download error:', error);
    throw new Error(`Failed to download file from S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteFile(s3Key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`✅ File deleted from S3: ${s3Key}`);
  } catch (error) {
    console.error('❌ S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
}

/**
 * Get S3 file metadata (size, last modified, etc.)
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Object>}
 */
async function getFileMetadata(s3Key) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    const response = await s3Client.send(new HeadObjectCommand(params));

    return {
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      metadata: response.Metadata || {},
    };
  } catch (error) {
    console.error('❌ S3 metadata error:', error);
    throw new Error(`Failed to get file metadata from S3: ${error.message}`);
  }
}

/**
 * Generate signed URL for direct S3 access (useful for large files)
 * @param {string} s3Key - S3 object key
 * @param {number} expirationSeconds - URL expiration time (default 1 hour)
 * @returns {Promise<string>}
 */
async function getSignedDownloadUrl(s3Key, expirationSeconds = 3600) {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });

    return url;
  } catch (error) {
    console.error('❌ S3 signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * List all files in a workspace folder
 * @param {string} workspaceId - Workspace ID
 * @returns {Promise<Array>}
 */
async function listFilesInWorkspace(workspaceId) {
  try {
    const prefix = `${FILES_FOLDER}${workspaceId}/`;
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return (response.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  } catch (error) {
    console.error('❌ S3 list error:', error);
    throw new Error(`Failed to list files in workspace: ${error.message}`);
  }
}

/**
 * Clean up temp files locally (after processing with DuckDB)
 * @param {string} filePath - Local file path to delete
 * @returns {void}
 */
function cleanupLocalFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Temp file cleaned up: ${filePath}`);
    }
  } catch (error) {
    console.error('⚠️  Failed to cleanup temp file:', error);
  }
}

/**
 * Get content type based on file extension
 * @param {string} ext - File extension (e.g., '.csv', '.xlsx')
 * @returns {string}
 */
function getContentType(ext) {
  const types = {
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  uploadFile,
  downloadFileToTemp,
  deleteFile,
  getFileMetadata,
  getSignedDownloadUrl,
  listFilesInWorkspace,
  cleanupLocalFile,
  getContentType,
};
