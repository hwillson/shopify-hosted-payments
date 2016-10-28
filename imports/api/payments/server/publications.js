/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import Payments from '../collection.js';

Meteor.publish('payments.single', function paymentsSingle(paymentId) {
  check(paymentId, String);
  return Payments.find({ _id: paymentId });
});
