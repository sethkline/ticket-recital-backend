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
  // async eventMetrics(ctx) {
  //   const { eventId } = ctx.params;
  //   const event = await strapi.entityService.findOne('api::event.event', eventId, {
  //     populate: {
  //       seats: true,
  //       tickets: {
  //         populate: {
  //           order: true  // Ensure orders related to tickets are populated
  //         }
  //       }
  //     }
  //   });

  //   if (!event) {
  //     return ctx.notFound('Event not found');
  //   }

  //   const totalSeats = event.seats.length;
  //   const soldSeats = event.seats.filter(seat => seat.is_reserved).length;
  //   const availableSeats = totalSeats - soldSeats;

  //   // Initialize the total sales amount
  //   let totalSales = 0;
  //   event.tickets.forEach(ticket => {
  //     if (ticket.order) {
  //       totalSales += ticket.order.total_amount;
  //     }
  //   });

  //   // Get total number of orders through the tickets
  //   const orders = new Set(event.tickets.map(ticket => ticket.order ? ticket.order.id : null).filter(id => id));
  //   const totalOrders = orders.size;

  //   return ctx.send({
  //     eventId: eventId,
  //     totalSeats,
  //     soldSeats,
  //     availableSeats,
  //     totalOrders,
  //     totalSales  // Adding total sales to the response
  //   });
  // }

}));
