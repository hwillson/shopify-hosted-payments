import { Mongo } from 'meteor/mongo';

import tokenSchema from './schema';

const tokensCollection = new Mongo.Collection('tokens');
tokensCollection.attachSchema(tokenSchema);

tokensCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default tokensCollection;
