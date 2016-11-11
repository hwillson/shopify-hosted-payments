import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import CustomerSchema from './schema';
import StripeKeys from '../environment/server/stripe_keys';

const CustomersCollection = new Mongo.Collection('customers');
CustomersCollection.attachSchema(CustomerSchema);

CustomersCollection.findAndChargeCustomer = (payment) => {
  let charge;
  if (payment) {
    const stripe = require('stripe')(
      (payment.x_test === 'true')
        ? StripeKeys.testSecret
        : StripeKeys.liveSecret
    );

    let stripeCustomerId;
    const customer =
      CustomersCollection.findOne({ email: payment.x_customer_email });
    if (!customer) {
      const stripeCustomersCreateSync =
        Meteor.wrapAsync(stripe.customers.create, stripe.customers);
      let stripeCustomer;
      try {
        stripeCustomer = stripeCustomersCreateSync({
          card: payment.token,
          email: payment.x_customer_email,
        });
      } catch (error) {
        throw error;
      }
      stripeCustomerId = stripeCustomer.id;
      CustomersCollection.insert({
        firstName: payment.x_customer_first_name,
        lastName: payment.x_customer_last_name,
        email: payment.x_customer_email,
        stripeCustomerId,
      });
    } else {
      stripeCustomerId = customer.stripeCustomerId;
    }

    const stripeChargesCreateSync =
      Meteor.wrapAsync(stripe.charges.create, stripe.charges);
    charge = stripeChargesCreateSync({
      amount: parseInt(payment.x_amount * 100, 10),
      currency: 'usd',
      customer: stripeCustomerId,
      description: `Charge for ${payment.x_description}`,
    });
  }
  return charge;
};

CustomersCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default CustomersCollection;
