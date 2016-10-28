/* global window, StripeCheckout */

import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { StyleSheet, css } from 'aphrodite';

import getStripeKey from '../../api/environment/methods';
import makePayment from '../../api/payments/methods';
import Logo from '../components/Logo';

let styles;

class PaymentPage extends Component {
  componentWillReceiveProps(newProps) {
    if (!newProps.loading) {
      getStripeKey.call((error, stripeKey) => {
        this.initializeStripeCheckout(stripeKey);
      });
    }
  }

  componentWillUnmount() {
    this.stripeHandler.close();
  }

  initializeStripeCheckout(stripeKey) {
    const payment = this.props.payment;
    this.stripeHandler = StripeCheckout.configure({
      key: stripeKey,
      locale: 'auto',
      token(token) {
        if (token) {
          makePayment.call({
            tokenId: token.id,
            payment,
          }, (error, queryString) => {
            if (!error) {
              window.location.replace(
                `${payment.x_url_complete}?${queryString}`
              );
              // TODO - also post async (see
              // https://help.shopify.com/api/sdks/hosted-payment-sdk/checkout-process)
            }
          });
        }
      },
    });

    this.stripeHandler.open({
      name: Meteor.settings.public.paymentPage.companyName,
      description: payment.x_description,
      email: payment.x_customer_email,
      amount: payment.x_amount * 100,
      // closed() {
      //   // Payment cancelled
      //   window.location.replace(payment.x_url_cancel);
      // },
    });
  }

  render() {
    return (
      <div className={css(styles.paymentPage)}>
        <Logo logoUrl={Meteor.settings.public.paymentPage.companyLogoUrl} />
      </div>
    );
  }
}

PaymentPage.propTypes = {
  // eslint-disable-next-line
  loading: React.PropTypes.bool.isRequired,
  payment: React.PropTypes.object,
};

styles = StyleSheet.create({
  paymentPage: {
    height: '100%',
    backgroundImage:
      `url('${Meteor.settings.public.paymentPage.backgroundImageUrl}')`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  },
});

export default PaymentPage;
