/* global window, StripeCheckout */

import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { StyleSheet, css } from 'aphrodite';

import getStripePubKey from '../../api/environment/methods';
import makePayment from '../../api/payments/methods';
import Sidebar from '../components/sidebar/Sidebar';
import Breadcrumb from '../components/breadcrumb/Breadcrumb';
import Gateway from '../components/gateway/Gateway';
import Footer from '../components/footer/Footer';
import Customer from '../components/customer/Customer';

let styles;

class PaymentPage extends Component {
  constructor(props) {
    super(props);
    this.openStripeCheckout = this.openStripeCheckout.bind(this);
    this.state = {
      stripeCheckoutActive: true,
      processingPayment: false,
    };
  }

  componentWillReceiveProps(newProps) {
    if (!newProps.loading) {
      getStripePubKey.call(
        { testMode: (newProps.payment.x_test === 'true') },
        (error, stripeKey) => {
          if (error) {
            throw error;
          } else {
            this.initializeStripeCheckout(stripeKey);
          }
        }
      );
    }
  }

  componentWillUnmount() {
    this.stripeHandler.close();
  }

  initializeStripeCheckout(stripeKey) {
    if (stripeKey) {
      const payment = this.props.payment;
      const self = this;
      this.stripeHandler = StripeCheckout.configure({
        key: stripeKey,
        locale: 'auto',
        token(token) {
          self.setState({
            processingPayment: true,
          });
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

      this.openStripeCheckout();
    }
  }

  openStripeCheckout(event) {
    if (event) {
      event.preventDefault();
    }

    if (this.stripeHandler) {
      this.setState({
        stripeCheckoutActive: true,
      });

      const payment = this.props.payment;
      const self = this;
      this.stripeHandler.open({
        name: Meteor.settings.public.paymentPage.companyName,
        description: payment.x_description,
        email: payment.x_customer_email,
        amount: payment.x_amount * 100,
        closed() {
          if (!self.state.processingPayment) {
            self.setState({
              stripeCheckoutActive: false,
            });
          }
        },
      });
    }
  }

  payWithCardButton() {
    const buttonLabel =
      (this.state.stripeCheckoutActive)
        ? 'Processing ...'
        : 'Pay with Card';
    const disabled = (this.state.stripeCheckoutActive) ? 'disabled' : '';
    return (
      <button
        name="button"
        className="step__footer__continue-btn btn"
        onClick={this.openStripeCheckout}
        disabled={disabled}
      >
        <span className="btn__content">{buttonLabel}</span>
      </button>
    );
  }

  render() {
    const cancelUrl =
      (this.props.payment) ? this.props.payment.x_url_cancel : '#';
    return (
      <div className={css(styles.paymentPage)}>
        <div className={`content ${css(styles.content)}`}>
          <div className="wrap">
            <Sidebar />
            <div className="main" role="main">
              <div className="main__header">
                <a
                  href={Meteor.settings.public.paymentPage.siteUrl}
                  className="logo logo--left"
                >
                  <h1 className="logo__text">
                    {Meteor.settings.public.paymentPage.companyName}
                  </h1>
                </a>
                <Breadcrumb />
              </div>
              <div className="main__content">
                <div className="step" data-step="payment_method">
                  <form className="edit_checkout animate-floating-labels">
                    <div className="step__sections">
                      <div className="section section--payment-method">
                        <div className="section__header">
                          <h2 className="section__title">Payment method</h2>
                          <p className="section__text">
                            Click on the "Pay with Card" button to
                            enter your credit card details, and complete your
                            order. Please note
                            &nbsp;
                            {Meteor.settings.public.paymentPage.companyName}
                            &nbsp;
                            does not keep a copy of your credit card
                            information.
                          </p>
                        </div>
                        <Customer payment={this.props.payment} />
                        <Gateway />
                      </div>
                    </div>
                    <div className="step__footer">
                      {this.payWithCardButton()}
                      <a
                        className="step__footer__previous-link"
                        href={cancelUrl}
                      >
                        <svg
                          className="previous-link__icon icon--chevron icon"
                          xmlns="http://www.w3.org/2000/svg"
                          width="6.7"
                          height="11.3"
                          viewBox="0 0 6.7 11.3"
                        >
                          <path
                            d="M6.7 1.1l-1-1.1-4.6 4.6-1.1 1.1 1.1 1 4.6 4.6 1-1-4.6-4.6z"
                          />
                        </svg>
                        Return to cart
                      </a>
                    </div>
                  </form>
                </div>
              </div>
              <Footer />
            </div>
          </div>
        </div>
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
  },
  content: {
    height: '100%',
  },
});

export default PaymentPage;
