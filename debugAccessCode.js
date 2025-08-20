const Database = require('better-sqlite3');
const path = require('path');

function debugAccessCode(accessCode) {
  console.log('🔍 Debugging Access Code:', accessCode);
  console.log('==========================================\n');
  
  try {
    // Open the SQLite database
    const dbPath = path.join(__dirname, '.tmp', 'data.db');
    const db = new Database(dbPath);
    
    // Query 1: Find the order directly
    console.log('📋 STEP 1: Searching for order with access code...');
    const order = db.prepare(`
      SELECT 
        id,
        access_code,
        digital_download_count,
        dvd_count,
        media_type,
        media_status,
        status,
        total_amount,
        created_at,
        updated_at
      FROM orders 
      WHERE access_code = ?
    `).get(accessCode);
    
    if (!order) {
      console.log('❌ NO ORDER FOUND with this access code');
      console.log('\n💡 Possible issues:');
      console.log('  - Access code was never generated');
      console.log('  - Typo in the access code');
      console.log('  - Order was deleted');
      
      // Show similar access codes
      console.log('\n📋 Similar access codes in database:');
      const similarCodes = db.prepare(`
        SELECT access_code 
        FROM orders 
        WHERE access_code LIKE ? 
        LIMIT 5
      `).all(`%${accessCode.slice(-4)}%`);
      
      similarCodes.forEach(code => {
        console.log(`  - ${code.access_code}`);
      });
      
      db.close();
      return;
    }
    
    console.log('✅ Order found! ID:', order.id);
    console.log('\n📊 Order Details:');
    console.log('  - Access Code:', order.access_code);
    console.log('  - Digital Downloads:', order.digital_download_count || 0);
    console.log('  - DVD Count:', order.dvd_count || 0);
    console.log('  - Media Type:', order.media_type || 'none');
    console.log('  - Media Status:', order.media_status || 'none');
    console.log('  - Order Status:', order.status);
    console.log('  - Total Amount:', order.total_amount);
    console.log('  - Created:', order.created_at);
    console.log('  - Updated:', order.updated_at);
    
    // Query 2: Check validation requirements
    console.log('\n🔐 STEP 2: Checking validation requirements...');
    
    const issues = [];
    
    // Check if it's a digital order
    const isDigitalOrder = 
      (order.digital_download_count && order.digital_download_count > 0) ||
      order.media_type === 'digital' ||
      order.media_type === 'both';
    
    if (!isDigitalOrder) {
      issues.push('❌ NOT A DIGITAL ORDER - No digital downloads or wrong media_type');
      console.log('  - digital_download_count:', order.digital_download_count || 0);
      console.log('  - media_type:', order.media_type || 'none');
    } else {
      console.log('  ✅ Is a digital order');
    }
    
    // Check if fulfilled
    if (order.media_status !== 'fulfilled') {
      issues.push(`❌ MEDIA NOT FULFILLED - Current status: ${order.media_status || 'none'}`);
      console.log('  - media_status should be "fulfilled" but is:', order.media_status || 'none');
    } else {
      console.log('  ✅ Media status is fulfilled');
    }
    
    // Query 3: Find associated user
    console.log('\n👤 STEP 3: Finding associated user...');
    const userLink = db.prepare(`
      SELECT user_id 
      FROM orders_users_permissions_user_links 
      WHERE order_id = ?
    `).get(order.id);
    
    if (userLink) {
      const user = db.prepare(`
        SELECT id, email, username 
        FROM up_users 
        WHERE id = ?
      `).get(userLink.user_id);
      
      if (user) {
        console.log('  ✅ User found:', user.email || user.username);
      } else {
        console.log('  ⚠️ User ID found but user record missing');
      }
    } else {
      console.log('  ⚠️ No user linked to this order');
    }
    
    // Query 4: Check for tickets
    console.log('\n🎫 STEP 4: Checking for associated tickets...');
    const ticketCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE order_id = ?
    `).get(order.id);
    
    console.log('  - Tickets found:', ticketCount.count);
    
    // Query 5: Check access logs
    console.log('\n📝 STEP 5: Checking access history...');
    const accessLogs = db.prepare(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE order_id = ?
    `).all(order.id);
    
    if (accessLogs && accessLogs[0]) {
      console.log('  - Previous accesses:', accessLogs[0].count);
    } else {
      console.log('  - No previous access attempts logged');
    }
    
    // Summary
    console.log('\n==========================================');
    console.log('📋 VALIDATION SUMMARY:');
    console.log('==========================================');
    
    if (issues.length === 0) {
      console.log('✅ This access code SHOULD WORK!');
      console.log('\n💡 If it\'s still failing, check:');
      console.log('  1. API endpoint is correctly configured');
      console.log('  2. No typos in the access code when entering');
      console.log('  3. Database connection in production');
      console.log('  4. Server logs for any errors');
    } else {
      console.log('❌ VALIDATION WILL FAIL because:');
      issues.forEach(issue => console.log('  ' + issue));
      
      console.log('\n🔧 TO FIX:');
      if (order.media_status !== 'fulfilled') {
        console.log('  - Update media_status to "fulfilled":');
        console.log(`    UPDATE orders SET media_status = 'fulfilled' WHERE id = ${order.id};`);
      }
      if (!isDigitalOrder) {
        console.log('  - Update order to include digital downloads:');
        console.log(`    UPDATE orders SET digital_download_count = 1, media_type = 'digital' WHERE id = ${order.id};`);
      }
    }
    
    // Show test commands
    console.log('\n🧪 TEST COMMANDS:');
    console.log('Local test:');
    console.log(`curl -X POST http://localhost:1337/api/orders/validate-access-code \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accessCode":"${accessCode}"}'`);
    
    console.log('\nProduction test (replace YOUR_DOMAIN):');
    console.log(`curl -X POST https://YOUR_DOMAIN/api/orders/validate-access-code \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accessCode":"${accessCode}"}'`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('  - You\'re running this from the backend directory');
    console.log('  - The database exists at .tmp/data.db');
    console.log('  - You have the necessary permissions');
  }
}

// Get access code from command line
const accessCode = process.argv[2];

if (!accessCode) {
  console.log('Usage: node debugAccessCode.js <ACCESS_CODE>');
  console.log('Example: node debugAccessCode.js DVL-2025-AB1234');
  process.exit(1);
}

debugAccessCode(accessCode);