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
      const customerDetails = {
        email: payment.x_customer_email
          ? payment.x_customer_email
          : payment.email,
      };
      if (payment.x_customer_first_name || payment.customer) {
        customerDetails.firstName =
          payment.x_customer_first_name
            ? payment.x_customer_first_name
            : payment.customer.first_name;
      }
      if (payment.x_customer_last_name || payment.customer) {
        customerDetails.lastName =
          payment.x_customer_last_name
            ? payment.x_customer_last_name
            : payment.customer.last_name;
      }

      // Create the customer in stripe assigning them the referenced
      // credit card, then save their details in the local customers collection.
      // If matching customer already exists in Stripe, update that
      // customers payment method.
      const stripeCustomer = StripeHelper.createCustomer({
        email: customerDetails.email,
        tokenId: payment.stripe_token,
      });
      stripeCustomerId = stripeCustomer.id;

      // We're removing then inserting customers (instead of upserting) to fix
      // an old bug that allowed multiple similar customer to be saved in the
      // DB.
      CustomersCollection.remove({ email: customerDetails.email });
      CustomersCollection.insert({
        firstName: customerDetails.firstName,
        lastName: customerDetails.lastName,
        email: customerDetails.email,
        stripeCustomerId,
      });
    }

    const chargeDetails = {
      amount: payment.x_amount ? payment.x_amount : +payment.total_price,
      description: payment.x_description
        ? `Charge for ${payment.x_description}`
        : `Charge for subscription order #${payment.id}`,
    };

    charge = StripeHelper.chargeCard({
      customerId: stripeCustomerId,
      amount: chargeDetails.amount,
      description: chargeDetails.description,
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
