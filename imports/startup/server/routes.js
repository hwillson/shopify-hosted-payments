import { Meteor } from 'meteor/meteor';
import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';

import ShopifyRequest from '../../api/shopify/server/shopify_request';
import Payments from '../../api/payments/collection';
import ShopifyResponse from '../../api/shopify/server/shopify_response';
import CustomersCollection from '../../api/customers/collection';
import Subscription from '../../api/subscriptions/server/subscription';
import Stripe from '../../api/cards/server/stripe';

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
      if (payment.stripe_token) {
        // Save incoming Shopify request payment details for reference
        payment.timestamp = new Date();
        const paymentId = Payments.insert(payment);

        try {
          const charge = CustomersCollection.findAndChargeCustomer(payment);

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
          res.writeHead(302, { Location: payment.x_url_cancel });
        }
      } else {
        // Missing token; redirect to shopify cancel URL
        res.writeHead(302, { Location: payment.x_url_cancel });
      }
    } else {
      // Invalid signature; redirect to shopify cancel URL
      res.writeHead(302, { Location: payment.x_url_cancel });
    }

    res.end();
  },

  // When the Shopify "Order Payment" event is fired, this webhook can be called
  // to send order data into a 3rd party subscription system.
  orderPayment(params, req, res) {
    const orderData = req.body;
    if (orderData) {
      const lineItems = orderData.line_items;
      lineItems.forEach((lineItem) => {
        if (lineItem.sku.indexOf('TF_SUB') > -1) {
          // Subscription order found; create new subscription in MP
          Subscription.create(orderData);
        }
      });
    }
    res.end();
  },

  updateCard(params, req, res) {
    const cardDetails = req.body;
    let statusCode = 400;
    const updateResponse = {};
    if (cardDetails) {
      try {
        Stripe.updateCard({
          customerId: cardDetails.customerId,
          tokenId: cardDetails.tokenId,
        });
        statusCode = 200;
        updateResponse.success = true;
        updateResponse.message = 'Card updated';
      } catch (error) {
        updateResponse.success = false;
        updateResponse.message = 'Unable to update card';
        updateResponse.details = error;
      }
    } else {
      updateResponse.success = false;
      updateResponse.message = 'Missing card details.';
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(updateResponse));
  },

  chargeCard(params, req, res) {
    const chargeDetails = req.body;
    let statusCode = 400;
    const chargeResponse = {};
    if (chargeDetails) {
      try {
        Stripe.chargeCard({
          customerId: chargeDetails.stripeCustomerId,
          amount: chargeDetails.amount,
        });
        statusCode = 200;
        chargeResponse.success = true;
        chargeResponse.message = 'Card charged.';
      } catch (error) {
        chargeResponse.success = false;
        chargeResponse.message = 'Unable to charge card.';
        chargeResponse.details = error;
      }
    } else {
      chargeResponse.success = false;
      chargeResponse.message = 'Missing charge details.';
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(chargeResponse));
  },

  _setHeader(request, response) {
    response.setHeader('Content-Type', 'application/json');
    const allowedOrigins = Meteor.settings.private.cors.allowedOrigins;
    const origin = request.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
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

Picker.route(
  '/order-payment',
  (params, req, res) => RouteHandler.orderPayment(params, req, res)
);

Picker.route(
  '/update-card',
  (params, req, res) => RouteHandler.updateCard(params, req, res)
);

Picker.route(
  '/charge-card',
  (params, req, res) => RouteHandler.chargeCard(params, req, res)
);

export default RouteHandler;
