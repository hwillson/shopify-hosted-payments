import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import StripeHelper from '../../cards/server/stripe_helper';
import bugsnag from '../../bugsnag/server/bugsnag';

const Subscription = {
  create(orderData) {
    if (orderData) {
      const subscriptionData = this._prepareSubscription(orderData);
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + '/methods/api_CreateNewSubscription';
      HTTP.post(subServiceUrl, { data: subscriptionData }, (error) => {
        if (error) {
          throw error;
        }
      });
    }
  },

  resume(subscriptionId) {
    if (subscriptionId) {
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + '/methods/api_UpdateSubscriptionStatus';
      HTTP.post(
        subServiceUrl,
        { data: { subscriptionId, statusId: 'active', renewTomorrow: true } },
        (error) => {
          if (error) {
            throw error;
          }
        }
      );
    }
  },

  _subscriptionFrequencyId: 'w1',

  _prepareProducts(orderData) {
    const productData = {
      products: [],
      includesFreeTrial: false,
    };
    if (orderData && orderData.line_items) {
      orderData.line_items.forEach((lineItem) => {
        if (lineItem.sku.indexOf('TF_SUB_') > -1) {
          this._subscriptionFrequencyId =
            lineItem.sku.replace('TF_SUB_', '').toLowerCase();
        } else if (lineItem.sku.indexOf('TF_TRIAL_') > -1) {
          // note_attributes format:
          // name = TF_ONGOING_TRIAL
          // value = TF_SPORT_SIZE (PRODUCT_ID-VARIATION_ID)
          orderData.note_attributes.forEach((note) => {
            if (note.name === 'TF_ONGOING_TRIAL') {
              const matches = /^TF_.*?\((.*?)-(.*?)\)/.exec(note.value);
              if (matches && (matches.length === 3)) {
                const productId = matches[1];
                const variationId = matches[2];
                productData.products.push({
                  productId,
                  variationId,
                  quantity: 1,
                });
                productData.includesFreeTrial = true;
              }
            }
          });
        } else {
          productData.products.push({
            productId: lineItem.product_id,
            variationId: lineItem.variant_id,
            quantity: lineItem.quantity,
          });
        }
      });
    }
    return productData;
  },

  _prepareCustomer(orderData) {
    const customer = {};
    if (orderData && orderData.customer) {
      customer.externalId = orderData.customer.id;
      customer.email = orderData.customer.email;
      customer.firstName = orderData.customer.first_name;
      customer.lastName = orderData.customer.last_name;
      try {
        customer.stripeCustomerId = StripeHelper.findCustomerId(customer.email);
      } catch (error) {
        bugsnag.notify(error, {
          message: 'Problem getting customer ID from Stripe',
          customer,
        });
      }
      if (!customer.stripeCustomerId) {
        bugsnag.notify(
          new Error('Problem getting customer ID from Stripe'),
          { customer },
        );
      }
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
    const productData = this._prepareProducts(orderData);
    const customer = this._prepareCustomer(orderData);
    const shippingMethod = this._prepareShippingMethod(orderData);
    const order = this._prepareOrder(orderData);

    const subscriptionData = {
      apiKey: process.env.MP_API_KEY,
      sendSubscriptionIdToStore: true,
      includesFreeTrial: productData.includesFreeTrial,
      subscription: {
        renewalFrequencyId: this._subscriptionFrequencyId,
        shippingMethodId: shippingMethod.shippingMethodId,
        shippingMethodName: shippingMethod.shippingMethodName,
        shippingCost: shippingMethod.shippingCost,
      },
      customer,
      order,
      subscriptionItems: productData.products,
    };

    return subscriptionData;
  },
};

export default Subscription;
