'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  // Adding custom method createPayment
  async createPayment(ctx) {
    const { amount, customer, token, eventDetails } = ctx.request.body;


    try {
      const charge = await stripe.charges.create({
        amount: amount * 100,
        currency: 'usd',
        description: `Order ${new Date()} by ${ctx.state.user.username} ${ctx.state.user.email}`,
        source: token
      });
      console.log(charge);
    } catch (error) {
      console.error('Charge creation failed:', error);
      return ctx.badRequest('Payment processing failed');

    }


  //   try {
  //     const paymentIntent = await stripe.paymentIntents.create({
  //       amount: amount,
  //       currency: 'usd',
  //       description: `Order ${new Date()} by ${customer.name}`,
  //       payment_method: token,
  //       confirm: true,
  //       receipt_email: customer.email,
  //     });

  //     console.log(paymentIntent, 'payment intent');

  //     if (paymentIntent.status === 'succeeded') {
  //       const order = await strapi.entityService.create('api::order.order', {
  //         data: {
  //           user: ctx.state.user.id,
  //           total: amount,
  //           status: 'paid',
  //           event: eventDetails.eventId
  //         },
  //       });

  //       const ticketsPromises = eventDetails.seats.map(async seatId => {
  //         return strapi.entityService.create('api::ticket.ticket', {
  //           data: {
  //             user: ctx.state.user.id,
  //             event: eventDetails.eventId,
  //             seat: seatId,
  //             order: order.id
  //           },
  //         });
  //       });

  //       await Promise.all(ticketsPromises);
  //       return ctx.send({
  //         message: 'Payment and order processing succeeded',
  //         order: order,
  //         paymentIntentId: paymentIntent.id,
  //       });
  //     } else {
  //       return ctx.send({
  //         message: 'Payment did not succeed',
  //         paymentIntentStatus: paymentIntent.status
  //       }, 400);
  //     }
  //   } catch (err) {
  //     return ctx.badRequest('Payment processing failed');
  //   }
  },

  // Override any core controller methods as needed or extend with custom ones
}));

