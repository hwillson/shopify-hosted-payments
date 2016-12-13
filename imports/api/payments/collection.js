import { Mongo } from 'meteor/mongo';

const Payments = new Mongo.Collection('payments');

Payments.refund = (invoiceId) => {
  if (invoiceId) {
    const payment = Payments.findOne({ x_invoice: `#${invoiceId}` });
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
