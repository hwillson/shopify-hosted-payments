const StripeKeys = {
  testPublic: process.env.STRIPE_TEST_PUB_KEY,
  testSecret: process.env.STRIPE_TEST_SECRET_KEY,
  livePublic: process.env.STRIPE_LIVE_PUB_KEY,
  liveSecret: process.env.STRIPE_LIVE_SECRET_KEY,
};

export default StripeKeys;
