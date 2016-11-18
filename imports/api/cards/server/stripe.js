import { Meteor } from 'meteor/meteor';

import StripeKeys from '../../environment/server/stripe_keys';

const Stripe = {
  updateCard({ customerId, tokenId, testMode }) {
    if (customerId && tokenId) {
      const stripe = require('stripe')(
        (testMode)
          ? StripeKeys.testSecret
          : StripeKeys.liveSecret
      );
      const stripeCustomersUpdateSync =
        Meteor.wrapAsync(stripe.customers.update, stripe.customers);
      stripeCustomersUpdateSync(customerId, {
        source: tokenId,
      });
    }
  },
};

export default Stripe;
