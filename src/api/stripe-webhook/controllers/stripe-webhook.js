'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = {
  async handleWebhook(ctx) {
    try {
      const sig = ctx.request.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        console.error('Stripe webhook secret not configured');
        return ctx.badRequest('Webhook not configured');
      }

      let event;

      try {
        const rawBody = ctx.request.body[Symbol.for('unparsedBody')];
        if (!rawBody) {
          console.error('No raw body found for webhook signature verification');
          return ctx.badRequest('Invalid request body');
        }

        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return ctx.badRequest('Webhook signature verification failed');
      }

      console.log('Received Stripe webhook event:', event.type);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
        
        case 'payment_intent.canceled':
          await handlePaymentIntentCanceled(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return ctx.send({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return ctx.internalServerError('Webhook processing failed');
    }
  }
};

async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('Processing successful payment intent:', paymentIntent.id);

    const paymentLinkId = paymentIntent.metadata.payment_link_id;
    const paymentLinkToken = paymentIntent.metadata.payment_link_token;

    if (!paymentLinkId || !paymentLinkToken) {
      console.log('Payment intent missing payment link metadata');
      return;
    }

    const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
      filters: { 
        id: paymentLinkId,
        token: paymentLinkToken,
        stripe_payment_intent_id: paymentIntent.id
      },
      limit: 1
    });

    if (!paymentLinks || paymentLinks.length === 0) {
      console.error(`Payment link not found for payment intent ${paymentIntent.id}`);
      return;
    }

    const paymentLink = paymentLinks[0];

    if (paymentLink.status === 'completed') {
      console.log('Payment link already processed');
      return;
    }

    const accessCode = strapi.service('api::payment-link.payment-link').generateAccessCode();

    const order = await strapi.entityService.create('api::order.order', {
      data: {
        total_amount: paymentLink.amount,
        status: 'fulfilled',
        stripe_payment_id: paymentIntent.id,
        dvd_count: 0,
        digital_download_count: 1,
        media_type: 'digital',
        media_status: 'fulfilled',
        access_code: accessCode
      }
    });

    await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
      data: {
        status: 'completed',
        completed_at: new Date(),
        order: order.id
      }
    });

    await strapi.service('api::payment-link.payment-link').logAccess(
      paymentLink,
      'payment_succeeded',
      { request: { ip: 'webhook', header: { 'user-agent': 'stripe-webhook' } } },
      { 
        order_id: order.id, 
        access_code: accessCode,
        payment_intent_id: paymentIntent.id,
        webhook_event: 'payment_intent.succeeded'
      }
    );

    await strapi.service('api::payment-link.payment-link').sendConfirmationEmail(
      order,
      paymentLink
    );

    console.log(`Successfully processed payment for payment link ${paymentLink.id}, order ${order.id}`);
  } catch (error) {
    console.error('Error handling successful payment intent:', error);

    if (process.env.NODE_ENV === 'production') {
      try {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'alert@reverencestudios.com',
          subject: 'Alert: Payment Link Webhook Processing Failed',
          text: `Failed to process successful payment intent ${paymentIntent.id}. Error: ${error.message}`
        });
      } catch (emailError) {
        console.error('Failed to send alert email:', emailError);
      }
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log('Processing failed payment intent:', paymentIntent.id);

    const paymentLinkId = paymentIntent.metadata.payment_link_id;
    const paymentLinkToken = paymentIntent.metadata.payment_link_token;

    if (!paymentLinkId || !paymentLinkToken) {
      return;
    }

    const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
      filters: { 
        id: paymentLinkId,
        token: paymentLinkToken
      },
      limit: 1
    });

    if (!paymentLinks || paymentLinks.length === 0) {
      return;
    }

    const paymentLink = paymentLinks[0];

    await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
      data: {
        status: 'failed',
        metadata: {
          ...paymentLink.metadata,
          failed_at: new Date().toISOString(),
          failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error'
        }
      }
    });

    await strapi.service('api::payment-link.payment-link').logAccess(
      paymentLink,
      'payment_failed',
      { request: { ip: 'webhook', header: { 'user-agent': 'stripe-webhook' } } },
      { 
        payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error',
        webhook_event: 'payment_intent.payment_failed'
      }
    );

    console.log(`Marked payment link ${paymentLink.id} as failed`);
  } catch (error) {
    console.error('Error handling failed payment intent:', error);
  }
}

async function handlePaymentIntentCanceled(paymentIntent) {
  try {
    console.log('Processing canceled payment intent:', paymentIntent.id);

    const paymentLinkId = paymentIntent.metadata.payment_link_id;
    const paymentLinkToken = paymentIntent.metadata.payment_link_token;

    if (!paymentLinkId || !paymentLinkToken) {
      return;
    }

    const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
      filters: { 
        id: paymentLinkId,
        token: paymentLinkToken
      },
      limit: 1
    });

    if (!paymentLinks || paymentLinks.length === 0) {
      return;
    }

    const paymentLink = paymentLinks[0];

    await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
      data: {
        status: 'expired',
        metadata: {
          ...paymentLink.metadata,
          canceled_at: new Date().toISOString(),
          cancellation_reason: paymentIntent.cancellation_reason || 'Unknown'
        }
      }
    });

    await strapi.service('api::payment-link.payment-link').logAccess(
      paymentLink,
      'expired',
      { request: { ip: 'webhook', header: { 'user-agent': 'stripe-webhook' } } },
      { 
        payment_intent_id: paymentIntent.id,
        cancellation_reason: paymentIntent.cancellation_reason || 'Unknown',
        webhook_event: 'payment_intent.canceled'
      }
    );

    console.log(`Marked payment link ${paymentLink.id} as expired due to cancellation`);
  } catch (error) {
    console.error('Error handling canceled payment intent:', error);
  }
}