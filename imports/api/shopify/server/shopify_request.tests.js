/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import { expect } from 'meteor/practicalmeteor:chai';
import ShopifyRequest from './shopify_request';

const SHOPIFY_HMAC_KEY = 'test';

const validShopifyRequest = {
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

describe('api.shopify.ShopifyRequest', function () {
  describe('#init', function () {
    it('should store passed in request', function () {
      ShopifyRequest.init(validShopifyRequest);
      expect(ShopifyRequest.request).to.not.be.null;
    });
  });

  describe('#isSignatureValid', function () {
    before(function () {
      process.env.SHOPIFY_HMAC_KEY = SHOPIFY_HMAC_KEY;
    });

    it('should return false if "x_signature" is not valid', function () {
      ShopifyRequest.init({
        x_signature: 'invalid',
      });
      expect(ShopifyRequest.isSignatureValid()).to.be.false;
    });

    it('should return true if "x_signature" is valid', function () {
      ShopifyRequest.init(validShopifyRequest);
      expect(ShopifyRequest.isSignatureValid()).to.be.true;
    });
  });
});
