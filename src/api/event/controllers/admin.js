'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::event.event', ({ strapi }) => ({
  async eventMetrics(ctx) {
    const { eventId } = ctx.params;
    const event = await strapi.entityService.findOne('api::event.event', eventId, {
      populate: { seats: true, tickets: true }
    });

    if (!event) {
      return ctx.notFound('Event not found');
    }

    const totalSeats = event.seats.length;
    const soldSeats = event.seats.filter(seat => seat.is_reserved).length;
    const availableSeats = totalSeats - soldSeats;
    const totalOrders = event.tickets.length;

    return ctx.send({
      eventId: eventId,
      totalSeats,
      soldSeats,
      availableSeats,
      totalOrders
    });
  }
}));
