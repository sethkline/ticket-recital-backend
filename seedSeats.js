// const strapi = require(strapi);

// const seedSeats = async () => {
//   // Assuming you have defined 'event_id' somewhere or pass it as an argument
//   const eventId = 'your-event-id'; // Make sure to replace this with actual event ID
//   const sections = ['left-label', 'left-wing', 'left-main', 'center-main', 'right-main', 'right-wing', 'right-label'];
//   const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];

//   for (const section of sections) {
//     for (const row of rows) {
//       let seatsPerRow = 10; // Default value, adjust based on your layout
//       let seatNumberStart = 101; // Example starting seat number, adjust as needed
//       let exclusions = []; // Seats to exclude, if any, e.g., [1,2,3]

//       // Adjust these values based on section-specific configurations
//       if (section === 'left-wing' || section === 'right-wing') {
//         seatsPerRow = 6;
//       } else if (section.includes('main')) {
//         seatsPerRow = 14; // Adjust as per each 'main' section's requirements
//         seatNumberStart = section === 'left-main' ? 101 : section === 'center-main' ? 201 : 102;
//         exclusions = section === 'center-main' && row === 'A' ? [4,5,9,10,11] : [];
//       }

//       for (let i = 1; i <= seatsPerRow; i++) {
//         if (!exclusions.includes(i)) {
//           const seatNumber = `${row}${seatNumberStart + i - 1}`;
//           const seatData = {
//             event: eventId,
//             row,
//             number: seatNumber,
//             section,
//             is_available: true,
//           };

//           try {
//             // Use Strapi's entity service API to create the seat
//             await strapi.entityService.create('api::seat.seat', { data: seatData });
//             console.log(`Seat ${seatNumber} in section ${section}, row ${row} created successfully.`);
//           } catch (error) {
//             console.error(`Error creating seat ${seatNumber} in section ${section}, row ${row}:`, error);
//           }
//         }
//       }
//     }
//   }
// };

// seedSeats().then(() => console.log('Seeding completed!')).catch(console.error);
