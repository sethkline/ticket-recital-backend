class BackblazeB2Service {
  constructor() {
    this.bucketName = process.env.B2_BUCKET_NAME;
    console.log('B2 public service initialized for bucket:', this.bucketName);
  }

  /**
   * Generate a signed URL for a video file
   * @param {string} filePath - Path to file in B2 (e.g., 'recital-2025/full-recital.mp4')
   * @param {number} expirySeconds - Optional custom expiry time
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(filePath, expirySeconds = null) {
    try {
      // Since bucket is now public, return direct URL
      const url = `https://f000.backblazeb2.com/file/${this.bucketName}/${filePath}`;
      console.log('Generated public B2 URL for:', filePath);
      return url;
    } catch (error) {
      console.error('Error generating public URL:', error);
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