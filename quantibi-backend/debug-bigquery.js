const { listDatasets, listTables } = require('./services/bigquery');

// You'll need to replace these with your actual credentials
const projectId = 'my-project-qbi-teest'; // Your project ID from the error
const credentials = `{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}`;

async function listAvailableDatasets() {
  try {
    console.log('Listing datasets in project:', projectId);
    const datasets = await listDatasets(projectId, credentials);
    console.log('Available datasets:', datasets);
    
    for (const dataset of datasets) {
      console.log(`\\nTables in dataset '${dataset}':`);
      try {
        const tables = await listTables(projectId, credentials, dataset);
        console.log(tables);
      } catch (error) {
        console.log('Error listing tables:', error.message);
      }
    }
  } catch (error) {
    console.error('Error listing datasets:', error.message);
  }
}

// Uncomment and run this to see what's available in your BigQuery project
// listAvailableDatasets();

console.log('To use this script:');
console.log('1. Replace the credentials object above with your actual BigQuery service account credentials');
console.log('2. Uncomment the listAvailableDatasets() call at the bottom');
console.log('3. Run: node debug-bigquery.js');