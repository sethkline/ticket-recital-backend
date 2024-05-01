'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::seat.seat', ({ strapi }) => ({
  async toggleSeatReservation(ctx) {
    const { id } = ctx.params;
    const { isReserved } = ctx.request.body;

    console.log('Received ID:', id, 'IsReserved:', isReserved);

    console.log(ctx.state, 'ctx.state.user', ctx.state.user);
    if (!ctx.state.user) {
      console.error('No user in context');
      return ctx.unauthorized('You must be logged in to perform this action');
    }

    const entity = await strapi.entityService.findOne('api::seat.seat', id, {
      populate: { user: true },
    });

    if (!entity) {
      console.error('No seat found for ID:', id);
      return ctx.notFound('No seat found');
    }

    console.log('Seat entity:', entity);

    if (isReserved) {
      if (entity.is_reserved || !entity.is_available) {
        return ctx.conflict('Seat is already reserved or not available.');
      }

      const updatedSeat = await strapi.entityService.update('api::seat.seat', id, {
        data: {
          user: ctx.state.user.id,
          is_reserved: true,
          reservation_timestamp: new Date(),
        },
      });
      // strapi.io.emit('seat-reserved', { seatId: id, isReserved: true, userId: ctx.state.user.id });
      return ctx.send(updatedSeat);
    } else {
      if (!entity.is_reserved || (entity.user && entity.user.id !== ctx.state.user.id)) {
        return ctx.conflict('You cannot unreserve a seat that you did not reserve.');
      }

      const updatedSeat = await strapi.entityService.update('api::seat.seat', id, {
        data: {
          user: null,
          is_reserved: false,
          reservation_timestamp: null,
        },
      });
      // strapi.io.emit('seat-unreserved', { seatId: id, isReserved: false, userId: ctx.state.user.id });
      return ctx.send(updatedSeat);
    }
  }
}));
