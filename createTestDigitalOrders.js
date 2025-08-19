const strapi = require('@strapi/strapi');

async function createTestDigitalOrders() {
  console.log('🚀 Starting Strapi to create test digital orders...');
  
  // Start Strapi
  const app = await strapi().load();
  
  try {
    console.log('📋 Creating test digital orders...');
    
    // Find or create a test user (you can replace this with your admin user ID)
    let testUser = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: 'test@reverencestudios.com' }
    });
    
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = await strapi.entityService.create('plugin::users-permissions.user', {
        data: {
          email: 'test@reverencestudios.com',
          username: 'testuser',
          firstname: 'Test',
          lastname: 'User',
          password: 'testpassword123',
          confirmed: true,
          role: 1 // Authenticated role
        }
      });
      console.log('✅ Test user created with email: test@reverencestudios.com');
    } else {
      console.log('👤 Using existing test user: test@reverencestudios.com');
    }
    
    // Create test orders with different digital download scenarios
    const testOrders = [
      {
        name: 'Digital Only Order',
        data: {
          users_permissions_user: testUser.id,
          total_amount: 20,
          status: 'completed',
          stripe_payment_id: 'test_digital_only_' + Date.now(),
          dvd_count: 0,
          digital_download_count: 1,
          media_type: 'digital',
          media_status: 'fulfilled',
          access_code: 'DVL-2025-TEST001',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'DVD + Digital Bundle',
        data: {
          users_permissions_user: testUser.id,
          total_amount: 45, // DVD + Digital with bundle discount
          status: 'completed',
          stripe_payment_id: 'test_bundle_' + Date.now(),
          dvd_count: 1,
          digital_download_count: 1,
          media_type: 'both',
          media_status: 'fulfilled',
          access_code: 'DVL-2025-TEST002',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      {
        name: 'Multiple Digital Downloads',
        data: {
          users_permissions_user: testUser.id,
          total_amount: 40,
          status: 'completed',
          stripe_payment_id: 'test_multiple_' + Date.now(),
          dvd_count: 0,
          digital_download_count: 2,
          media_type: 'digital',
          media_status: 'fulfilled',
          access_code: 'DVL-2025-TEST003',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ];
    
    console.log('📦 Creating test orders...');
    const createdOrders = [];
    
    for (const orderInfo of testOrders) {
      try {
        // Check if order with this access code already exists
        const existingOrder = await strapi.query('api::order.order').findOne({
          where: { access_code: orderInfo.data.access_code }
        });
        
        if (existingOrder) {
          console.log(`⚠️  Order with access code ${orderInfo.data.access_code} already exists, skipping...`);
          createdOrders.push(existingOrder);
          continue;
        }
        
        const order = await strapi.entityService.create('api::order.order', {
          data: orderInfo.data
        });
        
        createdOrders.push(order);
        console.log(`✅ Created ${orderInfo.name} with access code: ${orderInfo.data.access_code}`);
        
      } catch (error) {
        console.error(`❌ Error creating ${orderInfo.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Test orders creation complete!');
    console.log('\n📋 Summary:');
    console.log('==========================================');
    console.log(`Test User Email: ${testUser.email}`);
    console.log('Test Access Codes:');
    
    createdOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.access_code} (${order.media_type} - ${order.media_status})`);
    });
    
    console.log('\n🧪 How to test:');
    console.log('1. Start your backend: npm run develop');
    console.log('2. Start your frontend: npm run dev');
    console.log('3. Go to http://localhost:3000/watch-recital-updated');
    console.log('4. Try any of the access codes above');
    console.log('\n💡 You can also test the API directly:');
    console.log('curl -X POST http://localhost:1337/api/orders/validate-access-code \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"accessCode":"DVL-2025-TEST001"}\'');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Destroy Strapi instance
    await app.destroy();
    console.log('\n👋 Strapi stopped');
  }
}

// Run the script
createTestDigitalOrders().catch(console.error);