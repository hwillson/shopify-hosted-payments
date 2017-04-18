import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

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

      if (customer) {
        let defaultCard = customer.sources.data.map((card) => {
          let matchingCard;
          if (card.id === customer.default_source) {
            matchingCard = card;
          }
          return matchingCard;
        });
        defaultCard = defaultCard[0];
        customer.primaryCard = {
          stripeCustomerId: customer.id,
          cardType: defaultCard.brand,
          cardExpYear: defaultCard.exp_year,
          cardExpMonth: defaultCard.exp_month,
          cardLast4: defaultCard.last4,
        };
      }
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

    // First see if a matching customer already exists
    const customerId = this.findCustomerId(email);
    if (customerId) {
      stripeCustomer = this.updateCard({ customerId, tokenId });
    } else {
      // Otherwise create a new customer
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

  findCustomerId(email) {
    let stripeCustomerId;
    if (email) {
      const response = HTTP.get('https://api.stripe.com/v1/search', {
        params: {
          query: email,
          type: 'customers',
          count: 1,
        },
        headers: {
          authorization: `Bearer ${StripeKeys.secret}`,
        },
      });
      if (response.data && response.data.data.length > 0) {
        stripeCustomerId = response.data.data[0].id;
      }
    }
    return stripeCustomerId;
  },

  refundCharge(chargeId) {
    if (chargeId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeRefundsCreateSync =
        Meteor.wrapAsync(stripe.refunds.create, stripe.refunds);
      stripeRefundsCreateSync({
        charge: chargeId,
      });
    }
  },
};

export default StripeHelper;
