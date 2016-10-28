import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';

import PaymentPage from '../pages/PaymentPage';
import Payments from '../../api/payments/collection';

const PaymentContainer = createContainer(({ paymentId }) => {
  const paymentHandle = Meteor.subscribe('payments.single', paymentId);
  const loading = !paymentHandle.ready();
  let payment;
  if (!loading) {
    payment = Payments.findOne();
  }
  return {
    loading,
    payment,
  };
}, PaymentPage);

export default PaymentContainer;
