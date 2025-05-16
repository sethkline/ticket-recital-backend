'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { parse } = require('json2csv');
const JSZip = require('jszip');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
const fs = require('fs');
const path = require('path'); // Require the path module
const handlebars = require('handlebars');

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async totalSales(ctx) {
    // Your existing code here
  },

  async testPDF(ctx) {
    const { userEmail } = ctx.request.body;

    const imagePath = path.join(__dirname, 'templates', 'images', 'afternoon763x256.webp');
    const generateTicket = async ({ date, time, row, seat, backgroundImage }) => {
      // Correct the path by using path.join and __dirname to ensure the correct directory
      const templatePath = path.join(__dirname, '../templates/recitalTicketTemplate.hbs');
      const template = fs.readFileSync(templatePath, 'utf-8');
      const compileTemplate = handlebars.compile(template);

      // Update the data object to include the absolute path of the image
      const htmlOutput = compileTemplate({ date, time, row, seat, backgroundImage });
      return htmlOutput;
    };

    const templateData = {
      backgroundImage: `${process.env.APP_URL}/images/afternoon763x256.webp`,
      date: '2024-05-01',
      time: '10:00 AM',
      row: 'A',
      seat: '12'
    };
    const templateData2 = {
      backgroundImage: `${process.env.APP_URL}/images/morning763x256.webp`,
      date: '2024-05-01',
      time: '10:00 AM',
      row: 'B',
      seat: '14'
    };
    const templateData3 = {
      backgroundImage: `${process.env.APP_URL}/images/afternoon763x256.webp`,
      date: '2024-05-18',
      time: '10:30 AM',
      row: 'G',
      seat: '23'
    };

    const templateDataCombined = [templateData, templateData2, templateData3];

    // const pdfBuffers = []

    const htmlContent1 = await generateTicket(templateData);
    const htmlContent2 = await generateTicket(templateData2);
    const htmlContent3 = await generateTicket(templateData3);

    const htmlCombined = [htmlContent1, htmlContent2, htmlContent3];

    const createCombinedTicketPDF = async (tickets) => {
      const htmlPromises = tickets.map(async (ticket, index) => {
        return generateTicket({
          ...ticket,
          backgroundImage: `${ticket.backgroundImage}?v=${Date.now() + index}`
        });
      });

      const ticketHtmls = await Promise.all(htmlPromises);

      const fullHtmlContent = ticketHtmls.join('<div style="page-break-after: always;"></div>');
      // Generate PDF from the full HTML content
      const pdfBuffer = await strapi.services['api::order.pdf-service'].createPDF(fullHtmlContent);
      return pdfBuffer;
    };

    const fullHtmlContent = htmlCombined.join('');

    const pdfBuffer = await strapi.services['api::order.pdf-service'].createPDF(fullHtmlContent);

    // const pdfBuffer = await createCombinedTicketPDF([
    //   templateDataCombined,
    // ])

    const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });

    const data = {
      from: process.env.MAIL_FROM_ADDRESS,
      to: userEmail,
      subject: 'Thanks for purchasing tickets for Reverence Studios Recital',
      text: 'Thanks for purchasing tickets for Reverence Studios Recital, your tickets are attached here',
      attachment: new mailgun.Attachment({ data: pdfBuffer, filename: 'ticket.pdf' })
    };

    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });

    ctx.send({ message: 'PDF generated and emailed successfully.' });
  },

  async csvReport(ctx) {
    try {
      // Fetch all orders with related users, tickets, seats, and events
      const orders = await strapi.db.query('api::order.order').findMany({
        populate: {
          users_permissions_user: true,
          tickets: {
            populate: {
              seat: true,
              event: true
            }
          }
        }
      });

      // Fetch ALL tickets, including those not associated with orders
      const allTickets = await strapi.db.query('api::ticket.ticket').findMany({
        populate: {
          seat: true,
          event: true,
          users_permissions_user: true, // Add this to get user info for manually created tickets
          order: true
        }
      });

      // Prepare data from orders
      const orderData = orders
        .map((order) => {
          return order.tickets.map((ticket) => ({
            user_id: order.users_permissions_user?.id || 'N/A',
            name: order.users_permissions_user?.first_name
              ? `${order.users_permissions_user.first_name} ${order.users_permissions_user.last_name}`
              : order.users_permissions_user?.email || 'Manual Entry',
            email: order.users_permissions_user?.email || 'N/A',
            seat_row: ticket.seat?.row || '',
            seat_number: ticket.seat?.number || '',
            recital: ticket.event?.title || '',
            recital_time: ticket.event?.time || '',
            ticket_id: ticket.id,
            order_id: order.id,
            manual_entry: false
          }));
        })
        .flat();

      // Create a set of ticket IDs that are already included from orders
      const existingTicketIds = new Set(orderData.map((item) => item.ticket_id));

      // Get tickets that are not associated with orders or have a different user than the order
      const manualTickets = allTickets
        .filter((ticket) => !ticket.order || !existingTicketIds.has(ticket.id))
        .map((ticket) => ({
          user_id: ticket.users_permissions_user?.id || 'Manual',
          name: ticket.users_permissions_user?.first_name
            ? `${ticket.users_permissions_user.first_name} ${ticket.users_permissions_user.last_name}`
            : ticket.users_permissions_user?.email || ticket.manual_name || 'Manual Entry',
          email: ticket.users_permissions_user?.email || ticket.manual_email || 'N/A',
          seat_row: ticket.seat?.row || '',
          seat_number: ticket.seat?.number || '',
          recital: ticket.event?.title || '',
          recital_time: ticket.event?.time || '',
          ticket_id: ticket.id,
          order_id: 'Manual',
          manual_entry: true
        }));

      // Combine all ticket data
      const reportData = [...orderData, ...manualTickets];

      // Separate data by recital times
      const morningRecital = reportData.filter((ticket) => ticket.recital === 'Morning Recital');
      const afternoonRecital = reportData.filter((ticket) => ticket.recital === 'Afternoon Recital');

      // Function to group data by user
      const groupByUser = (data) => {
        const grouped = data.reduce((acc, ticket) => {
          // Use a composite key that includes email to handle manual entries better
          const key =
            ticket.user_id !== 'Manual' && ticket.user_id !== 'N/A'
              ? ticket.user_id
              : `manual-${ticket.email}-${ticket.name}`;

          if (!acc[key]) {
            acc[key] = {
              user_id: ticket.user_id,
              name: ticket.name,
              email: ticket.email,
              seats: [],
              manual_entry: ticket.manual_entry
            };
          }
          // Only add the seat if it has valid data
          if (ticket.seat_number) {
            acc[key].seats.push(`${ticket.seat_row}${ticket.seat_number}`);
          }
          return acc;
        }, {});

        return Object.values(grouped).map((user) => ({
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          seats: user.seats.join(', '),
          manual_entry: user.manual_entry ? 'Yes' : 'No'
        }));
      };

      // Group data by user for each recital
      const groupedMorningRecital = groupByUser(morningRecital);
      const groupedAfternoonRecital = groupByUser(afternoonRecital);

      // Filter orders with DVDs
      const dvdOrders = orders
        .filter((order) => order.dvd_count > 0)
        .map((order) => ({
          user_id: order.users_permissions_user?.id || 'N/A',
          name: order.users_permissions_user?.first_name
            ? `${order.users_permissions_user.first_name} ${order.users_permissions_user.last_name}`
            : order.users_permissions_user?.email || 'Manual Entry',
          email: order.users_permissions_user?.email || 'N/A',
          dvd_count: order.dvd_count
        }));

      // Convert JSON to CSV
      const morningGroupedCsv = parse(groupedMorningRecital, {
        fields: ['user_id', 'name', 'email', 'seats', 'manual_entry']
      });
      const afternoonGroupedCsv = parse(groupedAfternoonRecital, {
        fields: ['user_id', 'name', 'email', 'seats', 'manual_entry']
      });
      const fullCsv = parse(reportData, {
        fields: ['user_id', 'name', 'email', 'seat_row', 'seat_number', 'recital', 'recital_time', 'manual_entry']
      });
      const dvdOrdersCsv = parse(dvdOrders, {
        fields: ['user_id', 'name', 'email', 'dvd_count']
      });

      // Create a zip file with the CSV files
      const zip = new JSZip();
      zip.file('morning_recital.csv', morningGroupedCsv);
      zip.file('afternoon_recital.csv', afternoonGroupedCsv);
      zip.file('full_list.csv', fullCsv);
      zip.file('dvd_orders.csv', dvdOrdersCsv);

      const content = await zip.generateAsync({ type: 'nodebuffer' });

      // Set headers to prompt download
      ctx.set('Content-Type', 'application/zip');
      ctx.set('Content-Disposition', 'attachment; filename=orders-reports.zip');

      // Send the zip file
      ctx.send(content);
    } catch (err) {
      ctx.throw(500, err);
    }
  },

  async sendRecitalEmails(ctx) {
    try {
      const { morningLink, afternoonLink, message, emailType } = ctx.request.body;

      // Ensure all necessary fields are provided
      if (!message || !emailType) {
        return ctx.badRequest('Message and email type are required.');
      }

      // Validate email type
      const validEmailTypes = ['morning', 'afternoon', 'both'];
      if (!validEmailTypes.includes(emailType)) {
        return ctx.badRequest('Invalid email type.');
      }

      // Validate required links based on email type
      if (emailType === 'morning' && !morningLink) {
        return ctx.badRequest('Morning link is required for morning email type.');
      }
      if (emailType === 'afternoon' && !afternoonLink) {
        return ctx.badRequest('Afternoon link is required for afternoon email type.');
      }
      if (emailType === 'both' && (!morningLink || !afternoonLink)) {
        return ctx.badRequest('Both morning and afternoon links are required for both email type.');
      }

      // Prepare email links
      const bothLinks = `${morningLink ?? ''}, ${afternoonLink ?? ''}`.trim();

      // Fetch all orders with related users and tickets
      const orders = await strapi.db.query('api::order.order').findMany({
        populate: {
          users_permissions_user: true,
          tickets: {
            populate: {
              event: true
            }
          }
        }
      });

      // Prepare data for email sending
      const emailData = prepareEmailData(orders, emailType);

      // Send emails
      await sendEmails(emailData, { morningLink, afternoonLink, bothLinks, message, emailType });

      ctx.send({ message: 'Emails sent successfully.' });
    } catch (err) {
      ctx.throw(500, err);
    }
  }
}));

