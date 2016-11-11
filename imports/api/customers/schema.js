import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const CustomerSchema = new SimpleSchema({
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
  },
  stripeCustomerId: {
    type: String,
  },
});

export default CustomerSchema;
