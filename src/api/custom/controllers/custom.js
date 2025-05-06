// api/custom/controllers/Custom.js
module.exports = {
  resetReservations: async (ctx) => {
    try {
      const now = new Date();
      const expirationLimit = 1; // hours

      // Same logic as your cron job
      const seats = await strapi.entityService.findMany('api::seat.seat', {
        filters: {
          is_reserved: true,
          is_available: true,
          reservation_timestamp: {
            $notNull: true
          }
        }
      });

      let resetCount = 0;
      for (let seat of seats) {
        const reservationTime = new Date(seat.reservation_timestamp);
        const hoursDifference = (now - reservationTime) / (1000 * 60 * 60);
        if (hoursDifference >= expirationLimit) {
          await strapi.entityService.update('api::seat.seat', seat.id, {
            data: {
              is_reserved: false,
              reservation_timestamp: null,
              reserved_by: null // Add this to clear user relation
            }
          });
          resetCount++;
        }
      }

      return {
        success: true,
        message: `Reset ${resetCount} expired seat reservations`
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
};
