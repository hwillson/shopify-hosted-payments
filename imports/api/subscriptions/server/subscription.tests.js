/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import { expect } from 'meteor/practicalmeteor:chai';
import StubCollections from 'meteor/hwillson:stub-collections';

import Subscription from './subscription';
import CustomersCollection from '../../customers/collection';

describe('api.subscriptions.server.Subscription', function () {
  describe('#_prepareProducts', function () {
    it('should parse order data and return a products array', function () {
      let products = Subscription._prepareProducts();
      expect(products.length).to.equal(0);

      const orderData = {
        line_items: [
          {
            sku: 'some_sku',
            product_id: 1,
            variant_id: 2,
            quantity: 3,
          },
        ],
      };
      products = Subscription._prepareProducts(orderData);
      expect(products.length).to.equal(1);
      expect(products[0].productId).to.equal(1);
      expect(products[0].variationId).to.equal(2);
      expect(products[0].quantity).to.equal(3);
      expect(products[0].discountPercent).to.equal(10);
    });
  });

  describe('#_prepareCustomer', function () {
    const stripeCustomerId = 'abc123';

    beforeEach(function () {
      StubCollections.stub([CustomersCollection]);
      CustomersCollection.insert({
        email: 'test@test.com',
        stripeCustomerId,
      });
    });

    afterEach(function () {
      StubCollections.restore();
    });

    it('should parse order data and return a customer object', function () {
      let customer = Subscription._prepareCustomer();
      expect(customer).to.be.empty;

      const orderData = {
        customer: {
          id: 1,
          email: 'test@test.com',
          first_name: 'Hugh',
          last_name: 'Willson',
        },
      };
      customer = Subscription._prepareCustomer(orderData);
      expect(customer).to.not.be.empty;
      expect(customer.externalId).to.equal(orderData.customer.id);
      expect(customer.email).to.equal(orderData.customer.email);
      expect(customer.firstName).to.equal(orderData.customer.first_name);
      expect(customer.lastName).to.equal(orderData.customer.last_name);
      expect(customer.stripeCustomerId).to.equal(stripeCustomerId);
    });
  });

  describe('#_prepareShippingMethod', function () {
    it('should parse order data and return shipping details', function () {
      let shippingMethod = Subscription._prepareShippingMethod();
      expect(shippingMethod).to.be.empty;

      const orderData = {
        shipping_lines: [
          {
            id: 1,
            title: 'Flat Rate',
            price: '12.00',
          },
        ],
      };
      shippingMethod = Subscription._prepareShippingMethod(orderData);
      expect(shippingMethod).to.not.be.empty;
      const shippingLine = orderData.shipping_lines[0];
      expect(shippingMethod.shippingMethodId).to.equal(shippingLine.id);
      expect(shippingMethod.shippingMethodName).to.equal(shippingLine.title);
      expect(shippingMethod.shippingCost).to.equal(shippingLine.price);
    });
  });

  describe('#_prepareOrder', function () {
    it('should parse order data and return an order object', function () {
      let order = Subscription._prepareOrder();
      expect(order).to.be.empty;

      const orderData = {
        id: 1,
        created_at: '2016-11-09T21:48:27-05:00',
      };
      order = Subscription._prepareOrder(orderData);
      expect(order).to.not.be.empty;
      expect(order.orderId).to.equal(orderData.id);
      expect(order.orderTypeId).to.equal('new');
      expect(order.orderDate).to.equal(orderData.created_at);
    });
  });
});
