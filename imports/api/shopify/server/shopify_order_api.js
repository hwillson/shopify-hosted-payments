import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import bugsnag from '../../bugsnag/server/bugsnag';

const shopifyOrderApi = {
  getPendingOrders() {
    let orders = [];
    const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiPass = process.env.SHOPIFY_API_PASS;
    const response = HTTP.get(
      `${serviceUrl}/orders.json`,
      {
        auth: `${apiKey}:${apiPass}`,
        query: 'financial_status=pending&fields=id,total_price,customer',
      }
    );
    if (response && response.data) {
      orders = response.data.orders;
    }
    return orders;
  },

  getCustomerPendingOrder(customerId) {
    let pendingOrder;
    if (customerId) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      const response = HTTP.get(
        `${serviceUrl}/customers/${customerId}/orders.json`,
        {
          auth: `${apiKey}:${apiPass}`,
          query: 'financial_status=pending&fields=id,total_price,customer',
        }
      );
      if (
        response &&
        response.data &&
        response.data.orders &&
        response.data.orders.length > 0
      ) {
        pendingOrder = response.data.orders[0];
      }
    }
    return pendingOrder;
  },

  markOrderAsPaid(orderId, totalPrice) {
    if (orderId && totalPrice) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;

      try {
        const response = HTTP.call(
          'POST',
          `${serviceUrl}/orders/${orderId}/transactions.json`,
          {
            auth: `${apiKey}:${apiPass}`,
            data: {
              transaction: {
                kind: 'capture',
                status: 'success',
                amount: totalPrice,
              },
            },
          }
        );

        if (response.statusCode === 201) {
          HTTP.call(
            'PUT',
            `${serviceUrl}/orders/${orderId}.json`,
            {
              auth: `${apiKey}:${apiPass}`,
              data: {
                order: {
                  id: orderId,
                  financial_status: 'paid',
                },
              },
            }
          );
        } else {
          bugsnag.notify(
            new Error(
              'Unable to add a "capture" transaction to Shopify. This has to be '
              + 'in place before we can set an orders status to paid. Verify '
              + `order ID ${orderId} exists in Shopify.`
            ),
            {
              orderId,
              totalPrice,
            },
          );
        }
      } catch (error) {
        bugsnag.notify(error, {
          message: 'Problem marking order as paid in shopify.',
          order: {
            orderId,
            totalPrice,
          },
        });
      }
    }
  },
};

export default shopifyOrderApi;
