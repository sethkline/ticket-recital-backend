const strapi = require('@strapi/strapi');

async function createQuickTestOrder() {
  console.log('🚀 Starting Strapi...');
  
  const app = await strapi().load();
  
  try {
    // Generate a unique access code
    const generateAccessCode = () => {
      const year = new Date().getFullYear();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const numberPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `DVL-${year}-${randomPart}${numberPart}`;
    };
    
    // Find any existing user (preferably admin)
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      limit: 1
    });
    
    let userId;
    if (users.length > 0) {
      userId = users[0].id;
      console.log(`👤 Using existing user: ${users[0].email || users[0].username}`);
    } else {
      // Create a test user if no users exist
      const testUser = await strapi.entityService.create('plugin::users-permissions.user', {
        data: {
          email: 'admin@reverencestudios.com',
          username: 'admin',
          firstname: 'Admin',
          lastname: 'User',
          password: 'admin123',
          confirmed: true,
          role: 1
        }
      });
      userId = testUser.id;
      console.log('👤 Created new admin user: admin@reverencestudios.com');
    }
    
    // Create test order
    const accessCode = generateAccessCode();
    
    const order = await strapi.entityService.create('api::order.order', {
      data: {
        users_permissions_user: userId,
        total_amount: 20,
        status: 'completed',
        stripe_payment_id: `test_digital_${Date.now()}`,
        dvd_count: 0,
        digital_download_count: 1,
        media_type: 'digital',
        media_status: 'fulfilled',
        access_code: accessCode,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('\n🎉 SUCCESS! Test order created!');
    console.log('==========================================');
    console.log(`🔑 ACCESS CODE: ${accessCode}`);
    console.log('==========================================');
    console.log('\n📋 Order Details:');
    console.log(`- Order ID: ${order.id}`);
    console.log(`- Media Type: ${order.media_type}`);
    console.log(`- Status: ${order.media_status}`);
    console.log(`- Amount: $${order.total_amount}`);
    
    console.log('\n🧪 Test Instructions:');
    console.log('1. Start your backend: npm run develop');
    console.log('2. Start your frontend: npm run dev');
    console.log('3. Go to: http://localhost:3000/watch-recital-updated');
    console.log(`4. Enter access code: ${accessCode}`);
    
    console.log('\n🔗 Or test API directly:');
    console.log(`curl -X POST http://localhost:1337/api/orders/validate-access-code \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accessCode":"${accessCode}"}'`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.destroy();
    console.log('\n👋 Done!');
  }
}

createQuickTestOrder().catch(console.error);