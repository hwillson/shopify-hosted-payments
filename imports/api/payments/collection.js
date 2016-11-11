import { Mongo } from 'meteor/mongo';

const Payments = new Mongo.Collection('payments');

Payments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default Payments;
