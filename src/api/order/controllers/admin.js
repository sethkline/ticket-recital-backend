'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const NodeCache = require( "node-cache" );
const myCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async totalSales(ctx) {
    let totalSales = myCache.get("totalSales");

    if (totalSales === undefined) {
      const results = await strapi.entityService.findMany('api::order.order', {
        fields: ['total_amount'],
        filters: { status: 'paid' }
      });

      totalSales = results.reduce((acc, order) => acc + order.total_amount, 0);
      myCache.set("totalSales", totalSales);
    }

    return ctx.send({ totalSales });
  },
}));
