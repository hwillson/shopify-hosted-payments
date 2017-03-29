import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const tokenSchema = new SimpleSchema({
  email: {
    type: String,
  },
  token: {
    type: String,
  },
});

export default tokenSchema;
