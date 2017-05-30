import { Mongo } from 'meteor/mongo';

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

Payments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default Payments;
