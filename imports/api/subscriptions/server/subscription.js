/* eslint-disable no-restricted-syntax */

import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import R from 'ramda';

import StripeHelper from '../../cards/server/stripe_helper';
import bugsnag from '../../bugsnag/server/bugsnag';
import CustomersCollection from '../../customers/collection';

const BEARER = new Buffer(process.env.MP_API_KEY).toString('base64');

const Subscription = {
  create(orderData) {
    if (orderData) {
      const subscriptionData = this._prepareSubscription(orderData);
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + '/subscriptions';
      HTTP.post(subServiceUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEARER}`,
        },
        data: subscriptionData,
      }, (error) => {
        if (error) {
          throw error;
        }
      });
    }
  },

  createCustomerDiscount(orderData) {
    if (orderData) {
      const data = {
        customer: this._prepareCustomer(orderData),
        customerDiscount: this._prepareCustomerDiscount(orderData),
      };
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + '/customer_discounts';
      HTTP.post(subServiceUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEARER}`,
        },
        data,
      }, (error) => {
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
        + `/subscriptions/${subscriptionId}/renew`;
      HTTP.put(
        subServiceUrl,
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${BEARER}`,
          },
        },
        (error) => {
          if (error) {
            throw error;
          }
        }
      );
    }
  },

  updateCustomer(customer) {
    if (customer) {
      const subServiceUrl =
        `${Meteor.settings.private.subscriptions.serviceUrl}`
        + `/customers/${customer.externalId}`;
      HTTP.put(subServiceUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEARER}`,
        },
        data: customer,
      }, (error) => {
        if (error) {
          throw error;
        }
      });
    }
  },

  _subscriptionFrequencyId: 'w1',

  _prepareSubscription(orderData) {
    const customerDiscount = this._prepareCustomerDiscount(orderData);
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
      customerDiscount,
      order,
      subscriptionItems: productData.products,
    };

    return subscriptionData;
  },

  _prepareCustomerDiscount(orderData) {
    const customerDiscount = {};
    if (orderData && orderData.line_items) {
      for (let i = 0; i < orderData.line_items.length; i += 1) {
        const lineItem = orderData.line_items[i];
        if (lineItem.sku.startsWith('TF_CLUB')) {
          customerDiscount.label = 'TF_CLUB';
          customerDiscount.durationMonths = 12;
          customerDiscount.discountPercent = 15;
          orderData.line_items.splice(i, 1);
          break;
        }
      }
    }
    return customerDiscount;
  },

  _prepareProducts(orderData) {
    const productData = {
      products: [],
      includesFreeTrial: false,
    };
    if (orderData && orderData.line_items) {
      orderData.line_items.forEach((lineItem) => {
        if (!this._isOnetimeLineItem(lineItem)) {
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
        const savedCustomer =
          CustomersCollection.findOne({ email: customer.email });
        if (savedCustomer && savedCustomer.stripeCustomerId) {
          customer.stripeCustomerId = savedCustomer.stripeCustomerId;
        } else {
          customer.stripeCustomerId =
            StripeHelper.findCustomerId(customer.email);
        }
      } catch (error) {
        bugsnag.notify(error, {
          message: 'Problem getting customer ID from Stripe',
          customer,
        });
      }

      if (!customer.stripeCustomerId) {
        const error = new Error(
          'Problem getting customer ID from Stripe; subscription ' +
          `will not be created. ${JSON.stringify(orderData)}`
        );
        bugsnag.notify(error, { customer });
        throw error;
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
      order.totalPrice = orderData.total_price;
    }
    return order;
  },

  _isOnetimeLineItem(lineItem) {
    let isOnetime;
    if (
      lineItem &&
      lineItem.properties &&
      lineItem.properties.length > 0
    ) {
      isOnetime = lineItem.properties.filter(prop =>
        prop.name === 'frequency' &&
        prop.value === 'onetime'
      ).length > 0;
    }
    return isOnetime;
  },
};

export default Subscription;
