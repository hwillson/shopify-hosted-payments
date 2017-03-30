import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const CustomerSchema = new SimpleSchema({
  firstName: {
    type: String,
    optional: true,
  },
  lastName: {
    type: String,
    optional: true,
  },
  email: {
    type: String,
  },
  stripeCustomerId: {
    type: String,
  },
  shopifyCustomerId: {
    type: Number,
    optional: true,
  },
});

export default CustomerSchema;
