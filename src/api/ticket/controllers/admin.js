'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ticket.ticket', ({ strapi }) => ({
  async listTicketsWithUserRoles(ctx) {
    const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
      populate: {
        order: {  // Populate order which is linked to the ticket
          populate: {
            user: {  // From the order, populate the user
              populate: {
                role: true  // Populate the role of the user
              }
            }
          }
        },
        event: true,  // Optionally populate event details if needed
        seat: true   // Optionally populate seat details if needed
      }
    });

    // Group tickets by user, following the ticket -> order -> user path
    const groupedByUser = tickets.reduce((acc, ticket) => {
      // Check if ticket has an order and that order has a user
      const user = ticket.order && ticket.order.user ? ticket.order.user : null;

      // Use a generic 'anonymous' ID if no user is associated
      const userId = user ? user.id : 'anonymous';

      // Initialize user group if not already present
      if (!acc[userId]) {
        acc[userId] = {
          username: user ? user.username : 'Anonymous',
          email: user ? user.email : null,
          roleName: user && user.role ? user.role.name : null,
          tickets: [],  // Initialize an array to hold tickets for this user
        };
      }

      // Add ticket to the user's group
      acc[userId].tickets.push({
        ticketId: ticket.id,
        eventTitle: ticket.event ? ticket.event.title : null,
        seatNumber: ticket.seat ? ticket.seat.number : null
      });

      return acc;
    }, {});

    // Convert the grouped object back to an array for easier handling in client-side
    const result = Object.values(groupedByUser);

    return ctx.send(result);
  }
}));
