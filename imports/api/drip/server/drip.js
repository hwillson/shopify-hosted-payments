const dripClient = require('drip-nodejs')({
  token: process.env.DRIP_API_TOKEN,
  accountId: process.env.DRIP_ACCOUNT_ID
});

export function recordDripEvent(eventData) {
  const { extra } = eventData;
  const payload = {
    email: extra.customerEmail,
    action: eventData.event,
    properties: extra
  };
  try {
    dripClient.recordEvent({
      events: [payload]
    });
  } catch (error) {
    console.log(error);
  }
}

export function updateDripSubscriber(eventData) {
  const { extra } = eventData;
  delete extra.subscriptionItems;
  const payload = {
    email: extra.customerEmail,
    custom_fields: extra
  };
  try {
    dripClient.createUpdateSubscriber({
      subscribers: [payload]
    });
  } catch (error) {
    console.log(error);
  }
}
