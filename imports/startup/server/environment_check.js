// Make sure necessary environment variables are defined and available
const mandatoryEnvVars = [
  'STRIPE_TEST_PUB_KEY',
  'STRIPE_TEST_SECRET_KEY',
  'STRIPE_LIVE_PUB_KEY',
  'STRIPE_LIVE_SECRET_KEY',
  'SHOPIFY_HMAC_KEY',
];
mandatoryEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Uh oh - the ${envVar} environment variable is missing!`);
  }
});
