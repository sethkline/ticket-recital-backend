'use strict';

const NodeCache = require('node-cache');

const rateLimitCache = new NodeCache({ 
  stdTTL: 900, // 15 minutes default
  checkperiod: 60 // Check for expired keys every minute
});

const rateLimits = {
  payment_link_validation: {
    max: 10,
    window: 900, // 15 minutes
    key: 'ip'
  },
  payment_attempts: {
    max: 5,
    window: 3600, // 1 hour
    key: 'token'
  },
  payment_link_creation: {
    max: 20,
    window: 3600, // 1 hour per user
    key: 'user'
  }
};

function getRateLimitKey(limitType, ctx) {
  const config = rateLimits[limitType];
  if (!config) {
    return null;
  }

  switch (config.key) {
    case 'ip':
      return `${limitType}:${ctx.request.ip}`;
    case 'token':
      const token = ctx.params.token || ctx.request.body.token;
      return token ? `${limitType}:${token}` : null;
    case 'user':
      const userId = ctx.state.user?.id;
      return userId ? `${limitType}:user:${userId}` : null;
    default:
      return null;
  }
}

function isRateLimited(limitType, ctx) {
  const key = getRateLimitKey(limitType, ctx);
  if (!key) {
    return false;
  }

  const config = rateLimits[limitType];
  const current = rateLimitCache.get(key) || 0;

  if (current >= config.max) {
    return true;
  }

  rateLimitCache.set(key, current + 1, config.window);
  return false;
}

module.exports = {
  paymentLinkValidation: async (ctx, next) => {
    if (isRateLimited('payment_link_validation', ctx)) {
      return ctx.tooManyRequests('Too many validation attempts. Please wait before trying again.');
    }
    await next();
  },

  paymentAttempts: async (ctx, next) => {
    if (isRateLimited('payment_attempts', ctx)) {
      return ctx.tooManyRequests('Too many payment attempts for this link. Please wait before trying again.');
    }
    await next();
  },

  paymentLinkCreation: async (ctx, next) => {
    if (isRateLimited('payment_link_creation', ctx)) {
      return ctx.tooManyRequests('Rate limit exceeded for payment link creation. Please wait before creating more links.');
    }
    await next();
  }
};