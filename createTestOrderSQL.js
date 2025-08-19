const Database = require('better-sqlite3');
const path = require('path');

function createTestOrder() {
  console.log('🚀 Creating test digital download order...');
  
  try {
    // Open the SQLite database
    const dbPath = path.join(__dirname, '.tmp', 'data.db');
    const db = new Database(dbPath);
    
    // Generate access code
    const generateAccessCode = () => {
      const year = new Date().getFullYear();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numberPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `DVL-${year}-${randomPart}${numberPart}`;
    };
    
    const accessCode = generateAccessCode();
    const now = new Date().toISOString();
    
    // Find first user
    const user = db.prepare('SELECT id, email, username FROM up_users LIMIT 1').get();
    
    if (!user) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }
    
    console.log(`👤 Using user: ${user.email || user.username} (ID: ${user.id})`);
    
    // Insert test order
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        total_amount, 
        status, 
        stripe_payment_id, 
        dvd_count, 
        digital_download_count, 
        media_type, 
        media_status, 
        access_code, 
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertOrder.run(
      20,                // total_amount
      'completed',       // status
      `test_digital_${Date.now()}`, // stripe_payment_id
      0,                 // dvd_count
      1,                 // digital_download_count
      'digital',         // media_type
      'fulfilled',       // media_status
      accessCode,        // access_code
      now,               // created_at
      now                // updated_at
    );
    
    // Insert user relationship
    const insertUserLink = db.prepare(`
      INSERT INTO orders_users_permissions_user_links (
        order_id, 
        user_id
      ) VALUES (?, ?)
    `);
    
    insertUserLink.run(result.lastInsertRowid, user.id);
    
    console.log('\n🎉 SUCCESS! Test order created!');
    console.log('==========================================');
    console.log(`🔑 ACCESS CODE: ${accessCode}`);
    console.log('==========================================');
    console.log('\n📋 Order Details:');
    console.log(`- Order ID: ${result.lastInsertRowid}`);
    console.log(`- User: ${user.email || user.username}`);
    console.log(`- Media Type: digital`);
    console.log(`- Status: fulfilled`);
    console.log(`- Amount: $20`);
    
    console.log('\n🧪 Test Instructions:');
    console.log('1. Start your backend: npm run develop');
    console.log('2. Start your frontend: npm run dev');
    console.log('3. Go to: http://localhost:3000/watch-recital-updated');
    console.log(`4. Enter access code: ${accessCode}`);
    
    console.log('\n🔗 Or test API directly:');
    console.log(`curl -X POST http://localhost:1337/api/orders/validate-access-code \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accessCode":"${accessCode}"}'`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure your Strapi backend has been run at least once to create the database.');
  }
}

createTestOrder();