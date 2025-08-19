const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class BackblazeB2Service {
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
      },
    });
    
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.urlExpiry = parseInt(process.env.SIGNED_URL_EXPIRY) || 86400;
  }

  /**
   * Generate a signed URL for a video file
   * @param {string} filePath - Path to file in B2 (e.g., 'recital-2025/full-recital.mp4')
   * @param {number} expirySeconds - Optional custom expiry time
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(filePath, expirySeconds = null) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: expirySeconds || this.urlExpiry,
      });

      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate download link');
    }
  }

  /**
   * Generate signed URLs for multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Object>} Map of filePath to signed URL
   */
  async getMultipleSignedUrls(filePaths) {
    const urls = {};
    
    for (const path of filePaths) {
      try {
        urls[path] = await this.getSignedUrl(path);
      } catch (error) {
        console.error(`Failed to generate URL for ${path}:`, error);
        urls[path] = null;
      }
    }
    
    return urls;
  }
}

module.exports = new BackblazeB2Service();