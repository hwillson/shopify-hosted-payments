import { HTTP } from 'meteor/http';

const klaviyo = {
  apiUrl: 'https://a.klaviyo.com/api/track',

  trackEvent(eventData) {
    if (eventData) {
      const properties = {
        subscription_id: eventData.extra.subscriptionId,
        subscription_status: eventData.extra.subscriptionStatus,
        next_shipment_date: eventData.extra.nextShipmentDate,
        total_subscription_price: eventData.extra.totalSubscriptionPrice,
      };
      const data = {
        token: process.env.KLAVIYO_API_KEY,
        event: eventData.event,
        customer_properties: Object.assign({
          $email: eventData.extra.customerEmail,
        }, properties),
        properties: Object.assign({
          subscription_items: eventData.extra.subscriptionItems,
        }, properties),
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
