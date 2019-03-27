import { HTTP } from 'meteor/http';

const SPREEDLY_URL = 'https://core.spreedly.com/v1/gateways';
const GATEWAY_TOKEN = process.env.SPREEDLY_GATEWAY_TOKEN;
const ENV_KEY = process.env.SPREEDLY_ENV_KEY;
const API_SECRET = process.env.SPREEDLY_API_SECRET;

export function chargeSpreedlyCustomer(payment) {
  const response = HTTP.post(`${SPREEDLY_URL}/${GATEWAY_TOKEN}/purchase.json`, {
    headers: {
      'Content-Type': 'application/json',
    },
    auth: `${ENV_KEY}:${API_SECRET}`,
    data: {
      transaction: {
        payment_method_token: payment.stripe_token,
        amount: payment.total_price,
        currency_code: 'USD',
        retain_on_success: true,
      },
    },
  });
  if (response) {
    delete response.content;
  }
  return response;
}
