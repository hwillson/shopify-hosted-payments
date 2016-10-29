import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const getStripePubKey = new ValidatedMethod({
  name: 'environment.getStripePubKey',
  validate: new SimpleSchema({
    testMode: {
      type: Boolean,
    },
  }).validator(),
  run({ testMode }) {
    let stripePubKey;
    if (!this.isSimulation) {
      import StripeKeys from './server/stripe_keys';
      stripePubKey = (testMode) ? StripeKeys.testPublic : StripeKeys.livePublic;
    }
    return stripePubKey;
  },
});

export default getStripePubKey;
