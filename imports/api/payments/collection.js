import { Mongo } from 'meteor/mongo';

const Payments = new Mongo.Collection('payments');

export default Payments;
