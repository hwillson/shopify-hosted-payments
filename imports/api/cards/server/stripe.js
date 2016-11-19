import { Meteor } from 'meteor/meteor';

import StripeKeys from '../../environment/server/stripe_keys';

const Stripe = {
  updateCard({ customerId, tokenId }) {
    if (customerId && tokenId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeCustomersUpdateSync =
        Meteor.wrapAsync(stripe.customers.update, stripe.customers);
      stripeCustomersUpdateSync(customerId, {
        source: tokenId,
      });
    }
  },

  chargeCard({ customerId, amount }) {
    if (customerId && amount) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeChargesCreateSync =
        Meteor.wrapAsync(stripe.charges.create, stripe.charges);
      stripeChargesCreateSync({
        customer: customerId,
        amount: parseInt(amount, 10),
        currency: 'usd',
        description: 'Charge for thefeed.com subscription renewal.',
      });
    }
  },
};

export default Stripe;
