import moment from 'moment';
import { _ } from 'meteor/underscore';
import CryptoJS from 'crypto-js';

const ShopifyResponse = {
  response: {},

  init(payment) {
    this.response.x_account_id = payment.x_account_id;
    this.response.x_reference = payment.x_reference;
    this.response.x_currency = payment.x_currency;
    this.response.x_test = payment.x_test;
    this.response.x_amount = payment.x_amount;
    this.response.x_gateway_reference = payment._id;
    this.response.x_timestamp = moment.utc().format();
    this.response.x_result = 'completed';
    this.response.x_signature = this._buildSignature();
  },

  queryString() {
    const res = this.response;
    return `x_account_id=${res.x_account_id}`
      + `&x_reference=${res.x_reference}`
      + `&x_currency=${res.x_currency}`
      + `&x_test=${res.x_test}`
      + `&x_amount=${res.x_amount}`
      + `&x_gateway_reference=${res.x_gateway_reference}`
      + `&x_timestamp=${res.x_timestamp}`
      + `&x_result=${res.x_result}`
      + `&x_signature=${res.x_signature}`;
  },

  _buildSignature() {
    const messageValues = [];
    _.keys(this.response).forEach((param) => {
      if (param.startsWith('x_') && (param !== 'x_signature')) {
        messageValues.push(`${param}${this.response[param]}`);
      }
    });
    const sortedMessageValues = _.sortBy(messageValues, value => value);
    const message = sortedMessageValues.join('');
    // eslint-disable-next-line new-cap
    const hashedMessage = CryptoJS.HmacSHA256(
      message, process.env.SHOPIFY_HMAC_KEY
    ).toString();
    return hashedMessage;
  },
};

export default ShopifyResponse;
