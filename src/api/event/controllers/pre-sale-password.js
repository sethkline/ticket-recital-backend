module.exports = {
  async checkPasscode(ctx) {
    const { id, passcode } = ctx.request.body;

    try {
      const event = await strapi.entityService.findOne('api::event.event', id, {
        fields: ['early_access_passcode']
      });

      if (!event) {
        return ctx.notFound('Event not found.');
      }

      if (event.pre_sale_passcode === passcode) {
        return ctx.send({ valid: true });
      } else {
        return ctx.send({ valid: false }, 401); // Unauthorized if passcode does not match
      }
    } catch (err) {
      return ctx.badImplementation('Error verifying passcode.');
    }
  }
};
