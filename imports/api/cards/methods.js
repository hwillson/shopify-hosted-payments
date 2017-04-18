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

      if (!customerMetadata || !customerMetadata.stripe.stripeCustomerId) {
        throw new Meteor.Error(
          `Can't find Stripe customer ID for Shopify customer ${shopifyCustomer.id}`
        );
      }

      // Update the customers credit card
      import StripeHelper from './server/stripe_helper';
      const customerData = StripeHelper.updateCard({
        customerId: customerMetadata.stripe.stripeCustomerId,
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
        // Resume subscription in MorePlease, setting it to renew tomorrow
        import Subscription from '../subscriptions/server/subscription';
        Subscription.resume(customerMetadata.subscriptionId);
      }
    }
  },
});

export default updateCard;
