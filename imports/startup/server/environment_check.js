// Make sure necessary environment variables are defined and available
['STRIPE_KEY'].forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Uh oh - the ${envVar} environment variable is missing!`);
  }
});
