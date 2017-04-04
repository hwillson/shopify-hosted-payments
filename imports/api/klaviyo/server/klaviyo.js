import { HTTP } from 'meteor/http';

const klaviyo = {
  apiUrl: 'https://a.klaviyo.com/api/track',

  trackEvent(eventData) {
    if (eventData) {
      const data = {
        token: process.env.KLAVIYO_API_KEY,
        event: eventData.event,
        customer_properties: {
          $email: eventData.extra.customerEmail,
          subscription_id: eventData.extra.subscriptionId,
          next_shipment_date: eventData.extra.nextShipmentDate,
          total_subscription_price: eventData.extra.totalSubscriptionPrice,
          subscription_items: eventData.extra.subscriptionItems,
        },
        properties: {
          subscription_id: eventData.extra.subscriptionId,
          next_shipment_date: eventData.extra.nextShipmentDate,
          total_subscription_price: eventData.extra.totalSubscriptionPrice,
          subscription_items: eventData.extra.subscriptionItems,
        },
      };

      const jsonData = JSON.stringify(data);
      const base64Data = new Buffer(jsonData).toString('base64');
      HTTP.get(`${this.apiUrl}`, {
        params: {
          data: base64Data,
        },
      });
    }
  },
};

export default klaviyo;
