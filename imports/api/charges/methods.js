import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import StripeKeys from '../environment/stripe_keys';

const createCharge = new ValidatedMethod({
  name: 'charges.createCharge',
  validate: new SimpleSchema({
    tokenId: {
      type: String,
    },
  }).validator(),
  run({ tokenId }) {
    if (!this.isSimulation) {
      const stripe = require('stripe')(StripeKeys.private);
      stripe.charges.create({
        amount: 1000,
        currency: 'usd',
        source: tokenId,
        description: 'Charge for order 123',
      }, (error, charge) => {
        console.log(error, charge);
      });
    }
  },
});

export default createCharge;
