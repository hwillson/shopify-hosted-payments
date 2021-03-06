import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const tokenSchema = new SimpleSchema({
  email: {
    type: String,
  },
  token: {
    type: String,
  },
  paymentMethod: {
    type: String,
    optional: true,
  },
});

export default tokenSchema;
