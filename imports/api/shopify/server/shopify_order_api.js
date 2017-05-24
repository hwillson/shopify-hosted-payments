import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

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

  markOrderAsPaid(orderId, totalPrice) {
    if (orderId && totalPrice) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      HTTP.call(
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
    }
  },
};

export default shopifyOrderApi;
