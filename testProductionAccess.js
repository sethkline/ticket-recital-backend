#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration - Update these for your production environment
const CONFIG = {
  // Production API URL (update this to your actual production URL)
  PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://api.recital.reverence.dance',
  
  // Local API URL for comparison
  LOCAL_URL: 'http://localhost:1337',
};

function testAccessCode(accessCode, apiUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/api/orders/validate-access-code`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify({ accessCode });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`\n🔍 Testing ${apiUrl}...`);
    console.log(`   Endpoint: ${url.href}`);
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        
        try {
          const response = JSON.parse(data);
          console.log(`   Response:`, JSON.stringify(response, null, 2));
          resolve({ statusCode: res.statusCode, data: response });
        } catch (e) {
          console.log(`   Raw Response:`, data);
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Error:`, error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testVideoUrls(accessCode, apiUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/api/orders/video-urls`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify({ accessCode, videoType: 'full' });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`\n📹 Testing video URL generation at ${apiUrl}...`);
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status Code: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`   ✅ Video URLs generated successfully`);
            console.log(`   Expires at:`, response.expiresAt);
          } else {
            console.log(`   Response:`, JSON.stringify(response, null, 2));
          }
          resolve({ statusCode: res.statusCode, data: response });
        } catch (e) {
          console.log(`   Raw Response:`, data.substring(0, 200));
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Error:`, error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  const accessCode = process.argv[2];
  const testProduction = process.argv[3] !== '--local-only';
  
  if (!accessCode) {
    console.log('Usage: node testProductionAccess.js <ACCESS_CODE> [--local-only]');
    console.log('');
    console.log('Examples:');
    console.log('  node testProductionAccess.js DVL-2025-AB1234');
    console.log('  node testProductionAccess.js DVL-2025-AB1234 --local-only');
    console.log('');
    console.log('Environment Variables:');
    console.log('  PRODUCTION_URL - Set your production API URL (default: https://api.recital.reverence.dance)');
    process.exit(1);
  }
  
  console.log('🎭 Access Code Test Tool');
  console.log('==========================================');
  console.log('Testing access code:', accessCode);
  
  // Test local first if available
  try {
    console.log('\n📍 LOCAL TEST');
    console.log('==========================================');
    const localResult = await testAccessCode(accessCode, CONFIG.LOCAL_URL);
    
    if (localResult.statusCode === 200) {
      console.log('✅ Local validation successful!');
      
      // Try video URLs too
      await testVideoUrls(accessCode, CONFIG.LOCAL_URL);
    } else {
      console.log('❌ Local validation failed');
    }
  } catch (error) {
    console.log('⚠️  Could not connect to local server (this is normal if not running locally)');
  }
  
  // Test production
  if (testProduction) {
    try {
      console.log('\n🌐 PRODUCTION TEST');
      console.log('==========================================');
      const prodResult = await testAccessCode(accessCode, CONFIG.PRODUCTION_URL);
      
      if (prodResult.statusCode === 200) {
        console.log('✅ Production validation successful!');
        
        // Try video URLs too
        await testVideoUrls(accessCode, CONFIG.PRODUCTION_URL);
      } else {
        console.log('❌ Production validation failed');
        
        console.log('\n💡 Troubleshooting Tips:');
        console.log('1. Check if the access code exists in production database');
        console.log('2. Verify media_status is "fulfilled" in production');
        console.log('3. Check if digital_download_count > 0 or media_type includes digital');
        console.log('4. Review server logs for detailed error messages');
        console.log('5. Use the debugAccessCode.js script on production server');
      }
    } catch (error) {
      console.log('❌ Could not connect to production server');
      console.log('   Error:', error.message);
      console.log('\n💡 Check:');
      console.log('   - Is the production URL correct?', CONFIG.PRODUCTION_URL);
      console.log('   - Is the API accessible from your location?');
      console.log('   - Are there any firewall or network issues?');
    }
  }
  
  console.log('\n==========================================');
  console.log('📊 Test Complete');
  console.log('==========================================');
  
  if (!testProduction) {
    console.log('\nNote: Production test skipped (--local-only flag used)');
    console.log('To test production, run without --local-only flag');
  }
}

main().catch(console.error);