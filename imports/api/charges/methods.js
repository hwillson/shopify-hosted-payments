import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const createCharge = new ValidatedMethod({
  name: 'charges.createCharge',
  validate: new SimpleSchema({
    tokenId: {
      type: String,
    },
  }).validator(),
  run({ tokenId }) {
    if (!this.isSimluation) {
      import stripe from 'stripe';

      console.log(stripe);

      // stripe.charges.create({
      //   amount: 2000,
      //   currency: "usd",
      //   source: "tok_9R6muwB4ojVyZB", // obtained with Stripe.js
      //   description: "Charge for avery.martinez@example.com"
      // }, function(err, charge) {
      //   // asynchronously called
      // });
    }
  },
});

export default createCharge;
