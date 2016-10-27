import { _ } from 'meteor/underscore';
import CryptoJS from 'crypto-js';

const ShopifyRequest = {
  request: null,

  init(request) {
    this.request = request;
  },

  isSignatureValid() {
    const messageValues = [];
    _.keys(this.request).forEach((param) => {
      if (param.startsWith('x_') && (param !== 'x_signature')) {
        messageValues.push(`${param}${this.request[param]}`);
      }
    });
    const sortedMessageValues = _.sortBy(messageValues, value => value);
    const message = sortedMessageValues.join('');
    // eslint-disable-next-line new-cap
    const hashedMessage = CryptoJS.HmacSHA256(
      message, process.env.SHOPIFY_HMAC_KEY
    ).toString();
    return this.request.x_signature === hashedMessage;
  },
};

export default ShopifyRequest;
