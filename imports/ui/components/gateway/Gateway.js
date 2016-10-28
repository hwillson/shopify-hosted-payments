import React from 'react';
import { StyleSheet, css } from 'aphrodite';
import { Meteor } from 'meteor/meteor';

let styles;

const Gateway = () => (
  <div className={`section__content ${css(styles.gateway)}`}>
    <div data-payment-subform="required">
      <div className="content-box">
        <div className="radio-wrapper content-box__row ">
          <label
            className={`radio__label content-box__emphasis payment-method-wrapper ${css(styles.radioLabel)}`}
            htmlFor="checkout_payment_gateway_119445700"
          >
            <div className="radio__label__primary">
              <img
                alt={Meteor.settings.public.paymentPage.paymentGatewayName}
                className="offsite-payment-gateway-logo"
                src={Meteor.settings.public.paymentPage.paymentGatewayLogo}
              />
              <span className="visually-hidden">
                {Meteor.settings.public.paymentPage.paymentGatewayName}
              </span>
            </div>
            <div className="radio__label__accessory">
              <span className="visually-hidden">Pay with:</span>
              <ul data-brand-icons-for-gateway="119445700">
                <li
                  data-payment-icon="visa"
                  className="payment-icon payment-icon--visa"
                >
                  <span className="visually-hidden">Visa</span>
                </li>
                <li
                  data-payment-icon="master"
                  className="payment-icon payment-icon--master"
                >
                  <span className="visually-hidden">MasterCard</span>
                </li>
                <li
                  data-payment-icon="discover"
                  className="payment-icon payment-icon--discover"
                >
                  <span className="visually-hidden">Discover</span>
                </li>
                <li
                  data-payment-icon="american-express"
                  className="payment-icon payment-icon--american-express"
                >
                  <span className="visually-hidden">AMEX</span>
                </li>
                <li className="payment-icon-list__more">
                  <span className="content-box__small-text">
                    and more…
                  </span>
                </li>
              </ul>
            </div>
          </label>
        </div>
      </div>
    </div>
  </div>
);

styles = StyleSheet.create({
  gateway: {
    marginTop: '20px',
  },
  radioLabel: {
    cursor: 'inherit',
  },
});

export default Gateway;
