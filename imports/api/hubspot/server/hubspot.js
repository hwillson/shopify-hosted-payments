import { HTTP } from 'meteor/http';
import moment from 'moment';

const hubspot = {
  trackUrl: 'https://track.hubspot.com/v1',
  apiUrl: 'https://api.hubapi.com/contacts/v1',

  updateContact(eventData) {
    const apiKey = process.env.HUBSPOT_API_KEY;
    const url =
      `${hubspot.apiUrl}/contact/email/${eventData.extra.customerEmail}` +
      `/profile?hapikey=${apiKey}`;

    const nextShipmentDate =
      moment.utc(eventData.extra.nextShipmentDate).startOf('day').valueOf();

    const data = {
      properties: [
        // Current autoship status
        {
          property: 'feed_autoship_current_status',
          value: eventData.extra.subscriptionStatus,
        },
        // Has ever had an active Autoship?
        {
          property: 'feed_autoship_status_active',
          value: true,
        },
        // Next shipment date
        {
          property: 'feed_autoship_next_shipment_date',
          value: nextShipmentDate,
        },
        // Amount of last autoship order
        {
          property: 'feed_autoship_of_amount_of_last_autoship_order',
          value: eventData.extra.totalSubscriptionPrice,
        },
        // Renewal period
        {
          property: 'feed_autoship_renewal_period',
          value: eventData.extra.renewalFrequencyLabel,
        },
        // Total autoship orders delivered
        {
          property: 'feed_autoship_total_autoship_orders_delivered',
          value: eventData.extra.totalOrders,
        },
        // Total revenue (increment on each new Autoship order)
        {
          property: 'feed_autoship_total_autoship_revenue',
          value: eventData.extra.totalSpent,
        },
      ],
    };
    const jsonData = JSON.stringify(data);
    const response = HTTP.post(url, {
      data,
    });
    console.log(response);
  },

  trackEvent(eventData) {
    const hubId = process.env.HUBSPOT_HUB_ID;
    const nextShipmentDate =
      moment.utc(eventData.extra.nextShipmentDate).startOf('day').valueOf();

    let eventId;
    switch (eventData.event) {
      case 'New Subscription': {
        // Autoship: New (000006373050)
        eventId = '000006373050';
        break;
      }
      case 'Cancelled Subscription': {
        // Autoship: Cancelled (000006344214)
        eventId = '000006344214';
        break;
      }
      case 'Paused Subscription': {
        // Autoship: Paused (000006373051)
        eventId = '000006373051';
        break;
      }
      case 'Resumed Subscription': {
        // Autoship: Resumed (000006344215)
        eventId = '000006344215';
        break;
      }
      case 'Payment Failed': {
        // Autoship: Payment Failed (000006373052)
        eventId = '000006373052';
        break;
      }
      case 'Failed Payment Fixed': {
        // Autoship: Failed Payment Fixed (000006344216)
        eventId = '000006344216';
        break;
      }
      default: {
        // Do nothing
      }
    }

    const {
      subscriptionStatus,
      totalSubscriptionPrice,
      renewalFrequencyLabel,
      totalOrders,
      totalSpent,
    } = eventData.extra;

    const url =
      `${hubspot.trackUrl}/event` +
      `?_a=${hubId}` +
      `&_n=${eventId}` +
      `&email=${eventData.extra.customerEmail}` +
      `&feed_autoship_current_status=${subscriptionStatus}` +
      `&feed_autoship_status_active=Yes` +
      `&feed_autoship_next_shipment_date=${nextShipmentDate}` +
      `&feed_autoship_of_amount_of_last_autoship_order=${totalSubscriptionPrice}` +
      `&feed_autoship_renewal_period=${renewalFrequencyLabel}` +
      `&feed_autoship_total_autoship_orders_delivered=${totalOrders}` +
      `&feed_autoship_total_autoship_revenue=${totalSpent}`;
    const response = HTTP.get(url);
  },
};

export default hubspot;
