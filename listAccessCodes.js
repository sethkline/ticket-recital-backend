const Database = require('better-sqlite3');
const path = require('path');

function listAccessCodes() {
  console.log('📋 Access Codes List');
  console.log('==========================================\n');
  
  try {
    // Open the SQLite database
    const dbPath = path.join(__dirname, '.tmp', 'data.db');
    const db = new Database(dbPath);
    
    // Get all orders with access codes
    const orders = db.prepare(`
      SELECT 
        o.id,
        o.access_code,
        o.digital_download_count,
        o.dvd_count,
        o.media_type,
        o.media_status,
        o.status,
        o.total_amount,
        o.created_at,
        u.email,
        u.username
      FROM orders o
      LEFT JOIN orders_users_permissions_user_links oul ON o.id = oul.order_id
      LEFT JOIN up_users u ON oul.user_id = u.id
      WHERE o.access_code IS NOT NULL AND o.access_code != ''
      ORDER BY o.created_at DESC
    `).all();
    
    if (orders.length === 0) {
      console.log('No orders with access codes found.');
      db.close();
      return;
    }
    
    console.log(`Found ${orders.length} orders with access codes:\n`);
    
    // Group by status
    const fulfilledOrders = orders.filter(o => o.media_status === 'fulfilled');
    const pendingOrders = orders.filter(o => o.media_status !== 'fulfilled');
    
    // Show fulfilled orders
    if (fulfilledOrders.length > 0) {
      console.log('✅ FULFILLED ORDERS (should work):');
      console.log('-----------------------------------');
      fulfilledOrders.forEach(order => {
        const isDigital = order.digital_download_count > 0 || 
                         order.media_type === 'digital' || 
                         order.media_type === 'both';
        const status = isDigital ? '✅' : '⚠️';
        
        console.log(`${status} ${order.access_code}`);
        console.log(`   Order #${order.id} | ${order.email || order.username || 'No user'}`);
        console.log(`   Type: ${order.media_type || 'none'} | Digital: ${order.digital_download_count || 0} | DVD: ${order.dvd_count || 0}`);
        console.log(`   Created: ${new Date(order.created_at).toLocaleDateString()}`);
        if (!isDigital) {
          console.log(`   ⚠️ WARNING: Not configured as digital order`);
        }
        console.log('');
      });
    }
    
    // Show pending orders
    if (pendingOrders.length > 0) {
      console.log('\n❌ NOT FULFILLED (won\'t work yet):');
      console.log('-----------------------------------');
      pendingOrders.forEach(order => {
        console.log(`❌ ${order.access_code}`);
        console.log(`   Order #${order.id} | ${order.email || order.username || 'No user'}`);
        console.log(`   Status: ${order.media_status || 'none'} | Type: ${order.media_type || 'none'}`);
        console.log(`   Created: ${new Date(order.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }
    
    // Summary statistics
    console.log('\n==========================================');
    console.log('📊 SUMMARY');
    console.log('==========================================');
    
    const digitalReady = orders.filter(o => 
      o.media_status === 'fulfilled' && 
      (o.digital_download_count > 0 || o.media_type === 'digital' || o.media_type === 'both')
    ).length;
    
    console.log(`Total access codes: ${orders.length}`);
    console.log(`Ready to use: ${digitalReady}`);
    console.log(`Fulfilled but not digital: ${fulfilledOrders.length - digitalReady}`);
    console.log(`Not fulfilled: ${pendingOrders.length}`);
    
    // Show recent test codes if any
    const recentTestCodes = orders
      .filter(o => o.access_code.includes('TEST') || o.stripe_payment_id?.includes('test'))
      .slice(0, 3);
    
    if (recentTestCodes.length > 0) {
      console.log('\n🧪 TEST CODES (for testing):');
      console.log('-----------------------------------');
      recentTestCodes.forEach(order => {
        const isReady = order.media_status === 'fulfilled' && 
                       (order.digital_download_count > 0 || 
                        order.media_type === 'digital' || 
                        order.media_type === 'both');
        console.log(`${isReady ? '✅' : '❌'} ${order.access_code}`);
      });
    }
    
    console.log('\n💡 Tips:');
    console.log('- Use debugAccessCode.js <CODE> to debug a specific code');
    console.log('- Use fixDigitalOrders.js to fix unfulfilled orders');
    console.log('- Use testProductionAccess.js <CODE> to test API endpoints');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('  - You\'re running this from the backend directory');
    console.log('  - The database exists at .tmp/data.db');
  }
}

listAccessCodes();