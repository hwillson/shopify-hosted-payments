// Make sure necessary environment variables are defined and available
const mandatoryEnvVars = [
  'STRIPE_PUB_KEY',
  'STRIPE_SECRET_KEY',
  'SHOPIFY_HMAC_KEY',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_PASS',
  'MP_API_KEY',
];
mandatoryEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Uh oh - the ${envVar} environment variable is missing!`);
  }
});
