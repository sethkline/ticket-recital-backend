'use strict';

module.exports = {


  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log('Running bootstrap function...');
    const deleteAllSeats = async () => {
      const seats = await strapi.entityService.findMany('api::seat.seat');
      for (const seat of seats) {
        await strapi.entityService.delete('api::seat.seat', seat.id);
      }
      console.log('All seats have been deleted.');
    };

    // await deleteAllSeats()

    //socket io
      const httpServer = strapi.server.httpServer;
      const io = require('socket.io')(httpServer, {
        cors: {
          origin: "http://localhost:3000", // URL of your Nuxt frontend
          methods: ["GET", "POST"]
        }
      });

      io.on('connection', (socket) => {
        console.log('a user connected', socket.id);

        socket.on('reserve-seat', async (data) => {
          // Broadcast the reservation to all clients except the one who initiated it
          socket.broadcast.emit('seat-reserved', data);
        });

        socket.on('disconnect', () => {
          console.log('user disconnected', socket.id);
        });
      });

      strapi.io = io; // Make io accessible in Strapi controllers
  },
};
