'use strict';

const Queue = require('bull');
const createPDF = require('./services/pdfService'); // Correct the path if necessary

module.exports = ({ env }) => ({
  register({ strapi }) {
    // Register phase: no side-effects, just setup (optional)
  },

  async bootstrap({ strapi }) {
    console.log('Running bootstrap function...');

    // const deleteAllSeats = async () => {
    //   const seats = await strapi.entityService.findMany('api::seat.seat');
    //   const tickets = await strapi.entityService.findMany('api::tickets.tickets');
    //   for (const seat of seats) {
    //     await strapi.entityService.delete('api::seat.seat', seat.id);
    //   }
    //   for (const ticket of tickets) {
    //     await strapi.entityService.delete('api::ticket.ticket', ticket.id);
    //   }
    //   console.log('All seats have been deleted.');
    // };

    // await deleteAllSeats()

    const httpServer = strapi.server.httpServer;
    const io = require('socket.io')(httpServer, {
      cors: {
        origin: env('FRONTEND_URL'),
        methods: ['GET', 'POST']
      }
    });

    // Queue setup
    const pdfQueue = new Queue('pdf-generation', {
      redis: { host: '127.0.0.1', port: 6379 } // Specify your Redis connection
    });

    pdfQueue.process(async (job) => {
      const { htmlContent, userEmail } = job.data;
      try {
        const pdfBuffer = await createPDF(htmlContent);
        await strapi.plugins['email'].services.email.send({
          to: userEmail,
          subject: 'Your PDF Document',
          text: 'Here is your PDF document.',
          attachments: [{ filename: 'document.pdf', content: pdfBuffer, contentType: 'application/pdf' }]
        });
        console.log('PDF generated and emailed successfully.');
      } catch (error) {
        console.error('Error generating PDF:', error);
      }
    });

    strapi.services.queue = pdfQueue;

    // Socket.io setup
    io.on('connection', (socket) => {
      console.log('a user connected', socket.id);

      socket.on('reserve-seat', async (data) => {
        socket.broadcast.emit('seat-reserved', data);
      });

      socket.on('disconnect', () => {
        console.log('user disconnected', socket.id);
      });
    });

    strapi.io = io; // Make io accessible in Strapi controllers
  }
});
