/* global window, StripeCheckout */

import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { StyleSheet, css } from 'aphrodite';

import getStripeKey from '../../api/environment/methods';
import Logo from '../components/Logo';

let styles;

class PaymentLayout extends Component {
  componentDidMount() {
    getStripeKey.call((error, stripeKey) => {
      this.initializeStripeCheckout(stripeKey);
    });
  }

  componentWillUnmount() {
    this.stripeHandler.close();
  }

  initializeStripeCheckout(stripeKey) {
    this.stripeHandler = StripeCheckout.configure({
      key: stripeKey,
      locale: 'auto',
      token(token) {
        // You can access the token ID with `token.id`.
        // Get the token ID to your server-side code for use.
        console.log(`Token ID: ${token.id}`);
      },
    });

    this.stripeHandler.open({
      name: Meteor.settings.public.paymentPage.companyName,
      description: 'Paying for Widgets 1, 2 and 3.',
      email: 'test@octonary.com',
      amount: 1000,
      closed() {
        const closedRedirectUrl =
          Meteor.settings.public.paymentPage.closedRedirectUrl;
        if (closedRedirectUrl) {
          window.location.href = closedRedirectUrl;
        }
      },
    });
  }

  render() {
    return (
      <div className={css(styles.paymentLayout)}>
        <Logo logoUrl={Meteor.settings.public.paymentPage.companyLogoUrl} />
      </div>
    );
  }
}

styles = StyleSheet.create({
  paymentLayout: {
    height: '100%',
    backgroundImage:
      `url('${Meteor.settings.public.paymentPage.backgroundImageUrl}')`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  },
});

export default PaymentLayout;
