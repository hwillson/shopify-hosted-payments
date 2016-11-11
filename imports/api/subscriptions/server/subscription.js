import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import CustomersCollection from '../../customers/collection';

const Subscription = {
  create(orderData) {
    if (orderData) {
      const subscriptionData = this._prepareSubscription(orderData);
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + '/methods/api_CreateNewSubscription';
      HTTP.post(subServiceUrl, { data: subscriptionData });
      // TODO - add some error handling / retrying ...
    }
  },

  _subscriptionFrequencyId: 'w1',

  _prepareProducts(orderData) {
    const products = [];
    if (orderData && orderData.line_items) {
      orderData.line_items.forEach((lineItem) => {
        if (lineItem.sku.indexOf('TF_SUB_') > -1) {
          this._subscriptionFrequencyId =
            lineItem.sku.replace('TF_SUB_', '').toLowerCase();
        } else {
          products.push({
            productId: lineItem.product_id,
            variationId: lineItem.variant_id,
            quantity: lineItem.quantity,
            discountPercent: 10,
          });
        }
      });
    }
    return products;
  },

  _prepareCustomer(orderData) {
    const customer = {};
    if (orderData && orderData.customer) {
      customer.externalId = orderData.customer.id;
      customer.email = orderData.customer.email;
      customer.firstName = orderData.customer.first_name;
      customer.lastName = orderData.customer.last_name;
      const loadedCustomer =
        CustomersCollection.findOne({ email: customer.email });
      customer.stripeCustomerId = loadedCustomer.stripeCustomerId;
    }
    return customer;
  },

  _prepareShippingMethod(orderData) {
    const shippingMethod = {};
    if (orderData
        && orderData.shipping_lines
        && orderData.shipping_lines.length > 0) {
      const shippingLine = orderData.shipping_lines[0];
      shippingMethod.shippingMethodId = shippingLine.id;
      shippingMethod.shippingMethodName = shippingLine.title;
      shippingMethod.shippingCost = shippingLine.price;
    }
    return shippingMethod;
  },

  _prepareOrder(orderData) {
    const order = {};
    if (orderData) {
      order.orderId = orderData.id;
      order.orderTypeId = 'new';
      order.orderDate = orderData.created_at;
    }
    return order;
  },

  _prepareSubscription(orderData) {
    const products = this._prepareProducts(orderData);
    const customer = this._prepareCustomer(orderData);
    const shippingMethod = this._prepareShippingMethod(orderData);
    const order = this._prepareOrder(orderData);

    const subscriptionData = {
      apiKey: process.env.MP_API_KEY,
      sendSubscriptionIdToStore: true,
      subscription: {
        renewalFrequencyId: this._subscriptionFrequencyId,
        shippingMethodId: shippingMethod.shippingMethodId,
        shippingMethodName: shippingMethod.shippingMethodName,
        shippingCost: shippingMethod.shippingCost,
      },
      customer,
      order,
      subscriptionItems: products,
    };

    return subscriptionData;
  },
};

export default Subscription;
