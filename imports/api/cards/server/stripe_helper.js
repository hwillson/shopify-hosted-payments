import { Meteor } from 'meteor/meteor';

import StripeKeys from '../../environment/server/stripe_keys';

const StripeHelper = {
  updateCard({ customerId, tokenId }) {
    let customer;
    if (customerId && tokenId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeCustomersUpdateSync =
        Meteor.wrapAsync(stripe.customers.update, stripe.customers);
      customer = stripeCustomersUpdateSync(customerId, {
        source: tokenId,
      });
    }
    return customer;
  },

  chargeCard({ customerId, amount, description }) {
    let charge;
    if (customerId && amount) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeChargesCreateSync =
        Meteor.wrapAsync(stripe.charges.create, stripe.charges);
      charge = stripeChargesCreateSync({
        customer: customerId,
        amount: parseInt(amount, 10),
        currency: 'usd',
        description,
      });
    }
    return charge;
  },

  createCustomer({ email, tokenId }) {
    let stripeCustomer;
    if (email && tokenId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeCustomersCreateSync =
        Meteor.wrapAsync(stripe.customers.create, stripe.customers);
      stripeCustomer = stripeCustomersCreateSync({
        email,
        source: tokenId,
      });
    }
    return stripeCustomer;
  },
};

export default StripeHelper;
