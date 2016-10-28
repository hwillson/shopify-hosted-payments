import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import StripeKeys from '../environment/stripe_keys';
import Payments from './collection';

const makePayment = new ValidatedMethod({
  name: 'payments.makePayment',

  validate: new SimpleSchema({
    tokenId: {
      type: String,
    },
    payment: {
      type: Object,
      blackbox: true,
    },
  }).validator(),

  run({ tokenId, payment }) {
    let queryString;
    if (!this.isSimulation) {
      const stripe = require('stripe')(StripeKeys.private);
      const stripeChargesCreateSync =
        Meteor.wrapAsync(stripe.charges.create, stripe.charges);
      try {
        const charge = stripeChargesCreateSync({
          amount: payment.x_amount * 100,
          currency: 'usd',
          source: tokenId,
          description: `Charge for ${payment.x_description}`,
        });
        Payments.update(
          { _id: payment._id },
          { $set: { status: 'completed', charge, error: null } }
        );
        import ShopifyResponse from '../shopify/server/shopify_response';
        const shopifyResponse = Object.create(ShopifyResponse);
        shopifyResponse.init(payment);
        return shopifyResponse.queryString();
      } catch (error) {
        Payments.update(
          { _id: payment._id },
          { $set: { status: 'failed', error, charge: null } }
        );
        throw new Meteor.Error(
          'payments.makePayment.failed',
          'Unable to create Stripe charge',
        );
      }
    }
    return queryString;
  },
});

export default makePayment;
