import { Meteor } from 'meteor/meteor';
import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';

import ShopifyRequest from '../../api/shopify/server/shopify_request';
import ShopifyCustomerApi from '../../api/shopify/server/shopify_customer_api';
import shopifyOrderApi from '../../api/shopify/server/shopify_order_api';
import Payments from '../../api/payments/collection';
import ShopifyResponse from '../../api/shopify/server/shopify_response';
import CustomersCollection from '../../api/customers/collection';
import Subscription from '../../api/subscriptions/server/subscription';
import StripeHelper from '../../api/cards/server/stripe_helper';
import klaviyo from '../../api/klaviyo/server/klaviyo';
import {
  recordDripEvent,
  updateDripSubscriber
} from '../../api/drip/server/drip';
import tokensCollection from '../../api/tokens/collection';
import bugsnag from '../../api/bugsnag/server/bugsnag';

const pendingTransactions = {};

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
        Location: `/?id=${paymentId}`
      });
    } else {
      // Invalid signature; redirect to shopify
      res.writeHead(302, {
        Location: shopifyRequest.request.x_url_cancel
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

    // Log incoming Shopify request payment details for reference
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
        Location: `${payment.x_url_complete}?${shopifyResponse.queryString()}`
      });
    } else {
      const failedUrl = payment.x_url_complete.replace(
        '/offsite_gateway_callback',
        '?step=payment_method&failed=1'
      );
      res.writeHead(302, { Location: failedUrl });
    }

    res.end();
  },

  saveToken(params, req, res) {
    let statusCode = 400;
    const saveTokenResponse = {};
    if (req.body && req.body.email && req.body.token) {
      const email = req.body.email;
      const token = req.body.token;
      const paymentMethod = req.body.paymentMethod;
      try {
        tokensCollection.upsert(
          { email },
          { $set: { email, token, paymentMethod } }
        );
        statusCode = 200;
        saveTokenResponse.success = true;
        saveTokenResponse.message = 'Token saved';
      } catch (error) {
        saveTokenResponse.success = false;
        saveTokenResponse.message = 'Problem saving token';
        saveTokenResponse.error = error;
        bugsnag.notify(error, saveTokenResponse);
      }
    } else {
      saveTokenResponse.success = false;
      saveTokenResponse.message = 'Missing email/token details';
      bugsnag.notify(new Error(saveTokenResponse.message), saveTokenResponse);
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(saveTokenResponse));
  },

  subscriptionPurchase(params, req, res) {
    const payment = req.body;
    let statusCode = 400;
    const paymentResponse = {};
    if (
      payment &&
      payment.email &&
      payment.stripe_token &&
      payment.total_price
    ) {
      try {
        payment.timestamp = new Date();

        // See if a matching payment already exists, and has been processed.
        // If so, skip this payment. This is a safeguard to make sure a double
        // submit for the exact same order isn't processed and billed for
        // twice.
        if (
          payment.checkout_token &&
          Payments.findOne({
            email: payment.email,
            total_price: payment.total_price,
            checkout_token: payment.checkout_token,
            status: 'completed'
          })
        ) {
          statusCode = 200;
          paymentResponse.success = true;
          paymentResponse.message = 'Card already charged; not charged again.';
        } else if (pendingTransactions[payment.checkout_token]) {
          // This is a second duplicate transaction safeguard, in-case the
          // first one fails. Each Shopify checkout has a unique ID, which
          // we track in a map to prevent duplicate purchases for the same
          // checkout.
          paymentResponse.success = false;
          paymentResponse.message = 'Duplicate transaction.';
        } else {
          // Charge the customer.
          pendingTransactions[payment.checkout_token] = true;
          const paymentId = Payments.insert(payment);
          if (this._chargeCustomer(paymentId, payment)) {
            statusCode = 200;
            paymentResponse.success = true;
            paymentResponse.message = 'Card charged.';
          } else {
            paymentResponse.success = false;
            paymentResponse.message = 'Unable to charge card.';
          }
        }
      } catch (error) {
        paymentResponse.success = false;
        paymentResponse.message = 'Unable to charge card.';
        paymentResponse.details = error;
      }
    } else {
      paymentResponse.success = false;
      paymentResponse.message = 'Missing payment details.';
    }

    if (payment && payment.checkout_token) {
      delete pendingTransactions[payment.checkout_token];
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(paymentResponse));
  },

  createSubscription(params, req, res) {
    const order = req.body;
    if (order) {
      // See if the incoming order contains a subscription product and/or
      // a club based customer discount product.
      let subscriptionProductFound = false;
      let discountClubProductFound = false;
      const lineItems = order.line_items;
      lineItems.forEach(lineItem => {
        if (lineItem.sku && lineItem.sku.startsWith('TF_SUB')) {
          subscriptionProductFound = true;
        }
        if (lineItem.sku && lineItem.sku.startsWith('TF_CLUB')) {
          discountClubProductFound = true;
        }
      });

      let payment;
      if (discountClubProductFound) {
        // If the incoming order doesn't include a subscription but does
        // include a discount club product purchase, make sure the discount
        // club details are sent into the subscription system, and associated
        // with a customer (creating the customer if necessary). This will not
        // create a full subscription.
        Subscription.createCustomerDiscount(order);
      } else {
        payment = Payments.recentPaymentCompleted(order.email);
        if (payment) {
          // Save the incoming order ID with the received payment, for future
          // reference.
          Payments.update(
            {
              email: order.email,
              order_id: { $exists: false },
              status: 'completed'
            },
            {
              $set: {
                order_id: order.id
              }
            }
          );
        }

        if (subscriptionProductFound) {
          // Create a new subscription in the external subscription handling
          // system. If a club discount product is included, it will be handled
          // by the subscription system at the same time.
          Subscription.create(order);
        }
      }

      if (payment) {
        let amountPaid = 0;
        if (
          payment.gateway === 'spreedly' &&
          payment.charge &&
          payment.charge.data &&
          payment.charge.data.transaction &&
          payment.charge.data.transaction.succeeded
        ) {
          // Spreedly
          amountPaid = payment.charge.data.transaction.amount;
        } else {
          // Stripe
          amountPaid = payment.charge.amount;
        }
        // If payment was received, let Shopify know the order has been paid
        // for. Otherwise leave the order in `pending` status.
        shopifyOrderApi.markOrderAsPaid(order.id, amountPaid / 100);
      }
    }
    res.end();
  },

  incomingPaymentWithoutToken(params, req, res) {
    const shopifyRequest = Object.create(ShopifyRequest);
    shopifyRequest.init(req.body);
    const payment = shopifyRequest.request;
    payment.timestamp = new Date();

    const failureRedirect = () => {
      const failedUrl = payment.x_url_complete.replace(
        '/offsite_gateway_callback',
        '?step=payment_method&failed=1'
      );
      res.writeHead(302, { Location: failedUrl });
    };

    // First try to find the customers previously saved stripe token
    const tokenData = tokensCollection.findOne({
      email: payment.x_customer_email
    });
    if (tokenData && tokenData.token) {
      // Token found, so we're processing a new credit card purchase
      payment.stripe_token = tokenData.token;
    } else {
      // If no previously saved token, then see if a matching customer can
      // be found with a saved stripe customer ID (this means we're processing
      // a payment with a saved credit card).
      const customer = CustomersCollection.findOne({
        email: payment.x_customer_email
      });
      if (customer && customer.stripeCustomerId) {
        payment.stripe_customer_id = customer.stripeCustomerId;
      }
    }

    if (payment.stripe_token || payment.stripe_customer_id) {
      // Log incoming Shopify request payment details for reference
      const paymentId = Payments.insert(payment);

      let shopifyResponse;
      if (shopifyRequest.isSignatureValid()) {
        if (this._chargeCustomer(paymentId, payment, tokenData)) {
          // Prepare response data and post back to Shopify
          shopifyResponse = Object.create(ShopifyResponse);
          shopifyResponse.init(payment);
        }
      } else {
        bugsnag.notify(
          new Error('Shopify request signature validation has failed.'),
          payment
        );
      }

      if (shopifyResponse) {
        res.writeHead(302, {
          Location: `${payment.x_url_complete}?${shopifyResponse.queryString()}`
        });
      } else {
        failureRedirect();
      }
    } else {
      bugsnag.notify(
        new Error('Missing stripe token and stripe customer ID'),
        payment
      );
      failureRedirect();
    }

    // Clear any previously saved stripe tokens for the payment customer,
    // since token use is one-time
    if (payment.stripe_token) {
      tokensCollection.remove({ email: payment.x_customer_email });
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
          tokenId: cardDetails.tokenId
        });

        // Send new card details back to Shopify
        ShopifyCustomerApi.updateMetafield({
          customerId: cardDetails.shopifyCustomerId,
          namespace: 'stripe',
          key: 'customer',
          value: JSON.stringify(customer.primaryCard),
          valueType: 'string'
        });

        // Send the returned Stripe Customer ID back into the subscription
        // system, in-case it has been changed.
        Subscription.updateCustomer({
          externalId: cardDetails.shopifyCustomerId,
          stripeCustomerId: customer.primaryCard.stripeCustomerId
        });

        statusCode = 200;
        updateResponse.success = true;
        updateResponse.message = 'Card updated';
        updateResponse.cardDetails = customer.primaryCard;
      } catch (error) {
        updateResponse.success = false;
        updateResponse.message = 'Unable to update card';
        updateResponse.details = error;
        bugsnag.notify(error, updateResponse);
      }
    } else {
      updateResponse.success = false;
      updateResponse.message = 'Missing card details.';
      bugsnag.notify(new Error(updateResponse.message), updateResponse);
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(updateResponse));
  },

  chargeCard(params, req, res) {
    const chargeDetails = req.body;
    let statusCode = 400;
    const chargeResponse = {
      success: false,
      message: 'Missing charge details.'
    };
    if (chargeDetails) {
      try {
        const charge = StripeHelper.chargeCard({
          customerId: chargeDetails.stripeCustomerId,
          amount: chargeDetails.amount,
          description: chargeDetails.description
        });
        if (charge) {
          statusCode = 200;
          chargeResponse.success = true;
          chargeResponse.message = 'Card charged.';
        }
      } catch (error) {
        chargeResponse.success = false;
        chargeResponse.message = 'Unable to charge card.';
        chargeResponse.details = error;
      }
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
      customer: null
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

  orderCancelled(params, req, res) {
    const order = req.body;
    if (order && order.id) {
      Payments.refund(order.id);
    }
    res.end();
  },

  subscriptionEvent(params, req, res) {
    const reqData = req.body;
    if (reqData && reqData.data) {
      const eventData = JSON.parse(reqData.data);
      recordDripEvent(eventData);
      updateDripSubscriber(eventData);
      klaviyo.trackEvent(eventData);
    }
    res.end();
  },

  updateCustomer(params, req, res) {
    const customerDetails = req.body;
    let statusCode = 400;
    const updateResponse = {};
    if (
      customerDetails &&
      customerDetails.email &&
      customerDetails.stripeCustomerId
    ) {
      try {
        CustomersCollection.upsert(
          {
            email: customerDetails.email
          },
          {
            $set: {
              stripeCustomerId: customerDetails.stripeCustomerId
            }
          }
        );
        statusCode = 200;
        updateResponse.success = true;
        updateResponse.message = 'Customer updated';
      } catch (error) {
        updateResponse.success = false;
        updateResponse.message = 'Unable to update customer';
        updateResponse.details = error;
        bugsnag.notify(error, updateResponse);
      }
    } else {
      updateResponse.success = false;
      updateResponse.message = 'Missing customer details';
      bugsnag.notify(new Error(updateResponse.message), updateResponse);
    }

    const response = res;
    this._setHeaders(req, response);
    response.statusCode = statusCode;
    response.end(JSON.stringify(updateResponse));
  },

  _setHeaders(request, response) {
    response.setHeader('Content-Type', 'application/json');
    const allowedOrigins = Meteor.settings.private.cors.allowedOrigins;
    const origin = request.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
  },

  _chargeCustomer(paymentId, payment, tokenData) {
    let success = false;
    if (paymentId && payment) {
      let charge;
      try {
        charge = CustomersCollection.chargeCustomer(payment);

        // Updated saved payment details with successful Stripe charge
        // reference information
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'completed', charge, error: null } }
        );

        const usingApplePay =
          tokenData && tokenData.paymentMethod === 'apple-pay';
        if (
          !payment.stripe_customer_id &&
          !usingApplePay &&
          payment.gateway !== 'spreedly'
        ) {
          // - Don't send stripe card details back to Shopify for charges
          // placed with an existing Stripe customer ID (since they
          // already have a card in Shopify)
          // - Don't send stripe details back for Apple Pay purchases, since
          // Apple Pay card details can be retrieved using Apple Pay again
          // at checkout
          ShopifyCustomerApi.updateStripeMetafield({ payment, charge });
        } else if (payment.gateway === 'spreedly') {
          ShopifyCustomerApi.updateSpreedlyMetafield({ payment, charge });
        }

        success = true;
      } catch (error) {
        bugsnag.notify(error, { paymentId, payment, error });
        // Unable to create Stripe charge so save error details with payment
        // information
        Payments.update(
          { _id: paymentId },
          { $set: { status: 'failed', error, charge } }
        );
        throw error;
      }
    }
    return success;
  }
};

