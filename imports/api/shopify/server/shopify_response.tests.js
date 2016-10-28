/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import { expect } from 'meteor/practicalmeteor:chai';
import moment from 'moment';

import ShopifyResponse from './shopify_response';

const SHOPIFY_HMAC_KEY = 'test';

const validPayment = {
  _id: 'abc123',
  utf8: '✓',
  authenticity_token: 'OL+eYcXXNzg1qjKSIwio/dXaydjRjyHLZ6WBCX5/Tm/0i1niTphx3P6qebOUIrLpX7kP/EYHpDGUaYZ9E9W/7Q==',
  x_reference: '14034579076',
  x_account_id: 'test',
  x_amount: '118.00',
  x_currency: 'USD',
  x_url_callback: 'https://checkout.shopify.com/services/ping/notify_integration/the_feed/15488123',
  x_url_complete: 'https://checkout.shopify.com/15488123/checkouts/a3d748e2e873d6a1f5ba8455b936909c/offsite_gateway_callback',
  x_shop_country: 'US',
  x_shop_name: 'Some Company',
  x_test: 'true',
  x_customer_first_name: 'Hugh',
  x_customer_last_name: 'Willson',
  x_customer_email: 'test@somecompany.com',
  x_customer_billing_country: 'US',
  x_customer_billing_city: 'New York',
  x_customer_billing_address1: '123 Right St.',
  x_customer_billing_state: 'NY',
  x_customer_billing_zip: '10003',
  x_customer_shipping_country: 'US',
  x_customer_shipping_first_name: 'Hugh',
  x_customer_shipping_last_name: 'Willson',
  x_customer_shipping_city: 'New York',
  x_customer_shipping_address1: '123 Right St.',
  x_customer_shipping_state: 'NY',
  x_customer_shipping_zip: '10003',
  x_invoice: '#14034579076',
  x_description: 'Some Company - #14034579076',
  x_url_cancel: 'https://some-company.myshopify.com/cart',
  x_signature: '9d184f49cfdb31edbe9460c2372b4e004a091189d7a2011fc8e07f03008d6302',
};

describe('api.shopify.ShopifyResponse', function () {
  before(function () {
    process.env.SHOPIFY_HMAC_KEY = SHOPIFY_HMAC_KEY;
  });

  describe('#init', function () {
    it('should build a response', function () {
      const shopifyResponse = Object.create(ShopifyResponse);
      shopifyResponse.init(validPayment);
      expect(shopifyResponse.response).to.not.be.null;
    });

    it('should set properly formatted timestamp in response', function () {
      const shopifyResponse = Object.create(ShopifyResponse);
      shopifyResponse.init(validPayment);
      const timestamp = shopifyResponse.response.x_timestamp;
      expect(moment.utc(timestamp).isValid()).to.be.true;
    });

    it('should set valid response signature', function () {
      const shopifyResponse = Object.create(ShopifyResponse);
      shopifyResponse.init(validPayment);
      expect(shopifyResponse.response.x_signature).to.not.be.empty;
    });
  });

  describe('#queryString', function () {
    it('should return query string with all response key/values', function () {
      const queryStringRegEx =
        'x_account_id=test&x_reference=14034579076&x_currency=USD'
        + '&x_test=true&x_amount=118.00&x_gateway_reference=abc123'
        + '&x_timestamp=(.*)&x_result=completed'
        + '&x_signature=(.*)';
      const shopifyResponse = Object.create(ShopifyResponse);
      shopifyResponse.init(validPayment);
      expect(
        shopifyResponse.queryString().match(queryStringRegEx)
      ).to.not.be.null;
    });
  });
});
