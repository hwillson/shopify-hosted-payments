import { Mongo } from 'meteor/mongo';

import CustomerSchema from './schema';
import StripeHelper from '../cards/server/stripe_helper';

const CustomersCollection = new Mongo.Collection('customers');
CustomersCollection.attachSchema(CustomerSchema);

CustomersCollection.chargeCustomer = (payment) => {
  let charge;
  if (payment) {
    let stripeCustomerId;

    if (payment.stripe_customer_id) {
      // If a stripe customer ID is supplied with the payment request,
      // charge that customer.
      stripeCustomerId = payment.stripe_customer_id;
    } else {
      // First create the customer in stripe assigning them the referenced
      // credit card, the save their details in the local customers collection.
      const stripeCustomer = StripeHelper.createCustomer({
        email: payment.x_customer_email,
        tokenId: payment.stripe_token,
      });
      stripeCustomerId = stripeCustomer.id;
      CustomersCollection.insert({
        firstName: payment.x_customer_first_name,
        lastName: payment.x_customer_last_name,
        email: payment.x_customer_email,
        stripeCustomerId,
      });
    }

    charge = StripeHelper.chargeCard({
      customerId: stripeCustomerId,
      amount: payment.x_amount * 100,
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
