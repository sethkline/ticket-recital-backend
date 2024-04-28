'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const bcrypt = require('bcryptjs');

module.exports = createCoreController('api::early-access-phrase.early-access-phrase', ({ strapi }) => ({
  async verifyPassphrase(ctx) {
    const { type, passphrase } = ctx.request.body;

    if (!type || !passphrase) {
      return ctx.send({ message: 'Type and passphrase are required.' }, 400);
    }

    // Fetch the single entry of early-access-phrase
    const earlyAccessPhrase = await strapi.entityService.findOne('api::early-access-phrase.early-access-phrase', {});

    if (!earlyAccessPhrase) {
      return ctx.send({ message: 'No passphrase data found in the database.', accessGranted: false }, 404);
    }

    const storedPassphrase = earlyAccessPhrase[type];
    console.log('Stored passphrase for type', type + ':', storedPassphrase); // Log the specific stored passphrase

    if (!storedPassphrase) {
      return ctx.send({ message: `Passphrase for ${type} not available.`, accessGranted: false }, 404);
    }

    // Check if the entered passphrase matches the stored one
    try {
      const isMatch = await bcrypt.compare(passphrase, storedPassphrase);
      if (isMatch) {
        return ctx.send({ message: 'Passphrase is correct.', accessGranted: true });
      } else {
        return ctx.send({ message: 'Incorrect passphrase.', accessGranted: false }, 401);
      }
    } catch (error) {
      console.error('Error comparing passphrases:', error);
      return ctx.send({ message: 'Error processing your request.', accessGranted: false }, 500);
    }
  },
}));
