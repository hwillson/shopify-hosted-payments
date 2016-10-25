import { ValidatedMethod } from 'meteor/mdg:validated-method';

const getStripeKey = new ValidatedMethod({
  name: 'environment.getStripeKey',
  validate: null,
  run() {
    let stripeKey;
    if (!this.isSimulation) {
      stripeKey = process.env.STRIPE_KEY;
    }
    return stripeKey;
  },
});

export default getStripeKey;
