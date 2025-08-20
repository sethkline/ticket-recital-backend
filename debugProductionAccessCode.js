// Production-safe access code debugger
// This works with any database type (PostgreSQL, MySQL, SQLite)

async function debugAccessCode(accessCode) {
  console.log('🔍 Production Access Code Debug');
  console.log('==========================================');
  console.log('Testing access code:', accessCode);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database:', process.env.DATABASE_CLIENT || 'unknown');
  console.log('');
  
  try {
    const strapi = require('./src/index.js');
    
    // Initialize Strapi if not already running
    if (!global.strapi) {
      console.log('⚠️  Strapi not running. This script should be run on a server where Strapi is already initialized.');
      console.log('   Alternative: Use this as an API endpoint or run it as a separate script.');
      return;
    }
    
    console.log('📋 STEP 1: Searching for order with access code...');
    
    // Find ANY order with this access code (no filters)
    const anyOrder = await strapi.entityService.findMany('api::order.order', {
      filters: { access_code: accessCode },
      populate: ['users_permissions_user'],
    });
    
    if (!anyOrder || anyOrder.length === 0) {
      console.log('❌ NO ORDER FOUND with access code:', accessCode);
      
      // Look for similar access codes
      console.log('\n🔍 Searching for similar access codes...');
      const allOrders = await strapi.entityService.findMany('api::order.order', {
        filters: { 
          access_code: { $notNull: true },
        },
        fields: ['id', 'access_code', 'created_at'],
        sort: { created_at: 'desc' },
        limit: 10,
      });
      
      console.log('Recent access codes in database:');
      allOrders.forEach(order => {
        console.log(`  - ${order.access_code} (Order #${order.id})`);
      });
      
      console.log('\n💡 Possible solutions:');
      console.log('  1. Check for typos in the access code');
      console.log('  2. Generate access codes for orders missing them');
      console.log('  3. Verify the order was created in production');
      
      return;
    }
    
    const order = anyOrder[0];
    console.log('✅ Order found! ID:', order.id);
    
    console.log('\n📊 Order Details:');
    console.log('  - Access Code:', order.access_code);
    console.log('  - Digital Downloads:', order.digital_download_count || 0);
    console.log('  - DVD Count:', order.dvd_count || 0);
    console.log('  - Media Type:', order.media_type || 'none');
    console.log('  - Media Status:', order.media_status || 'none');
    console.log('  - Order Status:', order.status);
    console.log('  - Total Amount:', order.total_amount);
    console.log('  - Created:', order.createdAt);
    console.log('  - User:', order.users_permissions_user?.email || 'No user linked');
    
    console.log('\n🔐 STEP 2: Checking validation requirements...');
    
    const issues = [];
    
    // Check if it's a digital order
    const isDigitalOrder = 
      (order.digital_download_count && order.digital_download_count > 0) ||
      order.media_type === 'digital' ||
      order.media_type === 'both';
    
    if (!isDigitalOrder) {
      issues.push('❌ NOT A DIGITAL ORDER');
      console.log('  - digital_download_count:', order.digital_download_count || 0);
      console.log('  - media_type:', order.media_type || 'none');
      console.log('  - Expected: digital_download_count > 0 OR media_type = "digital" OR media_type = "both"');
    } else {
      console.log('  ✅ Is a digital order');
    }
    
    // Check if fulfilled
    if (order.media_status !== 'fulfilled') {
      issues.push('❌ MEDIA NOT FULFILLED');
      console.log('  - Current media_status:', order.media_status || 'none');
      console.log('  - Expected: "fulfilled"');
    } else {
      console.log('  ✅ Media status is fulfilled');
    }
    
    console.log('\n🎫 STEP 3: Checking associated tickets...');
    const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
      filters: { order: order.id },
      populate: ['event'],
    });
    
    console.log('  - Tickets found:', tickets.length);
    if (tickets.length > 0) {
      const events = tickets.map(t => t.event?.title).filter(Boolean);
      console.log('  - Events:', events.join(', '));
    }
    
    console.log('\n📝 STEP 4: Testing validation logic...');
    
    // Simulate the exact validation logic
    try {
      const validationResult = await strapi.entityService.findMany('api::order.order', {
        filters: { 
          access_code: accessCode,
          $or: [
            { digital_download_count: { $gt: 0 } },
            { media_type: 'digital' },
            { media_type: 'both' }
          ]
        },
        populate: ['users_permissions_user'],
      });
      
      if (validationResult && validationResult.length > 0) {
        console.log('  ✅ Order passes validation filters');
        if (validationResult[0].media_status === 'fulfilled') {
          console.log('  ✅ Order should work with the API');
        } else {
          console.log('  ❌ Order fails fulfillment check');
        }
      } else {
        console.log('  ❌ Order fails validation filters');
      }
    } catch (validationError) {
      console.log('  ❌ Error in validation logic:', validationError.message);
    }
    
    // Summary
    console.log('\n==========================================');
    console.log('📋 SUMMARY');
    console.log('==========================================');
    
    if (issues.length === 0) {
      console.log('✅ This access code SHOULD WORK!');
      console.log('\nIf it\'s still failing:');
      console.log('  1. Check API endpoint configuration');
      console.log('  2. Verify network connectivity');
      console.log('  3. Check for any middleware blocking requests');
      console.log('  4. Review server logs for detailed errors');
    } else {
      console.log('❌ This access code will NOT work because:');
      issues.forEach(issue => console.log('  ' + issue));
      
      console.log('\n🔧 TO FIX (run these in production):');
      if (order.media_status !== 'fulfilled') {
        console.log(`\n# Mark order as fulfilled:`);
        console.log(`await strapi.entityService.update('api::order.order', ${order.id}, {`);
        console.log(`  data: { media_status: 'fulfilled' }`);
        console.log(`});`);
      }
      if (!isDigitalOrder) {
        console.log(`\n# Configure as digital order:`);
        console.log(`await strapi.entityService.update('api::order.order', ${order.id}, {`);
        console.log(`  data: { `);
        console.log(`    digital_download_count: 1,`);
        console.log(`    media_type: 'digital'`);
        console.log(`  }`);
        console.log(`});`);
      }
    }
    
    console.log('\n🧪 TEST COMMAND:');
    console.log(`curl -X POST ${process.env.FRONTEND_URL || 'https://your-api.com'}/api/orders/validate-access-code \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accessCode":"${accessCode}"}'`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 This script should be run on the production server with Strapi initialized.');
    console.log('   Alternatively, you can adapt this code to run as an admin API endpoint.');
  }
}

// Export for use as a function or run directly
if (require.main === module) {
  const accessCode = process.argv[2];
  
  if (!accessCode) {
    console.log('Usage: node debugProductionAccessCode.js <ACCESS_CODE>');
    console.log('Example: node debugProductionAccessCode.js DVL-2025-0034');
    console.log('');
    console.log('Note: This script should be run on the production server where Strapi is running.');
    process.exit(1);
  }
  
  debugAccessCode(accessCode);
} else {
  module.exports = debugAccessCode;
}