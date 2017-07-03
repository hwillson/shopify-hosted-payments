import { Mongo } from 'meteor/mongo';
import moment from 'moment';

const Payments = new Mongo.Collection('payments');

Payments.refund = (orderId) => {
  if (orderId) {
    const payment = Payments.findOne({ order_id: orderId });
    if (payment && payment.charge.id) {
      import StripeHelper from '../cards/server/stripe_helper';
      StripeHelper.refundCharge(payment.charge.id);
    }
  }
};

Payments.recentPaymentCompleted = email => Payments.findOne({
  email,
  status: 'completed',
  timestamp: {
    $gte: moment().subtract(10, 'minutes').toDate(),
  },
});

Payments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default Payments;
