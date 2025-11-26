// Quick script to set S3 bucket policy using AWS SDK directly
// Save this as: setup-s3-policy.js

const { S3Client, PutBucketPolicyCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Your AWS Account ID - CHANGE THIS
// Get it from: https://console.aws.amazon.com/billing/home#/account
// Or from: https://console.aws.amazon.com/iam/home#/security_credentials
const AWS_ACCOUNT_ID = 'YOUR_ACCOUNT_ID_HERE'; // e.g., 123456789012

const bucketName = process.env.S3_BUCKET_NAME || 'quantibi-files-dev';

const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        AWS: `arn:aws:iam::${AWS_ACCOUNT_ID}:root`,
      },
      Action: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      Resource: [
        `arn:aws:s3:::${bucketName}`,
        `arn:aws:s3:::${bucketName}/*`,
      ],
    },
  ],
};

async function setPolicyPolicy() {
  try {
    const params = {
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    };

    console.log(`Setting bucket policy for: ${bucketName}`);
    console.log(`AWS Account ID: ${AWS_ACCOUNT_ID}`);
    console.log('\nPolicy:');
    console.log(JSON.stringify(bucketPolicy, null, 2));

    const command = new PutBucketPolicyCommand(params);
    await s3Client.send(command);

    console.log('\n✅ Bucket policy set successfully!');
  } catch (error) {
    console.error('❌ Error setting bucket policy:', error.message);
    process.exit(1);
  }
}

// Run the function
setPolicyPolicy();
