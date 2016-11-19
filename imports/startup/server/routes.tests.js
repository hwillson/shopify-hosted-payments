/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import { expect } from 'meteor/practicalmeteor:chai';
import StubCollections from 'meteor/hwillson:stub-collections';

import RouteHandler from './routes';
import Payments from '../../api/payments/collection';

const SHOPIFY_HMAC_KEY = 'test';

const validRequest = {
  body: {
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
  },
};

describe('startup.routes.RouteHandler', function () {
  describe('#incomingPayment', function () {
    before(function () {
      process.env.SHOPIFY_HMAC_KEY = SHOPIFY_HMAC_KEY;
    });

    beforeEach(function () {
      StubCollections.stub([Payments]);
    });

    afterEach(function () {
      StubCollections.restore();
    });

    it('should redirect to shopify if signature is invalid', function () {
      const invalidRequest = JSON.parse(JSON.stringify(validRequest));
      invalidRequest.body.x_signature = 'invalid';
      const responseStub = {
        success: false,
        writeHead(code, options) {
          if (options.Location === invalidRequest.body.x_url_cancel) {
            this.success = true;
          }
        },
        end() {
        },
      };
      RouteHandler.incomingPayment(null, invalidRequest, responseStub);
      expect(responseStub.success).to.be.true;
    });

    it(
      'should store incoming payment information in the Payments collection',
      function () {
        const responseStub = {
          writeHead() {},
          end() {},
        };
        expect(Payments.find().count()).to.equal(0);
        RouteHandler.incomingPayment(null, validRequest, responseStub);
        expect(Payments.find().count()).to.equal(1);
      }
    );

    it('should redirect to "/?id=something" if signature is valid', function () {
      const responseStub = {
        success: false,
        writeHead(code, options) {
          if (options.Location.match(/\/\?id=.*/)) {
            this.success = true;
          }
        },
        end() {
        },
      };
      RouteHandler.incomingPayment(null, validRequest, responseStub);
      expect(responseStub.success).to.be.true;
    });
  });
});
