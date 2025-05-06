// api/custom/controllers/custom.js
module.exports = {
  resetReservations: async (ctx) => {
    try {
      const now = new Date();

      // Get expiration time from query parameter or default to 15 minutes (0.25 hours)
      const minutesParam = ctx.query.minutes;
      const expirationLimit = minutesParam ? parseFloat(minutesParam) / 60 : (15/60); // Default to 15 minutes

      console.log(`Using expiration limit of ${expirationLimit} hours (${expirationLimit * 60} minutes)`);
      console.log(`Current time: ${now.toISOString()}`);

      // Fetch seats that are reserved and still available
      const seats = await strapi.entityService.findMany('api::seat.seat', {
        filters: {
          is_reserved: true,
          is_available: true,
          reservation_timestamp: {
            $notNull: true
          }
        }
      });

      console.log(`Found ${seats.length} reserved seats`);

      let resetCount = 0;
      for (let seat of seats) {
        const reservationTime = new Date(seat.reservation_timestamp);

        // Calculate hours difference
        const hoursDifference = (now - reservationTime) / (1000 * 60 * 60);
        const minutesDifference = hoursDifference * 60;

        console.log(`Seat ${seat.id} (${seat.number}): reserved at ${reservationTime.toISOString()}`);
        console.log(`Time difference: ${hoursDifference.toFixed(2)} hours (${minutesDifference.toFixed(2)} minutes)`);
        console.log(`Will reset? ${hoursDifference >= expirationLimit ? 'YES' : 'NO'}`);

        // Check if reservation has expired
        if (hoursDifference >= expirationLimit) {
          // Update the seat to clear the reservation
          await strapi.entityService.update('api::seat.seat', seat.id, {
            data: {
              is_reserved: false,
              reservation_timestamp: null,
              reserved_by: null // Clear user relation
            }
          });
          resetCount++;
          console.log(`Reset seat ${seat.id} (${seat.number})`);
        }
      }

      // Return success with count of reset seats
      return {
        success: true,
        message: `Reset ${resetCount} expired seat reservations (expiration: ${expirationLimit * 60} minutes)`,
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error('Error in resetReservations:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
};
