module.exports = ({ env }) => ({
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY'),
      domain: env('MAILGUN_DOMAIN')
    },
    settings: {
      defaultFrom: 'kirsten@reverencestudios.com',
      defaultReplyTo: 'kirsten@reverencestudios.com'
    }
  }
});
