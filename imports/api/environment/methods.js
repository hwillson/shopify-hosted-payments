import { ValidatedMethod } from 'meteor/mdg:validated-method';

const getStripePubKey = new ValidatedMethod({
  name: 'environment.getStripePubKey',
  validate: null,
  run() {
    let stripePubKey;
    if (!this.isSimulation) {
      import StripeKeys from './server/stripe_keys';
      stripePubKey = StripeKeys.public;
    }
    return stripePubKey;
  },
});

export default getStripePubKey;
