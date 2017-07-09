import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const updateCard = new ValidatedMethod({
  name: 'cards.update',
  validate: new SimpleSchema({
    tokenId: { type: String },
    email: { type: String },
  }).validator(),
  run({ tokenId, email }) {
    if (!this.isSimulation) {
      // First find the matching Shopify customer record, by email
      import ShopifyCustomerApi from '../shopify/server/shopify_customer_api';
      const shopifyCustomer = ShopifyCustomerApi.findCustomer(email);

      if (!shopifyCustomer) {
        throw new Meteor.Error(
          `Can't find matching Shopify customer record with email ${email}`
        );
      }

      // Find the customer's Stripe ID
      const customerMetadata =
        ShopifyCustomerApi.getCustomerMetadata(shopifyCustomer.id);
      let customerStripeId;

      import StripeHelper from './server/stripe_helper';

      if (customerMetadata && customerMetadata.stripe
          && customerMetadata.stripe.stripeCustomerId) {
        customerStripeId = customerMetadata.stripe.stripeCustomerId;
      } else {
        // If the customers Stripe ID can't be pulled from Shopify, try to
        // get it from Stripe.
        customerStripeId = StripeHelper.findCustomerId(email);
      }

      // Update the customers credit card
      const customerData = StripeHelper.updateCard({
        customerId: customerStripeId,
        tokenId,
      });

      // Send new card details back to Shopify
      ShopifyCustomerApi.updateMetafield({
        customerId: shopifyCustomer.id,
        namespace: 'stripe',
        key: 'customer',
        value: JSON.stringify(customerData.primaryCard),
        valueType: 'string',
      });

      if (customerMetadata.subscriptionId) {
        // Resume the subscription in MorePlease (if the last payment failed),
        // by retrying payment and creating a new renewal order.
        import Subscription from '../subscriptions/server/subscription';
        Subscription.resume(customerMetadata.subscriptionId);
      }
    }
  },
});

export default updateCard;
