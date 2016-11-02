import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';

import ShopifyRequest from '../../api/shopify/server/shopify_request';
import Payments from '../../api/payments/collection';
import StripeKeys from '../../api/environment/server/stripe_keys';
import ShopifyResponse from '../../api/shopify/server/shopify_response';
import Tokens from '../../api/tokens/collection';

const RouteHandler = {
  // Verify the incoming shopify request is valid, save the incoming payment
  // details, then redirect to the application root to display payment
  // details and load the Stripe checkout widget.
  incomingPayment(params, req, res) {
    const shopifyRequest = Object.create(ShopifyRequest);
    shopifyRequest.init(req.body);

    if (shopifyRequest.isSignatureValid()) {
      // Store the incoming payment information and redirect to home to
      // show the Stripe checkout form
      const paymentId = Payments.insert(shopifyRequest.request);
      res.writeHead(302, {
        Location: `/?id=${paymentId}`,
      });
    } else {
      // Invalid signature; redirect to shopify
      res.writeHead(302, {
        Location: shopifyRequest.request.x_url_cancel,
      });
    }

    res.end();
  },

  // With this approach it's assumed that a Stripe token has already been
  // created and saved. Verify the incoming Shopify request, then find the
  // matching Stripe token. Save the incoming payment details, create the
  // necessary Stripe charge, and redirect back to Shopify. This option
  // by-passes the Stripe checkout locally.
  incomingPaymentWithToken(params, req, res) {
    const shopifyRequest = Object.create(ShopifyRequest);
    shopifyRequest.init(req.body);
    const payment = shopifyRequest.request;

    if (shopifyRequest.isSignatureValid()) {
      // Load saved Stripe token
      const checkoutUrl =
        payment.x_url_complete.replace('/offsite_gateway_callback', '');
      const tokenData = Tokens.findOne({ checkoutUrl });

      // Save incoming Shopify request payment details for reference
      payment.token = tokenData.token;
      payment.timestamp = new Date();
      const paymentId = Payments.insert(payment);

      const stripe = require('stripe')(
        (payment.x_test === 'true')
          ? StripeKeys.testSecret
          : StripeKeys.liveSecret
      );

      try {
        // Create the Stripe charge
        const charge = stripe.charges.create({
          amount: payment.x_amount * 100,
          currency: 'usd',
          source: tokenData.token,
          description: `Charge for ${payment.x_description}`,
        });

        // Updated saved payment details with successful Stripe charge
        // reference information
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'completed', charge, error: null } }
        );

        // Prepare response data and post back to Shopify
        const shopifyResponse = Object.create(ShopifyResponse);
        shopifyResponse.init(payment);
        res.writeHead(302, {
          Location: `${payment.x_url_complete}?${shopifyResponse.queryString()}`,
        });
      } catch (error) {
        // Unable to create Stripe charge so save error details with payment
        // information and redirect back to the Shopify request cancel URL
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'failed', error, charge: null } }
        );
        res.writeHead(302, {
          Location: payment.x_url_cancel,
        });
      }
    } else {
      // Invalid signature; redirect to shopify cancel URL
      res.writeHead(302, {
        Location: payment.x_url_cancel,
      });
    }

    res.end();
  },
};

Picker.middleware(bodyParser.json());
Picker.middleware(bodyParser.urlencoded({ extended: false }));

Picker.route(
  '/incoming-payment',
  (params, req, res) => RouteHandler.incomingPayment(params, req, res)
);

Picker.route(
  '/incoming-payment-with-token',
  (params, req, res) => RouteHandler.incomingPaymentWithToken(params, req, res)
);

Picker.route('/incoming-token', (params, req) => {
  const tokenData = req.body;
  if (tokenData) {
    Tokens.insert(tokenData);
  }
});

// TODO - temp to test webhook
// see if I can read in custom line items added to order to represent subscription
// Picker.route('/order-payment', (params, req, res) => {
//   console.log(req.body);
// });

export default RouteHandler;
