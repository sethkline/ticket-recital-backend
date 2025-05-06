'use strict';
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async createPayment(ctx) {
    const { amount, token, seats, dvds = 0, digitalDownloads = 0, printInfo } = ctx.request.body;
    const TICKET_PRICE = 18;
    const DVD_PRICE = 30;
    const DIGITAL_PRICE = 20;
    const BUNDLE_DISCOUNT = 5;
    const SURCHARGE = 5;

    const totalTickets = seats.reduce((acc, event) => acc + event.seats.length, 0);

    // Apply bundle discount if both DVD and digital are ordered
    const bundleDiscount = (dvds > 0 && digitalDownloads > 0) ? BUNDLE_DISCOUNT : 0;

    const expectedAmount = (totalTickets * TICKET_PRICE) +
                          (dvds * DVD_PRICE) +
                          (digitalDownloads * DIGITAL_PRICE) +
                          SURCHARGE -
                          bundleDiscount;

    // Verify if the charged amount matches the expected amount
    if (amount !== expectedAmount) {
      // there is probably a problem with the system or someone is trying to pay less by hacking
      if(process.env.NODE_ENV === 'production') {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'alert@reverencestudios.com',
          subject: 'Alert: Payment Failed',
          text: `User ${ctx.state.user.firstname + ' ' + ctx.state.user.lastname} with email ${ctx.state.user.email} has tried to pay ${amount} but it is not the expected amount of ${expectedAmount}.`,
        });
      }

      return ctx.badRequest(`Invalid amount. Expected ${expectedAmount} but got ${amount}`);
    }

    // Create the charge with Stripe
    try {
      const charge = await stripe.charges.create({
        amount: amount * 100,
        currency: 'usd',
        description: `Order on ${new Date()} by ${ctx.state.user.username} ${ctx.state.user.email}`,
        source: token
      });

      // Determine the media type
      let mediaType = 'none';
      if (dvds > 0 && digitalDownloads > 0) {
        mediaType = 'both';
      } else if (dvds > 0) {
        mediaType = 'dvd';
      } else if (digitalDownloads > 0) {
        mediaType = 'digital';
      }

      // Create the order
      const order = await strapi.entityService.create('api::order.order', {
        data: {
          users_permissions_user: ctx.state.user.id,
          total_amount: amount,
          status: 'pending',
          stripe_payment_id: charge.id,
          dvd_count: dvds || 0,
          digital_download_count: digitalDownloads || 0,
          media_type: mediaType,
          media_status: 'pending'
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

      // Generate access code for digital downloads
      let accessCode = null;
      if (digitalDownloads > 0) {
        accessCode = `DVL-${new Date().getFullYear()}-${String(order.id).padStart(4, '0')}`;
        await strapi.entityService.update('api::order.order', order.id, {
          data: {
            access_code: accessCode
          }
        });
      }

      // Helper function to create email of tickets
      const generateEmailTextContent = (printInfo) => {
        const introText = `Thank you for purchasing tickets for the Reverence Studios Recital. Here are the details of your tickets:\n\n`;

        const ticketsDetails = printInfo.map(ticket => {
          const showType = ticket.backgroundImage === 'morning' ? 'Morning Show (10:00 AM)'  : 'Afternoon Show (1:30 PM)';
          const doorsOpenTime = ticket.backgroundImage === 'morning' ? 'Doors open at 9:30 AM' : 'Doors open at 1:00 PM';

          return `Date: ${ticket.date}\n${showType}\n${doorsOpenTime}\nRow: ${ticket.row}, Seat: ${ticket.seat}\n`;
        }).join('\n');

        let mediaDetails = '';
        if (dvds > 0) {
          mediaDetails += `\nYou have ordered ${dvds} DVD(s). We will notify you when they are ready for pickup.\n`;
        }

        if (digitalDownloads > 0) {
          mediaDetails += `\nYou have ordered a digital download of the recital. Your access code is: ${accessCode}\n`;
          mediaDetails += `We will send you instructions on how to access your digital download after the recital.\n`;
        }

        const link = 'https://recital.reverence.dance/profile';

        const emailTextContent = introText + ticketsDetails + mediaDetails + "\nDownload your tickets here: " + link;

        return emailTextContent;
      };

      await Promise.all(ticketsPromises);

      const emailTextContent = generateEmailTextContent(printInfo);

      const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

      const emailData = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: ctx.state.user.email,
        subject: 'Your Tickets for the Reverence Studios Recital',
        text: emailTextContent
      };

      await mailgun.messages().send(emailData);

      if(process.env.NODE_ENV === 'production') {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'success@reverencestudios.com',
          subject: `Tickets successfully purchased`,
          text: `User ${ctx.state.user.email} with id ${ctx.state.user.id} has purchased ${amount}. ${emailTextContent}, ${dvds} DVDs, and ${digitalDownloads} digital downloads`,
        });
      }

      return ctx.send({
        message: 'Payment and order processing succeeded',
        order: order,
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
  },

  async findUserMediaOrders(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest('No authentication found.');
    }

    // Find orders with DVD or digital downloads
    const orders = await strapi.db.query('api::order.order').findMany({
      where: {
        users_permissions_user: user.id,
        $or: [
          { dvd_count: { $gt: 0 } },
          { digital_download_count: { $gt: 0 } },
          { media_type: { $in: ['dvd', 'digital', 'both'] } }
        ]
      }
    });

    // Format orders for the frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderDate: order.createdAt,
      hasDvd: order.dvd_count > 0 || order.media_type === 'dvd' || order.media_type === 'both',
      dvdCount: order.dvd_count || 0,
      hasDigital: order.digital_download_count > 0 || order.media_type === 'digital' || order.media_type === 'both',
      accessCode: order.access_code,
      mediaStatus: order.media_status || 'pending'
    }));

    return ctx.send(formattedOrders);
  },

  async validateAccessCode(ctx) {
    const { accessCode } = ctx.request.body;

    if (!accessCode) {
      return ctx.badRequest('Access code is required');
    }

    try {
      // Find the order with this access code
      const order = await strapi.db.query('api::order.order').findOne({
        where: { access_code: accessCode },
        populate: ['users_permissions_user']
      });

      // If no order found or the order doesn't have digital download or not fulfilled
      if (!order ||
          (order.digital_download_count <= 0 && order.media_type !== 'digital' && order.media_type !== 'both')) {
        return ctx.send({ valid: false, message: 'Invalid access code or no digital content available' });
      }

      // Only check status if we're enforcing it
      if (order.media_status !== 'fulfilled') {
        return ctx.send({ valid: false, message: 'Your digital content is not yet ready for viewing' });
      }

      // Determine which recital type to show based on their ticket purchases
      let recitalType = 'morning'; // Default

      // Find tickets for this order to determine which recital they attended
      const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
        filters: { order: order.id },
        populate: ['event']
      });

      if (tickets && tickets.length > 0) {
        // Check if they have afternoon tickets
        for (const ticket of tickets) {
          if (ticket.event &&
              ticket.event.title &&
              ticket.event.title.toLowerCase().includes('afternoon')) {
            recitalType = 'afternoon';
            break;
          }
        }
      }

      // Log this access attempt (optional)
      try {
        await strapi.entityService.create('api::access-log.access-log', {
          data: {
            order: order.id,
            access_code: accessCode,
            ip_address: ctx.request.ip,
            user_agent: ctx.request.headers['user-agent'],
            access_time: new Date()
          }
        });
      } catch (logError) {
        // Just log the error but don't fail the request
        console.error('Error logging access attempt:', logError);
      }

      return ctx.send({
        valid: true,
        recitalType: recitalType
      });
    } catch (error) {
      console.error('Error validating access code:', error);
      return ctx.badRequest('An error occurred while validating the access code');
    }
  },

  async findByEmail(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest('Email is required');
    }

    try {
      // Find the user by email
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email },
      });

      if (!user) {
        // For security reasons, return empty array rather than error
        return [];
      }

      // First, get the tickets for this user with all necessary relations
      const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
        filters: {
          users_permissions_user: user.id
        },
        populate: ['event', 'seat', 'order'],
      });

      return tickets;
    } catch (error) {
      strapi.log.error('Error finding tickets by email:', error);
      return ctx.badRequest('Error finding tickets');
    }
  }

}));
