import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const TokenSchema = new SimpleSchema({
  checkoutUrl: {
    type: String,
  },
  token: {
    type: String,
  },
});

export default TokenSchema;
