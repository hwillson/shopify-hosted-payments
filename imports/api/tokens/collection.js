import { Mongo } from 'meteor/mongo';

import TokenSchema from './schema';

const Tokens = new Mongo.Collection('tokens');
Tokens.attachSchema(TokenSchema);

export default Tokens;
