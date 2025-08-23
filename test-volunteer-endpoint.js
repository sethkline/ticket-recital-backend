const axios = require('axios');

async function testVolunteerEndpoint() {
  const testData = {
    emails: [
      'volunteer1@example.com',
      'volunteer2@example.com'
    ],
    emailSubject: 'Thank You for Volunteering - Your Recital Access',
    emailMessage: `
      <h2>Thank You for Volunteering!</h2>
      <p>We greatly appreciate your help with the Reverence Studios Recital. As a thank you, we're providing you with complimentary access to the digital recording of the recital.</p>
      
      <h3>How to Access Your Digital Download:</h3>
      <ol>
        <li>Visit our viewing page</li>
        <li>Enter your access code below</li>
        <li>Choose from Full HD, Standard quality, or individual dance videos</li>
        <li>Download or stream as many times as you'd like</li>
      </ol>
      
      <p><strong>Download Options Available:</strong></p>
      <ul>
        <li>Full Recital - High Quality (1080p)</li>
        <li>Full Recital - Standard Quality (720p)</li>
        <li>Individual Dance Videos</li>
      </ul>
      
      <p><strong>Technical Tips:</strong></p>
      <ul>
        <li>Links are valid for 24 hours after generation</li>
        <li>You can generate new download links anytime with your access code</li>
        <li>For best results, right-click and "Save As" to download large files</li>
      </ul>
      
      <p>If you have any issues accessing your download, please contact us at support@reverencestudios.com</p>
      <p>Thank you again for your wonderful contribution to our recital!</p>
    `
  };

  try {
    // Note: This test assumes you have a way to get an admin JWT token
    // In a real scenario, you'd need to authenticate first
    console.log('Testing volunteer access endpoint...');
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // For now, just log what would be sent - uncomment below to actually test
    /*
    const response = await axios.post('http://localhost:1337/api/orders/create-volunteer-access', testData, {
      headers: {
        'Authorization': `Bearer YOUR_ADMIN_JWT_TOKEN_HERE`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response:', response.data);
    */
    
    console.log('Test configuration complete. To actually test:');
    console.log('1. Get admin JWT token by logging into Strapi admin');
    console.log('2. Replace YOUR_ADMIN_JWT_TOKEN_HERE with actual token');
    console.log('3. Uncomment the axios request code above');
    console.log('4. Run: node test-volunteer-endpoint.js');
    
  } catch (error) {
    console.error('Error testing endpoint:', error.response?.data || error.message);
  }
}

testVolunteerEndpoint();