Picker.middleware(bodyParser.json());
Picker.middleware(bodyParser.urlencoded({ extended: false }));

Picker.route('/incoming-payment', (params, req, res) =>
  RouteHandler.incomingPayment(params, req, res)
);

Picker.route('/incoming-payment-with-token', (params, req, res) =>
  RouteHandler.incomingPaymentWithToken(params, req, res)
);

Picker.route('/save-token', (params, req, res) =>
  RouteHandler.saveToken(params, req, res)
);

Picker.route('/incoming-payment-without-token', (params, req, res) =>
  RouteHandler.incomingPaymentWithoutToken(params, req, res)
);

Picker.route('/subscription-purchase', (params, req, res) =>
  RouteHandler.subscriptionPurchase(params, req, res)
);

Picker.route('/create-subscription', (params, req, res) =>
  RouteHandler.createSubscription(params, req, res)
);

Picker.route('/update-card', (params, req, res) =>
  RouteHandler.updateCard(params, req, res)
);

Picker.route('/charge-card', (params, req, res) =>
  RouteHandler.chargeCard(params, req, res)
);

Picker.route('/customer-activation-details', (params, req, res) =>
  RouteHandler.customerActivationDetails(params, req, res)
);

Picker.route('/order-cancelled', (params, req, res) =>
  RouteHandler.orderCancelled(params, req, res)
);

Picker.route('/subscription-event', (params, req, res) =>
  RouteHandler.subscriptionEvent(params, req, res)
);

Picker.route('/update-customer', (params, req, res) =>
  RouteHandler.updateCustomer(params, req, res)
);

export default RouteHandler;
