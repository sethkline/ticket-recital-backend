'use strict';
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const b2Service = require('../../../services/backblaze-b2');
const videoMetadata = require('../../../../config/video-metadata');

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
        const customerName = ctx.state.user.first_name 
          ? `${ctx.state.user.first_name} ${ctx.state.user.last_name || ''}`.trim()
          : ctx.state.user.email.split('@')[0];
        
        const introText = `Dear ${customerName},\n\nThank you for purchasing tickets for the Reverence Studios Recital. Here are the details of your tickets:\n\n`;

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
    try {
      const { accessCode } = ctx.request.body;
      
      if (!accessCode) {
        return ctx.badRequest('Access code is required');
      }

      // Find order with this access code
      const order = await strapi.entityService.findMany('api::order.order', {
        filters: { 
          access_code: accessCode,
          $or: [
            { digital_download_count: { $gt: 0 } },
            { media_type: 'digital' },
            { media_type: 'both' }
          ]
        },
        populate: ['users_permissions_user'],
      });

      if (!order || order.length === 0) {
        return ctx.unauthorized('Invalid access code');
      }

      const validOrder = order[0];

      // Check if order is fulfilled
      if (validOrder.media_status !== 'fulfilled') {
        return ctx.badRequest('Your digital download is not yet available');
      }

      // Determine recital type based on tickets
      let recitalType = 'both'; // Default to both
      const tickets = await strapi.entityService.findMany('api::ticket.ticket', {
        filters: { order: validOrder.id },
        populate: ['event']
      });

      if (tickets && tickets.length > 0) {
        const hasAfternoon = tickets.some(ticket => 
          ticket.event && ticket.event.title && 
          ticket.event.title.toLowerCase().includes('afternoon')
        );
        const hasMorning = tickets.some(ticket => 
          ticket.event && ticket.event.title && 
          ticket.event.title.toLowerCase().includes('morning')
        );
        
        if (hasAfternoon && !hasMorning) {
          recitalType = 'afternoon';
        } else if (hasMorning && !hasAfternoon) {
          recitalType = 'morning';
        }
      }

      // Log access attempt
      try {
        await strapi.entityService.create('api::access-log.access-log', {
          data: {
            order: validOrder.id,
            accessedAt: new Date(),
            ipAddress: ctx.request.ip,
          },
        });
      } catch (logError) {
        console.error('Error logging access attempt:', logError);
      }

      return ctx.send({
        valid: true,
        orderId: validOrder.id,
        purchaseDate: validOrder.createdAt,
        recitalType: recitalType,
      });
    } catch (error) {
      console.error('Error validating access code:', error);
      return ctx.internalServerError('Failed to validate access code');
    }
  },

  async getVideoUrls(ctx) {
    try {
      const { accessCode, videoType = 'full' } = ctx.request.body;
      
      // Validate access code first
      const order = await strapi.entityService.findMany('api::order.order', {
        filters: { 
          access_code: accessCode,
          $or: [
            { digital_download_count: { $gt: 0 } },
            { media_type: 'digital' },
            { media_type: 'both' }
          ]
        },
      });

      if (!order || order.length === 0) {
        return ctx.unauthorized('Invalid access code');
      }

      const validOrder = order[0];

      if (validOrder.media_status !== 'fulfilled') {
        return ctx.badRequest('Your digital download is not yet available');
      }

      const videos = videoMetadata.recital2025;
      let responseData = {};

      if (videoType === 'full') {
        // Generate URLs for both quality options
        const hqUrl = await b2Service.getSignedUrl(
          videos.fullRecital.highQuality.filePath,
          86400 // 24 hour expiry
        );
        const standardUrl = await b2Service.getSignedUrl(
          videos.fullRecital.standardQuality.filePath,
          86400 // 24 hour expiry
        );
        
        responseData = {
          type: 'full',
          fullRecital: {
            highQuality: {
              ...videos.fullRecital.highQuality,
              downloadUrl: hqUrl,
            },
            standardQuality: {
              ...videos.fullRecital.standardQuality,
              downloadUrl: standardUrl,
            },
            expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
          }
        };
      } else if (videoType === 'individual') {
        // Generate URLs for all individual dances
        const danceUrls = await Promise.all(
          videos.dances.map(async (dance) => {
            const url = await b2Service.getSignedUrl(
              dance.filePath,
              86400 // 24 hour expiry
            );
            
            return {
              ...dance,
              downloadUrl: url,
            };
          })
        );

        responseData = {
          type: 'individual',
          videos: danceUrls,
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        };
      } else if (videoType === 'both') {
        // Generate URLs for everything
        const hqUrl = await b2Service.getSignedUrl(
          videos.fullRecital.highQuality.filePath,
          86400
        );
        const standardUrl = await b2Service.getSignedUrl(
          videos.fullRecital.standardQuality.filePath,
          86400
        );

        const danceUrls = await Promise.all(
          videos.dances.map(async (dance) => {
            const url = await b2Service.getSignedUrl(
              dance.filePath,
              86400
            );
            
            return {
              ...dance,
              downloadUrl: url,
            };
          })
        );

        responseData = {
          type: 'both',
          fullRecital: {
            highQuality: {
              ...videos.fullRecital.highQuality,
              downloadUrl: hqUrl,
            },
            standardQuality: {
              ...videos.fullRecital.standardQuality,
              downloadUrl: standardUrl,
            }
          },
          individualDances: danceUrls,
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        };
      }

      // Log access attempt
      try {
        await strapi.entityService.create('api::access-log.access-log', {
          data: {
            order: validOrder.id,
            accessedAt: new Date(),
            ipAddress: ctx.request.ip,
            videoAccessed: videoType,
          },
        });
      } catch (logError) {
        console.error('Error logging video access:', logError);
      }

      return ctx.send(responseData);
    } catch (error) {
      console.error('Error generating video URLs:', error);
      return ctx.internalServerError('Failed to generate download links');
    }
  },

  async getDownloadHistory(ctx) {
    try {
      const { accessCode } = ctx.params;
      
      // Find order
      const order = await strapi.entityService.findMany('api::order.order', {
        filters: { access_code: accessCode },
      });

      if (!order || order.length === 0) {
        return ctx.notFound('Order not found');
      }

      const accessLogs = await strapi.entityService.findMany('api::access-log.access-log', {
        filters: { order: order[0].id },
        sort: { accessedAt: 'desc' },
        limit: 50,
      });

      return ctx.send({
        orderId: order[0].id,
        totalAccesses: accessLogs.length,
        recentAccesses: accessLogs.slice(0, 10),
      });
    } catch (error) {
      console.error('Error fetching download history:', error);
      return ctx.internalServerError('Failed to fetch download history');
    }
  },

  async generateAccessCodes(ctx) {
    try {
      // Check admin permission
      if (!ctx.state.user || ctx.state.user.role.type !== 'admin') {
        return ctx.forbidden('Admin access required');
      }

      // Find all digital orders without access codes
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          $or: [
            { digital_download_count: { $gt: 0 } },
            { media_type: 'digital' },
            { media_type: 'both' }
          ],
          access_code: null,
          media_status: 'fulfilled',
        },
        populate: ['users_permissions_user'],
      });

      const updatedOrders = [];

      for (const order of orders) {
        const accessCode = this.generateUniqueAccessCode();
        
        await strapi.entityService.update('api::order.order', order.id, {
          data: { access_code: accessCode },
        });

        updatedOrders.push({
          orderId: order.id,
          accessCode,
        });

        // Send email to customer with access code
        if (order.users_permissions_user?.email) {
          try {
            const customerName = order.users_permissions_user.first_name 
              ? `${order.users_permissions_user.first_name} ${order.users_permissions_user.last_name || ''}`.trim()
              : order.users_permissions_user.email.split('@')[0];
            
            await strapi.plugins['email'].services.email.send({
              to: order.users_permissions_user.email,
              subject: 'Your Digital Download is Ready!',
              html: `
                <h2>Dear ${customerName},</h2>
                <p>Your Recital Recording is Available!</p>
                <p>Thank you for your purchase! Your digital download is now ready.</p>
                <p><strong>Access Code:</strong> ${accessCode}</p>
                <p>Visit <a href="${process.env.FRONTEND_URL}/watch-recital">our viewing page</a> and enter your access code to watch or download the recital.</p>
                <p>This access code will remain valid until December 31, 2025.</p>
                <p>If you have any issues, please contact ${process.env.MAIL_REPLY_TO_ADDRESS}</p>
              `,
            });
          } catch (emailError) {
            console.error('Error sending email:', emailError);
          }
        }
      }

      return ctx.send({
        message: `Generated ${updatedOrders.length} access codes`,
        orders: updatedOrders,
      });
    } catch (error) {
      console.error('Error generating access codes:', error);
      return ctx.internalServerError('Failed to generate access codes');
    }
  },

  generateUniqueAccessCode() {
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const numberPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DVL-${year}-${randomPart}${numberPart}`;
  },

  async createTestOrder(ctx) {
    try {
      const userId = ctx.state.user.id;
      const { orderType = 'digital' } = ctx.request.body;
      
      // Generate unique access code
      const accessCode = this.generateUniqueAccessCode();
      
      // Create test order based on type
      let orderData = {
        users_permissions_user: userId,
        status: 'completed',
        stripe_payment_id: `test_${orderType}_${Date.now()}`,
        media_status: 'fulfilled',
        access_code: accessCode,
      };
      
      switch (orderType) {
        case 'digital':
          orderData.total_amount = 20;
          orderData.dvd_count = 0;
          orderData.digital_download_count = 1;
          orderData.media_type = 'digital';
          break;
        case 'both':
          orderData.total_amount = 45;
          orderData.dvd_count = 1;
          orderData.digital_download_count = 1;
          orderData.media_type = 'both';
          break;
        case 'dvd':
          orderData.total_amount = 30;
          orderData.dvd_count = 1;
          orderData.digital_download_count = 0;
          orderData.media_type = 'dvd';
          break;
        default:
          return ctx.badRequest('Invalid order type. Use: digital, both, or dvd');
      }
      
      const order = await strapi.entityService.create('api::order.order', {
        data: orderData,
        populate: ['users_permissions_user'],
      });
      
      return ctx.send({
        message: 'Test order created successfully',
        order: {
          id: order.id,
          accessCode: order.access_code,
          mediaType: order.media_type,
          mediaStatus: order.media_status,
          totalAmount: order.total_amount,
          userEmail: order.users_permissions_user?.email,
        },
        testInstructions: {
          frontend: `Go to http://localhost:3000/watch-recital-updated and use access code: ${order.access_code}`,
          api: `curl -X POST http://localhost:1337/api/orders/validate-access-code -H "Content-Type: application/json" -d '{"accessCode":"${order.access_code}"}'`
        }
      });
    } catch (error) {
      console.error('Error creating test order:', error);
      return ctx.internalServerError('Failed to create test order');
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
