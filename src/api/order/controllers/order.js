'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async createPayment(ctx) {
    const { amount, customer, token, eventDetails } = ctx.request.body;
    try {
      // Charge the customer
      const charge = await stripe.charges.create({
        amount: amount * 100, // Convert amount to cents
        currency: 'usd',
        description: `Order on ${new Date()} by ${ctx.state.user.username} ${ctx.state.user.email}`,
        source: token
      });

      // Create the order
      const order = await strapi.entityService.create('api::order.order', {
        data: {
          users_permissions_user: ctx.state.user.id,
          total_amount: amount,
          status: 'paid',
          stripe_payment_id: charge.id,
        }
      });

      // Create tickets and update seats
      const ticketsPromises = eventDetails.seats.map(async (seatId) => {
        // Check and update the seat availability
        const seat = await strapi.entityService.findOne('api::seat.seat', seatId);
        if (!seat.is_available) {
          throw new Error('Seat is already booked');
        }
        await strapi.entityService.update('api::seat.seat', seatId, {
          data: { is_available: false },
        });

        // Create the ticket
        return strapi.entityService.create('api::ticket.ticket', {
          data: {
            users_permissions_user: ctx.state.user.id,
            event: eventDetails.eventId,
            seat: seatId,
            purchase_date: new Date(),
            order: order.id,
          }
        });
      });

      await Promise.all(ticketsPromises);

      // Send email
      await strapi.plugins['email'].services.email.send({
        to: ctx.state.user.email,
        subject: 'Thanks for purchasing tickets for Reverence Studios Recital',
        text: `Thank you ${ctx.state.user.firstname} for purchasing tickets for the 2024 Reverence Recital! Your total paid is $${amount}. Thank you for supporting Reverence Studios.`
      });

      return ctx.send({
        message: 'Payment and order processing succeeded',
        order: order,
        paymentIntentId: charge.id,
      });

    } catch (error) {
      console.error('Payment processing failed:', error);
      return ctx.badRequest('Payment processing failed');
    }
  },
  async findUserTickets(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest('No authentication found.');
    }

    const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
      filters: { users_permissions_user: user.id },
      populate: ['event', 'seat', 'order'], // Assuming these relations exist
    });

    return ctx.send(tickets);
  }
}));




        // await strapi.plugins['email'].services.email.send({
        //   to: ctx.state.user.email,
        //   from: 'office@reverencestudios.com',
        //   subject: 'Thanks for signing up for Reverence Recital Video',
        //   text: `Thank you ${fullName} for signing up to watch online the 2022 Reverence Recital! You have signed up for ${plan[0].name}. Your total paid is $${amount}. Thank you for supporting Reverence Studios.`
        // });


                // await strapi.plugins['email'].services.email.send({
        //   to: ctx.state.user.email,
        //   from: 'whoever@email.com',
        //   subject: 'Thanks for purchasing tickets for the recital',
        //   text: `Thank you ${fullName} for purchasing tieckets for the recital.`
        // });
