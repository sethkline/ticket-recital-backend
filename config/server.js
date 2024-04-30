module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  logger: {
    level: 'debug', // Levels are: fatal, error, warn, info, debug, trace, or silent
    exposeInContext: true,
    requests: true,
  },
  cron: {
    enabled: true,
    tasks: {
      '*/15 * * * *': async () => { // runs every 15 minutes
        console.log(`Cron job started at ${new Date().toISOString()}`);
        const now = new Date();
        const expirationLimit = 1; // hours, can be adjusted

        // Fetch all seats that are reserved but not yet unavailable
        const seats = await strapi.entityService.findMany('api::seat.seat', {
          filters: {
            is_reserved: true,
            is_available: true,
            reservation_timestamp: {
              $notNull: true
            }
          }
        });

        for (let seat of seats) {
          const reservationTime = new Date(seat.reservation_timestamp);
          const hoursDifference = (now - reservationTime) / (1000 * 60 * 60);
          if (hoursDifference >= expirationLimit) {
            // Update the seat to make it available again
            await strapi.entityService.update('api::seat.seat', seat.id, {
              data: {
                is_reserved: false,
                reservation_timestamp: null
              }
            });
            console.log(`Seat ${seat.id} is now available again.`);
          }
        }
        console.log(`Cron job completed at ${new Date().toISOString()}`)
      }
    }
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

