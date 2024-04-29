'use strict';
const fs = require('fs');
const path = require('path'); // Require the path module
const handlebars = require('handlebars');

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async createPayment(ctx) {
    const { amount, token, seats, dvds, printInfo } = ctx.request.body;
    const TICKET_PRICE = 18;
    const DVD_PRICE = 30;
    const SURCHARGE = 5;

    const totalTickets = seats.reduce((acc, event) => acc + event.seats.length, 0);
    const expectedAmount = (totalTickets * TICKET_PRICE) + (dvds * DVD_PRICE) + SURCHARGE;



    // Verify if the charged amount matches the expected amount
    if (amount !== expectedAmount) {
      return ctx.badRequest(`Invalid amount. Expected ${expectedAmount} but got ${amount}`);
    }
    // add a todo to also email kirsten about the problem with user name and email
    // there is probably a problem with the system or someone is trying to pay less by hacking
    if(process.env.NODE_ENV === 'production') {
      await strapi.plugins['email'].services.email.send({
        to: process.env.MAIL_FROM_ADDRESS,
        from: 'alert@reverencestudios.com',
        subject: 'Alert: Payment Failed',
        text: `User ${ctx.state.user.firstname + ' ' + ctx.state.user.lastname} with email ${ctx.state.user.email} has tried to pay ${amount} but it is not the expected amount of ${expectedAmount}.`,
      });
    }

    // create the charge with Stripe
    try {
      const charge = await stripe.charges.create({
        amount: amount * 100,
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
          dvd_count: dvds
        }
      });

      // Create a ticket for each seat
      const ticketsPromises = seats.flatMap((event) =>
        event.seats.map(async (seatId) => {
          const seat = await strapi.entityService.findOne('api::seat.seat', seatId);
          if (!seat.is_available) {

            if(process.env.NODE_ENV === 'production') {
              await strapi.plugins['email'].services.email.send({
                to: process.env.MAIL_FROM_ADDRESS,
                from: 'alert@reverencestudios.com',
                subject: 'Alert: Payment Failed',
                text: `User ${ctx.state.user.firstname + ' ' + ctx.state.user.lastname} with email ${ctx.state.user.email} has been charged ${amount} but their seat ${seat.number} is not available ${expectedAmount}.`,
              });
            }
            // they have been charged but there seat isn't available
            throw new Error('Seat is already booked');
          }

          await strapi.entityService.update('api::seat.seat', seatId, { data: { is_available: false } });

          return strapi.entityService.create('api::ticket.ticket', {
            data: {
              users_permissions_user: ctx.state.user.id,
              event: event.eventId,
              seat: seatId,
              purchase_date: new Date(),
              order: order.id
            }
          });
        })
      );

      // helper function that creates a html template for a ticket
      const generateTicketHTML = async ({ date, time, row, seat, backgroundImage }) => {
        const templatePath = path.join(__dirname, '../templates/recitalTicketTemplate.hbs');
        const template = fs.readFileSync(templatePath, 'utf-8');
        const compileTemplate = handlebars.compile(template);

        const htmlOutput = compileTemplate({ date, time, row, seat, backgroundImage });
        return htmlOutput;
      };

      await Promise.all(ticketsPromises);

      const afternoonImagePath = `${process.env.APP_URL}/images/afternoon763x256.webp`;
      const morningImagePath = `${process.env.APP_URL}/images/morning763x256.webp`;

      const htmlContent = await Promise.all(
        printInfo.map(async (ticket) => {
          return await generateTicketHTML({
            date: ticket.date,
            time: ticket.time,
            row: ticket.row,
            seat: ticket.seat,
            backgroundImage: ticket.backgroundImage === 'afternoon' ? afternoonImagePath : morningImagePath
          });
    }))

    const fullHtmlContent = htmlContent.join('');

      const fullPdfBuffer = await strapi.services['api::order.pdf-service'].createPDF(fullHtmlContent);

      const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

      const emailData = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: ctx.state.user.email,
        subject: 'Your Tickets for the Reverence Studios Recital',
        text: 'Thanks for purchasing tickets for Reverence Studios Recital, your tickets are attached here',
        attachment: new mailgun.Attachment({ data: fullPdfBuffer, filename: 'recital-tickets.pdf' })
      };

      await mailgun.messages().send(emailData);


      if(process.env.NODE_ENV === 'production') {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'success@reverencestudios.com',
          subject: `Tickets successfully purchased`,
          text: `User ${ctx.state.user.firstname + ' ' + ctx.state.user.lastname} with email ${ctx.state.user.email} has purchased ${amount} and these seats ${seats} and ${dvds} DVDS`,
        });
      }


      return ctx.send({
        message: 'Payment and order processing succeeded',
        order: order,
        tickets: fullPdfBuffer
      });
    } catch (error) {
      if(process.env.NODE_ENV === 'production') {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'alert@reverencestudios.com',
          subject: 'Alert: Payment Failed',
          text: `User ${ctx.state.user.firstname + ' ' + ctx.state.user.lastname} with email ${ctx.state.user.email} has a payment of ${amount} and had some kind of error.`,
        });
      }
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
      populate: ['event', 'seat', 'order'] // Assuming these relations exist
    });

    return ctx.send(tickets);
  }
}));
