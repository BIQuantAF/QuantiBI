const { BigQuery } = require('@google-cloud/bigquery');

/**
 * Create a BigQuery client from stored credentials and projectId
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @returns {BigQuery}
 */
function createBigQueryClient(projectId, credentialsJson) {
  let credentials;
  if (typeof credentialsJson === 'string') {
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (err) {
      throw new Error('Invalid JSON credentials');
    }
  } else {
    credentials = credentialsJson;
  }
  return new BigQuery({
    projectId,
    credentials,
  });
}

/**
 * Test BigQuery connection by listing datasets
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testBigQueryConnection(projectId, credentialsJson) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    await bigquery.getDatasets();
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  createBigQueryClient,
  testBigQueryConnection,
};
