import { Meteor } from 'meteor/meteor';
import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';

import ShopifyRequest from '../../api/shopify/server/shopify_request';
import ShopifyCustomerApi from '../../api/shopify/server/shopify_customer_api';
import Payments from '../../api/payments/collection';
import ShopifyResponse from '../../api/shopify/server/shopify_response';
import CustomersCollection from '../../api/customers/collection';
import Subscription from '../../api/subscriptions/server/subscription';
import StripeHelper from '../../api/cards/server/stripe_helper';

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

  // With this approach it's assumed that a Stripe token or Stripe customer ID
  // is being sent in. Verify the incoming Shopify request, save the incoming
  // payment details, create the necessary Stripe charge, and redirect back
  // to Shopify. This option by-passes the Stripe checkout locally.
  incomingPaymentWithToken(params, req, res) {
    const shopifyRequest = Object.create(ShopifyRequest);
    shopifyRequest.init(req.body);
    const payment = shopifyRequest.request;
    payment.timestamp = new Date();

    // Login incoming Shopify request payment details for reference
    const paymentId = Payments.insert(payment);

    let shopifyResponse;
    if (shopifyRequest.isSignatureValid()) {
      if (this._chargeCustomer(paymentId, payment)) {
        // Prepare response data and post back to Shopify
        shopifyResponse = Object.create(ShopifyResponse);
        shopifyResponse.init(payment);
      }
    }

    if (shopifyResponse) {
      res.writeHead(302, {
        Location: `${payment.x_url_complete}?${shopifyResponse.queryString()}`,
      });
    } else {
      const failedUrl = payment.x_url_complete.replace(
        '/offsite_gateway_callback',
        '?step=payment_method&failed=1',
      );
      res.writeHead(302, { Location: failedUrl });
    }

    res.end();
  },

  // When the Shopify "Order Payment" event is fired, this webhook can be called
  // to send order data into a 3rd party subscription system.
  orderPayment(params, req, res) {
    const orderData = req.body;
    if (orderData) {
      let subscriptionProductFound = false;
      const lineItems = orderData.line_items;
      lineItems.forEach((lineItem) => {
        if (lineItem.sku.indexOf('TF_SUB') > -1) {
          subscriptionProductFound = true;
        }
      });
      if (subscriptionProductFound) {
        // Subscription order found; create new subscription in MP
        Subscription.create(orderData);
      }
    }
    res.end();
  },

  updateCard(params, req, res) {
    const cardDetails = req.body;
    let statusCode = 400;
    const updateResponse = {};
    if (cardDetails) {
      try {
        const customer = StripeHelper.updateCard({
          customerId: cardDetails.customerId,
          tokenId: cardDetails.tokenId,
        });

        // Send new card details back to Shopify
        let defaultCard = customer.sources.data.map((card) => {
          let matchingCard;
          if (card.id === customer.default_source) {
            matchingCard = card;
          }
          return matchingCard;
        });
        defaultCard = defaultCard[0];
        const responseCard = {
          stripeCustomerId: customer.id,
          cardType: defaultCard.brand,
          cardExpYear: defaultCard.exp_year,
          cardExpMonth: defaultCard.exp_month,
          cardLast4: defaultCard.last4,
        };
        ShopifyCustomerApi.updateMetafield({
          customerId: cardDetails.shopifyCustomerId,
          namespace: 'stripe',
          key: 'customer',
          value: JSON.stringify(responseCard),
          valueType: 'string',
        });

        statusCode = 200;
        updateResponse.success = true;
        updateResponse.message = 'Card updated';
        updateResponse.cardDetails = responseCard;
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
        StripeHelper.chargeCard({
          customerId: chargeDetails.stripeCustomerId,
          amount: chargeDetails.amount,
          description: chargeDetails.description,
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

  customerActivationDetails(params, req, res) {
    let statusCode = 400;
    const customerResponse = {
      message: null,
      customer: null,
    };
    if (params && params.query && params.query.email) {
      const customer = ShopifyCustomerApi.findCustomer(params.query.email);
      if (customer) {
        const activationUrl = ShopifyCustomerApi.getActivationUrl(customer.id);
        if (activationUrl) {
          customerResponse.message = 'Activation URL generated';
          customer.activationUrl = activationUrl;
          customerResponse.customer = customer;
        } else {
          customerResponse.message = 'Account already active';
        }
      } else {
        customerResponse.message = 'Unable to find a matching customer';
      }
      statusCode = 200;
    } else {
      customerResponse.message = 'Missing email';
    }
    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(customerResponse));
  },

  _setHeaders(request, response) {
    response.setHeader('Content-Type', 'application/json');
    const allowedOrigins = Meteor.settings.private.cors.allowedOrigins;
    const origin = request.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
  },

  _chargeCustomer(paymentId, payment) {
    let success = false;
    if (paymentId && payment) {
      try {
        const charge = CustomersCollection.chargeCustomer(payment);

        // Updated saved payment details with successful Stripe charge
        // reference information
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'completed', charge, error: null } }
        );

        if (!payment.stripe_customer_id) {
          // Don't send stripe card details back to Shopify for charges
          // placed with an existing Stripe customer ID (since they
          // already have a card in Shopify)
          ShopifyCustomerApi.updateStripeMetafield({ payment, charge });
        }

        success = true;
      } catch (error) {
        // Unable to create Stripe charge so save error details with payment
        // information
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'failed', error, charge: null } }
        );
      }
    }
    return success;
  },

  // async _chargeCustomer(payment) {
  //   return await new Promise((resolve, reject) => {
  //     if (payment) {
  //       let paymentId;
  //       try {
  //         // Save incoming Shopify request payment details for reference
  //         paymentId = Payments.insert(payment);
  //
  //         const charge = CustomersCollection.findAndChargeCustomer(payment);
  //
  //         // Updated saved payment details with successful Stripe charge
  //         // reference information
  //         Payments.update(
  //           { _id: paymentId },
  //           { $set: { status: 'completed', charge, error: null } }
  //         );
  //         resolve();
  //       } catch (error) {
  //         // Unable to create Stripe charge so save error details with payment
  //         // information
  //         if (paymentId) {
  //           Payments.update(
  //             { _id: paymentId },
  //             { $set: { status: 'failed', error, charge: null } }
  //           );
  //         }
  //         reject(error);
  //       }
  //     } else {
  //       reject();
  //     }
  //   });
  // },
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
Picker.route(
  '/customer-activation-details',
  (params, req, res) => RouteHandler.customerActivationDetails(params, req, res)
);

export default RouteHandler;
