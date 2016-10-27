import { ValidatedMethod } from 'meteor/mdg:validated-method';
import StripeKeys from './stripe_keys';

const getStripeKey = new ValidatedMethod({
  name: 'environment.getStripeKey',
  validate: null,
  run() {
    let stripeKey;
    if (!this.isSimulation) {
      stripeKey = StripeKeys.public;
    }
    return stripeKey;
  },
});

export default getStripeKey;
