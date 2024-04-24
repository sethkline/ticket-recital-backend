'use strict';

module.exports = {


  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log('Running bootstrap function...');
    const deleteAllSeats = async () => {
      const seats = await strapi.entityService.findMany('api::seat.seat');
      for (const seat of seats) {
        await strapi.entityService.delete('api::seat.seat', seat.id);
      }
      console.log('All seats have been deleted.');
    };

    await deleteAllSeats()

    //socket io
      const httpServer = strapi.server.httpServer;
      const io = require('socket.io')(httpServer, {
        cors: {
          origin: "http://localhost:3000", // URL of your Nuxt frontend
          methods: ["GET", "POST"]
        }
      });

      io.on('connection', (socket) => {
        console.log('a user connected', socket.id);

        socket.on('reserve-seat', async (data) => {
          // Broadcast the reservation to all clients except the one who initiated it
          socket.broadcast.emit('seat-reserved', data);
        });

        socket.on('disconnect', () => {
          console.log('user disconnected', socket.id);
        });
      });

      strapi.io = io; // Make io accessible in Strapi controllers


    // const hasData = await strapi.entityService.findMany('api::seat.seat');
    // if (hasData.length === 0) {
    //   console.log('Seeding data...');
    //   const seedSeats = async () => {
    //     const eventId = '1'; // Replace with actual event ID
    //     const sections = ['left-wing', 'left-main', 'center-main', 'right-main', 'right-wing'];
    //     const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];

    //     for (const section of sections) {
    //       for (const row of rows) {
    //         const seats = generateSeatNumbers(section, row);
    //         for (const seat of seats) {
    //           const seatData = {
    //             event: eventId,
    //             row,
    //             number: seat.number,
    //             section,
    //             is_available: true,
    //             display_order: seat.display_order
    //           };

    //           try {
    //             console.log(`Creating seat: ${seat.number} in section ${section}, row ${row}`);
    //             await strapi.entityService.create('api::seat.seat', { data: seatData });
    //             console.log(`Seat ${seat.number} in section ${section}, row ${row} created successfully.`);
    //           } catch (error) {
    //             console.error(`Error creating seat ${seat.number} in section ${section}, row ${row}:`, error);
    //           }
    //         }
    //       }
    //     }
    //   };



    //   const generateSeatNumbers = (section, row) => {
    //     let seats = [];

    //     // Helper function to generate sequence of numbers (either odd or even)
    //     const generateSequence = (start, count, step = 1, decrement = false) => {
    //       const sequence = [];
    //       for (let i = 0; i < count; i++) {
    //         const num = decrement ? start - i * step : start + i * step;
    //         sequence.push(num);
    //       }
    //       return sequence;
    //     };

    //     switch (section) {
    //       case 'left-wing':
    //         const numbersLeftWing = generateSequence(11, 6, -2);
    //         seats = numbersLeftWing.map((num, index) => ({
    //           number: `${row}${num}`,
    //           display_order: index + 1
    //         }));
    //         break;
    //       case 'right-wing':
    //         const numbersRightWing = generateSequence(2, 6, 2);
    //         seats = numbersRightWing.map((num, index) => ({
    //           number: `${row}${num}`,
    //           display_order: index + 1
    //         }));
    //         break;
    //         case 'left-main':
    //           seats = handleLeftMainSection(row);
    //           break;
    //         case 'right-main':
    //           seats = handleRightMainSection(row);
    //           break;
    //         case 'center-main':
    //           handleCenterMainSection(row);
    //           break;

    //           function generateDescendingSequence(start, count, step = -1) {
    //             // Generates a sequence of numbers, modified to support descending sequences
    //             return Array.from({ length: count }, (_, i) => start + i * step);
    //           }

    //           function handleRightMainSection(row) {
    //             const startNumber = 102; // Starting seat number for the sequence
    //             let seatNumbers = [];

    //             if (row === 'A') {
    //                 seatNumbers = [102, 104]; // Specific setup for Row A
    //             } else if (row === 'V') {
    //                 seatNumbers = generateSequence(102, 11, 2); // Special setup for Row V
    //             } else {
    //                 let rowLetterIndex = row.charCodeAt(0) - 'B'.charCodeAt(0) + 1; // Start from row B
    //                 if (row >= 'B' && row < 'L') {
    //                     // Adjust index for rows after 'I'
    //                     if (row > 'I') {
    //                         rowLetterIndex -= 1; // Decrease index by 1 to account for skipped row 'I'
    //                     }
    //                     const numberOfSeats = 5 + rowLetterIndex - 1; // Row B starts with 5 seats (102 to 110)
    //                     seatNumbers = generateSequence(startNumber, numberOfSeats, 2);
    //                 } else if (row >= 'L' && row <= 'U') {
    //                     // Rows L to U should only go up to 128
    //                     seatNumbers = generateSequence(startNumber, (128 - 102) / 2 + 1, 2); // Generate seats from 102 to 128
    //                 }
    //             }

    //             return seatNumbers.map((num, index) => ({
    //                 number: `${row}${num}`,
    //                 display_order: index + 1
    //             }));
    //         }

    //         function generateSequence(start, count, step = 1) {
    //             const sequence = [];
    //             for (let i = 0; i < count; i++) {
    //                 sequence.push(start + i * step);
    //             }
    //             return sequence;
    //         }



    //           function handleLeftMainSection(row) {
    //             let seatNumbers = [];

    //             if (row === 'A') {
    //               seatNumbers = [103, 101];
    //             } else if (row === 'B') {
    //               seatNumbers = Array.from({ length: 5 }, (_, index) => 109 - 2 * index);
    //             } else if (row >= 'C' && row < 'I') {  // Use '<' to skip 'I'
    //               const startNumber = 111 + 2 * (row.charCodeAt(0) - 'C'.charCodeAt(0));
    //               seatNumbers = [startNumber, ...Array.from({ length: ((startNumber - 101) / 2) }, (_, index) => startNumber - 2 * (index + 1))];
    //             } else if (row > 'I' && row <= 'L') { // Start adjusting from 'J'
    //               const offset = row.charCodeAt(0) - 'C'.charCodeAt(0) - 1; // Subtract 1 more due to skipping 'I'
    //               const startNumber = 111 + 2 * offset;
    //               seatNumbers = [startNumber, ...Array.from({ length: ((startNumber - 101) / 2) }, (_, index) => startNumber - 2 * (index + 1))];
    //             } else if (row >= 'L' && row <= 'U') {
    //               // Same sequence from 127 to 101
    //               seatNumbers = Array.from({ length: 14 }, (_, index) => 127 - 2 * index);
    //             } else if (row === 'V') {
    //               // Special case for row V
    //               seatNumbers = Array.from({ length: 11 }, (_, index) => 121 - 2 * index);
    //             }

    //             return seatNumbers.map((num, index) => ({
    //               number: `${row}${num}`,
    //               display_order: index + 1
    //             }));
    //           }





    //           function handleCenterMainSection(row) {
    //             let seatNumbers = [];
    //             if (row === 'A') {
    //               // Directly assign seat numbers for row A
    //               seatNumbers = [207, 206, 205, 204, 203, 202, 201];
    //             } else if (row === 'V') {
    //               // Generate seat numbers from 211 to 201 for row V
    //               seatNumbers = generateDescendingSequence(211, 11)
    //             } else {
    //               // For rows B to U, assuming 14 seats per row starting from 214 to 201
    //               seatNumbers = generateDescendingSequence(214, 14);
    //             }

    //             // Map seat numbers to include display_order starting from 1
    //             seats = seatNumbers.map((num, index) => ({
    //               number: `${row}${num}`,
    //               display_order: index + 1
    //             }));
    //           }
    //         };

    //       return seats;
    //   };


    //   // Your seeding logic here
    //   // This is where you would call your seed function or include its logic directly
    //   seedSeats().then(() => console.log('Seeding completed!')).catch(console.error);

    //   console.log('Seeding completed!');
    // } else {
    //   console.log('Data already exists, skipping seeding.');
    // }
  },
};
