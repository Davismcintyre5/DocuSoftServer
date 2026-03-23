const axios = require('axios');

class GitHubService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.repo = process.env.GITHUB_REPO;
    
    if (!this.token) {
      console.error('❌ GITHUB_TOKEN is not set in environment variables');
    }
    if (!this.repo) {
      console.error('❌ GITHUB_REPO is not set in environment variables');
    }
    
    this.baseUrl = `https://api.github.com/repos/${this.repo}`;
    console.log(`🔧 GitHub Service initialized for repo: ${this.repo}`);
  }

  async uploadFile(fileBuffer, filename) {
    try {
      // Clean filename - remove special characters
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const timestamp = Date.now();
      const tagName = `upload-${timestamp}`;
      
      console.log(`📦 Creating GitHub release: ${tagName}`);
      
      // Create release
      const releaseResponse = await axios.post(
        `${this.baseUrl}/releases`,
        {
          tag_name: tagName,
          name: cleanFilename,
          body: `Uploaded from DocuSoft on ${new Date().toLocaleString()}`,
          draft: false,
          prerelease: false
        },
        {
          headers: {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'DocuSoft-App'
          }
        }
      );
      
      console.log(`✅ Release created: ${releaseResponse.data.html_url}`);
      
      // Upload file to release
      const uploadUrl = releaseResponse.data.upload_url.replace(
        '{?name,label}',
        `?name=${encodeURIComponent(cleanFilename)}`
      );
      
      console.log(`📤 Uploading file to release...`);
      
      await axios.post(uploadUrl, fileBuffer, {
        headers: {
          Authorization: `token ${this.token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileBuffer.length,
          'User-Agent': 'DocuSoft-App'
        }
      });
      
      // Build download URL
      const downloadUrl = `https://github.com/${this.repo}/releases/download/${tagName}/${encodeURIComponent(cleanFilename)}`;
      console.log(`✅ Upload complete! Download URL: ${downloadUrl}`);
      
      return downloadUrl;
    } catch (error) {
      console.error('❌ GitHub upload error:');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.error(`   Message: ${error.message}`);
      }
      throw new Error(`GitHub upload failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new GitHubService();