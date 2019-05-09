import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import StripeKeys from '../../environment/server/stripe_keys';

const StripeHelper = {
  updateCard({ customerId, tokenId }) {
    let customer;
    if (customerId && tokenId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeCustomersUpdateSync = Meteor.wrapAsync(
        stripe.customers.update,
        stripe.customers
      );
      customer = stripeCustomersUpdateSync(customerId, {
        source: tokenId
      });

      if (customer) {
        const defaultCard = customer.sources.data.filter(
          card => card.id === customer.default_source
        )[0];
        customer.primaryCard = {
          stripeCustomerId: customer.id,
          cardType: defaultCard.brand,
          cardExpYear: defaultCard.exp_year,
          cardExpMonth: defaultCard.exp_month,
          cardLast4: defaultCard.last4
        };
      }
    }
    return customer;
  },

  chargeCard({ customerId, amount, description }) {
    let charge;
    if (customerId && amount) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeChargesCreateSync = Meteor.wrapAsync(
        stripe.charges.create,
        stripe.charges
      );
      charge = stripeChargesCreateSync({
        customer: customerId,
        amount: parseInt(amount, 10),
        currency: 'usd',
        description
      });
    }
    return charge;
  },

  createCustomer({ email, tokenId }) {
    let stripeCustomer;
    const stripe = require('stripe')(StripeKeys.secret);
    const stripeCustomersCreateSync = Meteor.wrapAsync(
      stripe.customers.create,
      stripe.customers
    );
    stripeCustomer = stripeCustomersCreateSync({
      email,
      source: tokenId
    });
    return stripeCustomer;
  },

  createCustomerWithCard({ email, tokenId }) {
    const stripe = require('stripe')(StripeKeys.secret);
    const stripeCustomersCreateSync = Meteor.wrapAsync(
      stripe.customers.create,
      stripe.customers
    );
    const stripeCustomer = stripeCustomersCreateSync({
      email,
      source: tokenId
    });
    if (stripeCustomer) {
      const defaultCard = stripeCustomer.sources.data.filter(
        card => card.id === stripeCustomer.default_source
      )[0];
      stripeCustomer.primaryCard = {
        stripeCustomerId: stripeCustomer.id,
        cardType: defaultCard.brand,
        cardExpYear: defaultCard.exp_year,
        cardExpMonth: defaultCard.exp_month,
        cardLast4: defaultCard.last4
      };
    }
    return stripeCustomer;
  },

  refundCharge(chargeId) {
    if (chargeId) {
      const stripe = require('stripe')(StripeKeys.secret);
      const stripeRefundsCreateSync = Meteor.wrapAsync(
        stripe.refunds.create,
        stripe.refunds
      );
      stripeRefundsCreateSync({
        charge: chargeId
      });
    }
  }
};

export default StripeHelper;
