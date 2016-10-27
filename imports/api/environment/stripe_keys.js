const StripeKeys = {
  public: process.env.STRIPE_PUB_KEY,
  private: process.env.STRIPE_SECRET_KEY,
};

export default StripeKeys;
