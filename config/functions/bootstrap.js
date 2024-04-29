// const Queue = require('bull');
// const Redis = require('ioredis');
// const { createPDF } = require('../../src/services/pdfService');

// module.exports = async () => {
//   const redisConfig = {
//     // You can also configure these using environment variables
//     host: process.env.REDIS_HOST || '127.0.0.1',
//     port: process.env.REDIS_PORT || 6379,
//     password: process.env.REDIS_PASSWORD || '',
//     // If using Redis 6 or above with user-based authentication
//     username: process.env.REDIS_USERNAME || 'default'
//   };

//   const redis = new Redis(redisConfig);
//   const pdfQueue = new Queue('pdf-generation', { redis });

//   console.log(redis, 'redis');
//   console.log(pdfQueue, 'pdfQueue');

//   pdfQueue.process(async (job) => {
//     // Define what happens when a job is processed
//     const { data } = job;
//     // Your PDF generation logic here
//     console.log('Processing job:', data);
//   });

//   // Optionally, save the queue in the Strapi global to access it elsewhere
//   strapi.services.pdfQueue = pdfQueue;

//   // Clean up on shutdown
//   strapi.app.on('close', async () => {
//     await pdfQueue.close();
//     await redis.quit();
//   });
//   pdfQueue.process(async (job) => {
//     const { htmlContent, userEmail, firstName, amount, seatList } = job.data;
//     try {
//       const pdfBuffer = await createPDF(htmlContent);

//       // Sending email with PDF attachment using Strapi's email plugin
//       await strapi.plugins['email'].services.email.send({
//         to: userEmail,
//         subject: 'Thanks for purchasing tickets for Reverence Studios Recital',
//         text: `Thank you ${firstName} for purchasing tickets and DVDs for the 2024 Reverence Recital! Your total paid is $${amount}. Here are your seats: ${seatList}.`,
//         attachments: [
//           {
//             // Attachment object
//             filename: 'ticket.pdf',
//             content: pdfBuffer,
//             contentType: 'application/pdf'
//           }
//         ]
//       });

//       console.log('PDF generated and emailed successfully.');
//     } catch (error) {
//       console.error('Error processing PDF job:', error);
//     }
//   });
// };
