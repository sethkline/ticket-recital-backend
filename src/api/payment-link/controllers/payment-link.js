'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::payment-link.payment-link', ({ strapi }) => ({
  async find(ctx) {
    try {
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        populate: ['order', 'created_by_admin'],
        sort: { createdAt: 'desc' },
        ...ctx.query
      });

      return ctx.send(paymentLinks);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      return ctx.internalServerError('Failed to fetch payment links');
    }
  },

  async findOne(ctx) {
    try {
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      const { id } = ctx.params;
      
      const paymentLink = await strapi.entityService.findOne('api::payment-link.payment-link', id, {
        populate: ['order', 'created_by_admin', 'access_logs']
      });

      if (!paymentLink) {
        return ctx.notFound('Payment link not found');
      }

      return ctx.send(paymentLink);
    } catch (error) {
      console.error('Error fetching payment link:', error);
      return ctx.internalServerError('Failed to fetch payment link');
    }
  },

  async createPaymentLink(ctx) {
    try {
      const { customer_email, customer_name, customer_phone, custom_message, expiry_days = 7 } = ctx.request.body;
      
      
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      if (!customer_email || !customer_name) {
        return ctx.badRequest('Customer email and name are required');
      }

      const token = crypto.randomUUID();
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expiry_days);

      const paymentLink = await strapi.entityService.create('api::payment-link.payment-link', {
        data: {
          token,
          customer_email,
          customer_name,
          customer_phone,
          custom_message,
          amount: 20.00,
          status: 'pending',
          expires_at,
          created_by_admin: ctx.state.user.id,
          metadata: {
            created_by: ctx.state.user.email,
            created_at: new Date().toISOString()
          }
        }
      });

      await strapi.service('api::payment-link.payment-link').logAccess(
        paymentLink,
        'viewed',
        ctx,
        { action: 'created_by_admin' }
      );

      const paymentUrl = strapi.service('api::payment-link.payment-link').createPaymentUrl(token);

      const { send_email } = ctx.request.body;
      if (send_email) {
        await strapi.service('api::payment-link.payment-link').sendPaymentLinkEmail(paymentLink, paymentUrl);
      }

      return ctx.send({
        success: true,
        payment_link: {
          id: paymentLink.id,
          token: paymentLink.token,
          url: paymentUrl,
          expires_at: paymentLink.expires_at,
          customer_email: paymentLink.customer_email,
          customer_name: paymentLink.customer_name
        }
      });
    } catch (error) {
      console.error('Error creating payment link:', error);
      return ctx.internalServerError('Failed to create payment link');
    }
  },

  async validatePaymentLink(ctx) {
    try {
      const { token } = ctx.params;
      
      if (!token) {
        return ctx.badRequest('Token is required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { token },
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Invalid payment link');
      }

      const paymentLink = paymentLinks[0];

      const isExpired = strapi.service('api::payment-link.payment-link').validateExpiry(paymentLink);
      if (isExpired) {
        await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
          data: { status: 'expired' }
        });
        
        await strapi.service('api::payment-link.payment-link').logAccess(
          paymentLink,
          'expired',
          ctx
        );
        
        return ctx.badRequest('This payment link has expired');
      }

      if (paymentLink.status === 'completed') {
        return ctx.badRequest('This payment link has already been used');
      }

      if (paymentLink.status === 'expired') {
        return ctx.badRequest('This payment link has expired');
      }

      await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
        data: { last_accessed: new Date() }
      });

      await strapi.service('api::payment-link.payment-link').logAccess(
        paymentLink,
        'viewed',
        ctx
      );

      return ctx.send({
        valid: true,
        customer_email: paymentLink.customer_email,
        customer_name: paymentLink.customer_name,
        amount: paymentLink.amount,
        custom_message: paymentLink.custom_message,
        status: paymentLink.status
      });
    } catch (error) {
      console.error('Error validating payment link:', error);
      return ctx.internalServerError('Failed to validate payment link');
    }
  },

  async initiatePayment(ctx) {
    try {
      const { token } = ctx.request.body;
      
      if (!token) {
        return ctx.badRequest('Token is required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { token },
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Invalid payment link');
      }

      const paymentLink = paymentLinks[0];

      const isExpired = strapi.service('api::payment-link.payment-link').validateExpiry(paymentLink);
      if (isExpired || paymentLink.status === 'expired') {
        return ctx.badRequest('This payment link has expired');
      }

      if (paymentLink.status === 'completed') {
        return ctx.badRequest('This payment link has already been used');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentLink.amount * 100),
        currency: 'usd',
        metadata: {
          payment_link_id: paymentLink.id,
          payment_link_token: paymentLink.token,
          customer_email: paymentLink.customer_email,
          customer_name: paymentLink.customer_name
        },
        description: `Digital Download Purchase - ${paymentLink.customer_name}`
      });

      await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
        data: {
          stripe_payment_intent_id: paymentIntent.id,
          status: 'processing'
        }
      });

      await strapi.service('api::payment-link.payment-link').logAccess(
        paymentLink,
        'payment_attempted',
        ctx,
        { payment_intent_id: paymentIntent.id }
      );

      return ctx.send({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentLink.amount
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      return ctx.internalServerError('Failed to initiate payment');
    }
  },

  async completePayment(ctx) {
    try {
      const { token, payment_intent_id } = ctx.request.body;
      
      if (!token || !payment_intent_id) {
        return ctx.badRequest('Token and payment intent ID are required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { 
          token,
          stripe_payment_intent_id: payment_intent_id
        },
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Invalid payment link or payment intent');
      }

      const paymentLink = paymentLinks[0];

      if (paymentLink.status === 'completed') {
        const existingOrder = await strapi.entityService.findMany('api::order.order', {
          filters: { id: paymentLink.order },
          limit: 1
        });
        
        if (existingOrder && existingOrder.length > 0) {
          return ctx.send({
            success: true,
            access_code: existingOrder[0].access_code,
            order_id: existingOrder[0].id,
            message: 'Payment already processed'
          });
        }
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      if (paymentIntent.status !== 'succeeded') {
        await strapi.service('api::payment-link.payment-link').logAccess(
          paymentLink,
          'payment_failed',
          ctx,
          { reason: 'Payment not succeeded', status: paymentIntent.status }
        );
        return ctx.badRequest('Payment not completed successfully');
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
        ctx,
        { order_id: order.id, access_code: accessCode }
      );

      await strapi.service('api::payment-link.payment-link').sendConfirmationEmail(
        order,
        paymentLink
      );

      const response = {
        success: true,
        access_code: accessCode,
        order_id: order.id,
        message: 'Payment completed successfully'
      };
      
      console.log('Sending response to frontend:', response);
      
      return ctx.send(response);
    } catch (error) {
      console.error('Error completing payment:', error);
      return ctx.internalServerError('Failed to complete payment');
    }
  },

  async getPaymentLinkStatus(ctx) {
    try {
      const { token } = ctx.params;
      
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { token },
        populate: ['order', 'created_by_admin', 'access_logs'],
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Payment link not found');
      }

      const paymentLink = paymentLinks[0];

      const accessLogs = await strapi.entityService.findMany('api::payment-link-access-log.payment-link-access-log', {
        filters: { payment_link: paymentLink.id },
        sort: { accessed_at: 'desc' },
        limit: 50
      });

      return ctx.send({
        payment_link: paymentLink,
        access_logs: accessLogs,
        total_accesses: accessLogs.length
      });
    } catch (error) {
      console.error('Error getting payment link status:', error);
      return ctx.internalServerError('Failed to get payment link status');
    }
  },

  async cancelPaymentLink(ctx) {
    try {
      const { token } = ctx.params;
      
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { token },
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Payment link not found');
      }

      const paymentLink = paymentLinks[0];

      if (paymentLink.status === 'completed') {
        return ctx.badRequest('Cannot cancel a completed payment link');
      }

      if (paymentLink.stripe_payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel(paymentLink.stripe_payment_intent_id);
        } catch (stripeError) {
          console.error('Error canceling Stripe payment intent:', stripeError);
        }
      }

      await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
        data: { 
          status: 'expired',
          metadata: {
            ...paymentLink.metadata,
            cancelled_by: ctx.state.user.email,
            cancelled_at: new Date().toISOString()
          }
        }
      });

      await strapi.service('api::payment-link.payment-link').logAccess(
        paymentLink,
        'expired',
        ctx,
        { cancelled_by_admin: ctx.state.user.email }
      );

      return ctx.send({
        success: true,
        message: 'Payment link cancelled successfully'
      });
    } catch (error) {
      console.error('Error canceling payment link:', error);
      return ctx.internalServerError('Failed to cancel payment link');
    }
  },

  async resendPaymentLink(ctx) {
    try {
      const { token } = ctx.params;
      
      if (!ctx.state.user) {
        return ctx.unauthorized('Admin authentication required');
      }

      const paymentLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: { token },
        limit: 1
      });

      if (!paymentLinks || paymentLinks.length === 0) {
        return ctx.notFound('Payment link not found');
      }

      const paymentLink = paymentLinks[0];

      if (paymentLink.status === 'completed') {
        return ctx.badRequest('Cannot resend a completed payment link');
      }

      if (paymentLink.status === 'expired') {
        return ctx.badRequest('Cannot resend an expired payment link');
      }

      const paymentUrl = strapi.service('api::payment-link.payment-link').createPaymentUrl(token);
      
      await strapi.service('api::payment-link.payment-link').sendPaymentLinkEmail(paymentLink, paymentUrl);

      await strapi.entityService.update('api::payment-link.payment-link', paymentLink.id, {
        data: {
          metadata: {
            ...paymentLink.metadata,
            last_resent_by: ctx.state.user.email,
            last_resent_at: new Date().toISOString()
          }
        }
      });

      return ctx.send({
        success: true,
        message: 'Payment link resent successfully',
        email: paymentLink.customer_email
      });
    } catch (error) {
      console.error('Error resending payment link:', error);
      return ctx.internalServerError('Failed to resend payment link');
    }
  }
}));