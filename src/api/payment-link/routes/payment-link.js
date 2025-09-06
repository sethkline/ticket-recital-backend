'use strict';

const rateLimitMiddlewares = require('../../../middlewares/payment-link-rate-limit');

module.exports = {
  routes: [
    // Admin routes (require authentication)
    {
      method: 'GET',
      path: '/payment-links',
      handler: 'payment-link.find',
      config: {
        auth: { strategy: 'jwt' },
        policies: []
      }
    },
    {
      method: 'GET',
      path: '/payment-links/:id',
      handler: 'payment-link.findOne',
      config: {
        auth: { strategy: 'jwt' },
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/payment-links/create',
      handler: 'payment-link.createPaymentLink',
      config: {
        auth: { strategy: 'jwt' },
        policies: [],
        middlewares: [rateLimitMiddlewares.paymentLinkCreation]
      }
    },
    {
      method: 'GET',
      path: '/payment-links/admin/:token',
      handler: 'payment-link.getPaymentLinkStatus',
      config: {
        auth: { strategy: 'jwt' },
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/payment-links/cancel/:token',
      handler: 'payment-link.cancelPaymentLink',
      config: {
        auth: { strategy: 'jwt' },
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/payment-links/resend/:token',
      handler: 'payment-link.resendPaymentLink',
      config: {
        auth: { strategy: 'jwt' },
        policies: []
      }
    },
    
    // Public routes (no authentication required)
    {
      method: 'GET',
      path: '/payment-links/validate/:token',
      handler: 'payment-link.validatePaymentLink',
      config: {
        auth: false,
        policies: [],
        middlewares: [rateLimitMiddlewares.paymentLinkValidation]
      }
    },
    {
      method: 'POST',
      path: '/payment-links/initiate-payment',
      handler: 'payment-link.initiatePayment',
      config: {
        auth: false,
        policies: [],
        middlewares: [rateLimitMiddlewares.paymentAttempts]
      }
    },
    {
      method: 'POST',
      path: '/payment-links/complete-payment',
      handler: 'payment-link.completePayment',
      config: {
        auth: false,
        policies: [],
        middlewares: [rateLimitMiddlewares.paymentAttempts]
      }
    }
  ]
};