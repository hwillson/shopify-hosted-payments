import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import shopifyOrderApi from '../shopify/server/shopify_order_api';

const updateCard = new ValidatedMethod({
  name: 'cards.update',
  validate: new SimpleSchema({
    tokenId: { type: String },
    email: { type: String },
  }).validator(),
  run({ tokenId, email }) {
    if (!this.isSimulation) {
      import bugsnag from '../bugsnag/server/bugsnag';

      // First find the matching Shopify customer record, by email
      import ShopifyCustomerApi from '../shopify/server/shopify_customer_api';
      const shopifyCustomer = ShopifyCustomerApi.findCustomer(email);

      if (!shopifyCustomer) {
        const error = new Meteor.Error(
          "Credit card update: Can't find matching Shopify customer " +
          `record with email ${email}`
        );
        bugsnag.notify(error);
        throw error;
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

      let stripeCustomer;
      if (customerStripeId) {
        // Update the customers credit card
        stripeCustomer = StripeHelper.updateCard({
          customerId: customerStripeId,
          tokenId,
        });
      } else {
        // If a matching customer can't be found in Stripe, create a new
        // account, and add the credit card to that account.
        stripeCustomer = StripeHelper.createCustomerWithCard({ email, tokenId });
        const error = new Error(
          "Credit card update: Couldn't find a matching customer in " +
          'Stripe, so created a new customer account in Stripe and ' +
          'updated the credit card on that account. '
        );
        bugsnag.notify(error, { stripeCustomer });
      }

      // Send new card details back to Shopify
      ShopifyCustomerApi.updateMetafield({
        customerId: shopifyCustomer.id,
        namespace: 'stripe',
        key: 'customer',
        value: JSON.stringify(stripeCustomer.primaryCard),
        valueType: 'string',
      });

      // If the customer has a recently failed subscription order, get the
      // amount, charge for it in Stripe, and if successful mark the order
      // as paid in Shopify.
      const pendingOrder =
        shopifyOrderApi.getCustomerPendingOrder(shopifyCustomer.id);
      if (pendingOrder) {
        try {
          StripeHelper.chargeCard({
            customerId: stripeCustomer.stripeCustomerId,
            amount: pendingOrder.total_price * 100,
            description:
              `Re-trying failed charge for order ID ${pendingOrder.id} ` +
              '(thefeed.com)',
          });

          shopifyOrderApi.markOrderAsPaid({
            orderId: pendingOrder.id,
            totalPrice: pendingOrder.totalPrice,
          });
        } catch (error) {
          bugsnag.notify(error);
        }
      }

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
