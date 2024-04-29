'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
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
    const generateTicket = async ({date, time, row, seat, backgroundImage,}) => {
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

    const templateDataCombined = [
      templateData,
      templateData2,
      templateData3,
    ]

    // const pdfBuffers = []

    const htmlContent1 = await generateTicket(templateData);
    const htmlContent2 = await generateTicket(templateData2);
    const htmlContent3 = await generateTicket(templateData3);


    const htmlCombined = [
      htmlContent1,
      htmlContent2,
      htmlContent3
    ]

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
    }


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
  }
}));
