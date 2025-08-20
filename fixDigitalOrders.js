const Database = require('better-sqlite3');
const path = require('path');

function fixDigitalOrders(dryRun = true) {
  console.log('🔧 Digital Orders Fix Tool');
  console.log('==========================================');
  console.log('Mode:', dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (will modify database)');
  console.log('');
  
  try {
    // Open the SQLite database
    const dbPath = path.join(__dirname, '.tmp', 'data.db');
    const db = new Database(dbPath);
    
    // Find all orders that should be digital but might have issues
    console.log('📋 Finding problematic digital orders...\n');
    
    // Query 1: Orders with access codes but wrong media_status
    const ordersNeedingFulfillment = db.prepare(`
      SELECT 
        id,
        access_code,
        digital_download_count,
        media_type,
        media_status,
        created_at
      FROM orders 
      WHERE 
        access_code IS NOT NULL 
        AND access_code != ''
        AND (
          media_status != 'fulfilled' 
          OR media_status IS NULL
        )
        AND (
          digital_download_count > 0 
          OR media_type IN ('digital', 'both')
        )
    `).all();
    
    if (ordersNeedingFulfillment.length > 0) {
      console.log(`❌ Found ${ordersNeedingFulfillment.length} orders that need media_status = 'fulfilled':`);
      ordersNeedingFulfillment.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.access_code} (status: ${order.media_status || 'null'})`);
      });
      
      if (!dryRun) {
        const updateStmt = db.prepare(`UPDATE orders SET media_status = 'fulfilled', updated_at = ? WHERE id = ?`);
        ordersNeedingFulfillment.forEach(order => {
          updateStmt.run(new Date().toISOString(), order.id);
        });
        console.log(`  ✅ Updated ${ordersNeedingFulfillment.length} orders to fulfilled status`);
      } else {
        console.log(`  ℹ️ Would update ${ordersNeedingFulfillment.length} orders (dry run)`);
      }
    } else {
      console.log('✅ No orders need fulfillment status fix');
    }
    
    console.log('');
    
    // Query 2: Orders with access codes but missing digital_download_count
    const ordersNeedingDigitalCount = db.prepare(`
      SELECT 
        id,
        access_code,
        digital_download_count,
        media_type,
        media_status
      FROM orders 
      WHERE 
        access_code IS NOT NULL 
        AND access_code != ''
        AND (
          digital_download_count = 0 
          OR digital_download_count IS NULL
        )
        AND media_type NOT IN ('digital', 'both')
    `).all();
    
    if (ordersNeedingDigitalCount.length > 0) {
      console.log(`⚠️ Found ${ordersNeedingDigitalCount.length} orders with access codes but no digital configuration:`);
      ordersNeedingDigitalCount.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.access_code} (count: ${order.digital_download_count}, type: ${order.media_type})`);
      });
      
      if (!dryRun) {
        const updateStmt = db.prepare(`
          UPDATE orders 
          SET 
            digital_download_count = 1, 
            media_type = CASE 
              WHEN dvd_count > 0 THEN 'both' 
              ELSE 'digital' 
            END,
            updated_at = ?
          WHERE id = ?
        `);
        ordersNeedingDigitalCount.forEach(order => {
          updateStmt.run(new Date().toISOString(), order.id);
        });
        console.log(`  ✅ Updated ${ordersNeedingDigitalCount.length} orders with digital configuration`);
      } else {
        console.log(`  ℹ️ Would update ${ordersNeedingDigitalCount.length} orders (dry run)`);
      }
    } else {
      console.log('✅ No orders need digital count fix');
    }
    
    console.log('');
    
    // Query 3: Find fulfilled digital orders without access codes (for reporting)
    const ordersWithoutCodes = db.prepare(`
      SELECT 
        id,
        digital_download_count,
        media_type,
        media_status,
        created_at
      FROM orders 
      WHERE 
        (access_code IS NULL OR access_code = '')
        AND media_status = 'fulfilled'
        AND (
          digital_download_count > 0 
          OR media_type IN ('digital', 'both')
        )
    `).all();
    
    if (ordersWithoutCodes.length > 0) {
      console.log(`📝 Found ${ordersWithoutCodes.length} fulfilled digital orders WITHOUT access codes:`);
      console.log('  These may need access codes generated');
      ordersWithoutCodes.forEach(order => {
        console.log(`  - Order ${order.id} (created: ${order.created_at})`);
      });
      console.log('\n  💡 Run the admin endpoint to generate access codes for these orders');
    }
    
    // Summary
    console.log('\n==========================================');
    console.log('📊 SUMMARY');
    console.log('==========================================');
    
    const totalDigitalOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE 
        digital_download_count > 0 
        OR media_type IN ('digital', 'both')
    `).get();
    
    const validOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE 
        access_code IS NOT NULL 
        AND access_code != ''
        AND media_status = 'fulfilled'
        AND (
          digital_download_count > 0 
          OR media_type IN ('digital', 'both')
        )
    `).get();
    
    console.log(`Total digital orders: ${totalDigitalOrders.count}`);
    console.log(`Valid (working) orders: ${validOrders.count}`);
    console.log(`Orders needing fixes: ${ordersNeedingFulfillment.length + ordersNeedingDigitalCount.length}`);
    console.log(`Orders missing codes: ${ordersWithoutCodes.length}`);
    
    if (!dryRun) {
      console.log('\n✅ Database has been updated!');
    } else {
      console.log('\n📌 This was a DRY RUN - no changes were made');
      console.log('To apply fixes, run: node fixDigitalOrders.js --execute');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('  - You\'re running this from the backend directory');
    console.log('  - The database exists at .tmp/data.db');
    console.log('  - You have write permissions (for execute mode)');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const shouldExecute = args.includes('--execute');

if (args.includes('--help')) {
  console.log('Usage: node fixDigitalOrders.js [--execute]');
  console.log('');
  console.log('Options:');
  console.log('  --execute   Actually modify the database (default is dry run)');
  console.log('  --help      Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node fixDigitalOrders.js           # Dry run - show what would be fixed');
  console.log('  node fixDigitalOrders.js --execute # Apply fixes to database');
  process.exit(0);
}

fixDigitalOrders(!shouldExecute);