#!/usr/bin/env node
/**
 * Test script to verify CSV upload flow
 * This tests the S3 service methods that were fixed
 */

const path = require('path');
const fs = require('fs');

// Load environment variables manually
const envPath = path.join(__dirname, 'quantibi-backend/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
});

const s3Service = require('./quantibi-backend/src/services/s3.js');
const duckdbService = require('./quantibi-backend/src/services/duckdb.js');

// Create a test CSV file in root directory
const testFilePath = path.join(__dirname, 'test-data.csv');
const testCsvContent = `Name,Age,Department,Salary
John Doe,30,Engineering,95000
Jane Smith,28,Marketing,75000
Bob Johnson,35,Sales,85000
Alice Williams,32,Engineering,105000
Charlie Brown,29,HR,65000`;

fs.writeFileSync(testFilePath, testCsvContent);
console.log('✅ Created test CSV file:', testFilePath);

async function runTest() {
  try {
    console.log('\n📋 TESTING CSV UPLOAD FLOW\n');
    
    // Step 1: Test uploadFile with buffer
    console.log('Step 1: Testing s3Service.uploadFile() with buffer...');
    const fileBuffer = fs.readFileSync(testFilePath);
    const uploadResult = await s3Service.uploadFile(fileBuffer, 'test-data.csv', 'workspace-123');
    
    console.log('✅ Upload successful!');
    console.log('   - s3Key:', uploadResult.s3Key);
    console.log('   - s3Url:', uploadResult.s3Url);
    console.log('   - size:', uploadResult.size);
    console.log('   - originalFileName:', uploadResult.originalFileName);
    
    // Verify the response has the expected structure
    if (!uploadResult.s3Key) throw new Error('Missing s3Key in upload result');
    if (!uploadResult.s3Url) throw new Error('Missing s3Url in upload result');
    if (!uploadResult.size) throw new Error('Missing size in upload result');
    
    console.log('\n✅ Upload response structure is correct!\n');
    
    // Step 2: Test downloadFileToTemp
    console.log('Step 2: Testing s3Service.downloadFileToTemp()...');
    const downloadedPath = await s3Service.downloadFileToTemp(uploadResult.s3Key);
    
    console.log('✅ Download successful!');
    console.log('   - Downloaded to:', downloadedPath);
    console.log('   - File exists:', fs.existsSync(downloadedPath));
    
    if (!fs.existsSync(downloadedPath)) {
      throw new Error('Downloaded file does not exist at: ' + downloadedPath);
    }
    
    // Step 3: Test schema detection
    console.log('\nStep 3: Testing duckdbService.detectSchema()...');
    const schema = await duckdbService.detectSchema(downloadedPath);
    
    console.log('✅ Schema detection successful!');
    console.log('   - Columns detected:', schema.length);
    schema.forEach(col => {
      console.log(`   - ${col.name}: ${col.type}`);
    });
    
    if (schema.length === 0) {
      throw new Error('No columns detected in schema');
    }
    
    // Step 4: Cleanup
    console.log('\nStep 4: Testing cleanup...');
    await s3Service.cleanupLocalFile(downloadedPath);
    console.log('✅ Cleanup successful!');
    
    // Delete S3 file
    await s3Service.deleteFile(uploadResult.s3Key);
    console.log('✅ Deleted S3 file');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\nCSV upload flow is working correctly:');
    console.log('1. ✅ File uploaded to S3 with correct response format');
    console.log('2. ✅ File downloaded from S3 to temp location');
    console.log('3. ✅ Schema detected from CSV file');
    console.log('4. ✅ Cleanup completed successfully');
    console.log('\nThe 500 error on CSV upload should now be FIXED! 🎉\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    
    // Cleanup on error
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (e) {
      console.warn('Failed to cleanup test file');
    }
    
    process.exit(1);
  }
}

// Run the test
runTest();
