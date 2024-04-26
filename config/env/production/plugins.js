module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'mailgun',
      providerOptions: {
        apiKey: env('MAILGUN_API_KEY'),
        domain: env('MAILGUN_DOMAIN')
      },
      settings: {
        defaultFrom: env('MAIL_FROM_ADDRESS'),
        defaultReplyTo: env('MAIL_REPLY_TO_ADDRESS'),
      }
    }
  }
});