// Prepare email data based on orders and email type
function prepareEmailData(orders, emailType) {
  const emailData = {};

  orders.forEach((order) => {
    const { tickets, users_permissions_user } = order;
    const userEmail = users_permissions_user.email;

    if (!emailData[userEmail]) {
      emailData[userEmail] = {
        email: userEmail,
        hasMorning: false,
        hasAfternoon: false
      };
    }

    tickets.forEach((ticket) => {
      if (ticket.event.title === 'Morning Recital') {
        emailData[userEmail].hasMorning = true;
      } else if (ticket.event.title === 'Afternoon Recital') {
        emailData[userEmail].hasAfternoon = true;
      }
    });
  });

  return Object.values(emailData).filter((user) => {
    if (emailType === 'both') return user.hasMorning || user.hasAfternoon;
    if (emailType === 'morning') return user.hasMorning;
    if (emailType === 'afternoon') return user.hasAfternoon;
  });
}

// Send emails to users
async function sendEmails(emailData, links) {
  const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  });

  const sendEmail = async (to, subject, text) => {
    const data = {
      from: process.env.MAIL_FROM_ADDRESS,
      to,
      subject,
      text
    };
    await mailgun.messages().send(data);
  };

  const emailPromises = [];

  emailData.forEach((user) => {
    let subject, text;

    if (links.emailType === 'both') {
      if (user.hasMorning && user.hasAfternoon) {
        subject = 'Recital Links';
        text = `${links.message} Here are your links to both the Morning and Afternoon Recital videos: ${links.bothLinks}`;
      } else if (user.hasMorning) {
        subject = 'Morning Recital Link';
        text = `${links.message} Here is your link to the Morning Recital video: ${links.morningLink}`;
      } else if (user.hasAfternoon) {
        subject = 'Afternoon Recital Link';
        text = `${links.message} Here is your link to the Afternoon Recital video: ${links.afternoonLink}`;
      }
    } else if (links.emailType === 'morning' && user.hasMorning) {
      subject = 'Morning Recital Link';
      text = `${links.message} Here is your link to the Morning Recital video: ${links.morningLink}`;
    } else if (links.emailType === 'afternoon' && user.hasAfternoon) {
      subject = 'Afternoon Recital Link';
      text = `${links.message} Here is your link to the Afternoon Recital video: ${links.afternoonLink}`;
    }

    if (subject && text) {
      emailPromises.push(sendEmail(user.email, subject, text));
    }
  });

  await Promise.all(emailPromises);
}
