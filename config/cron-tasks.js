module.exports = {
  // Run every day at 2 AM
  '0 2 * * *': async ({ strapi }) => {
    console.log('🧹 Running daily cleanup of expired payment links...');
    
    try {
      const cleanedCount = await strapi.service('api::payment-link.payment-link').cleanupExpiredLinks();
      console.log(`✅ Cleaned up ${cleanedCount} expired payment links`);
    } catch (error) {
      console.error('❌ Failed to cleanup expired payment links:', error);
      
      // Send alert email in production
      if (process.env.NODE_ENV === 'production') {
        try {
          await strapi.plugins['email'].services.email.send({
            to: process.env.MAIL_FROM_ADDRESS,
            from: 'alert@reverencestudios.com',
            subject: 'Alert: Payment Link Cleanup Failed',
            text: `The daily payment link cleanup cron job failed with error: ${error.message}`
          });
        } catch (emailError) {
          console.error('Failed to send alert email:', emailError);
        }
      }
    }
  },

  // Run every hour to check for recently expired links
  '0 * * * *': async ({ strapi }) => {
    try {
      const recentlyExpired = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: {
          status: 'pending',
          expires_at: { 
            $lt: new Date(),
            $gt: new Date(Date.now() - 3600000) // Last hour
          }
        }
      });

      for (const link of recentlyExpired) {
        await strapi.entityService.update('api::payment-link.payment-link', link.id, {
          data: { status: 'expired' }
        });

        if (link.stripe_payment_intent_id) {
          try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            await stripe.paymentIntents.cancel(link.stripe_payment_intent_id);
          } catch (stripeError) {
            console.error(`Error canceling payment intent ${link.stripe_payment_intent_id}:`, stripeError);
          }
        }
      }

      if (recentlyExpired.length > 0) {
        console.log(`⏰ Marked ${recentlyExpired.length} recently expired payment links`);
      }
    } catch (error) {
      console.error('Error in hourly payment link check:', error);
    }
  },

  // Weekly cleanup of old access logs (keep last 90 days)
  '0 3 * * 0': async ({ strapi }) => {
    console.log('🗂️ Running weekly cleanup of old access logs...');
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const oldLogs = await strapi.entityService.findMany('api::payment-link-access-log.payment-link-access-log', {
        filters: {
          accessed_at: { $lt: cutoffDate }
        }
      });

      for (const log of oldLogs) {
        await strapi.entityService.delete('api::payment-link-access-log.payment-link-access-log', log.id);
      }

      console.log(`🗑️ Cleaned up ${oldLogs.length} old access log entries`);
    } catch (error) {
      console.error('❌ Failed to cleanup old access logs:', error);
    }
  }
};