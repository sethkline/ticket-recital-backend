'use strict';

/**
 * Custom order routes
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/orders/find-by-email',
      handler: 'api::order.order.findByEmail',
      config: {
        auth: false,
        policies: [],
      }
    },
  ],
};
