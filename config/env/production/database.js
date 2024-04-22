const parse = require("pg-connection-string").parse;

// Fallback to empty string to prevent errors if not set
const connectionString = process.env.DATABASE_URL || "";

// Parse the connection string
const config = parse(connectionString);

if (!config.host || !config.user) {
  console.error('Invalid or missing DATABASE_URL');
  process.exit(1); // Exit if essential details are missing
}

module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    debug: false,
  },
});
