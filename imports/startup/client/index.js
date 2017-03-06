/* global document */

import { render } from 'react-dom';

import renderRoutes from './routes';

render(renderRoutes(), document.getElementById('app'));

/*
import React from 'react';
import { render } from 'react-dom';
import { Meteor } from 'meteor/meteor';

import PaymentContainer from '../../ui/containers/PaymentContainer';

// If a payment ID is passed in, render the payment page, otherwise
// redirect to the stores homepage.
const paymentId = window.location.search.replace('?id=', '');
if (paymentId) {
  render(
    <PaymentContainer paymentId={paymentId} />,
    document.getElementById('app')
  );
} else {
  window.location.replace(Meteor.settings.public.paymentPage.siteUrl);
}
*/
