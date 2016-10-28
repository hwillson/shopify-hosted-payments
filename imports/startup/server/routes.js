import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';

import ShopifyRequest from '../../api/shopify/server/shopify_request';
import Payments from '../../api/payments/collection';

const RouteHandler = {
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
};

Picker.middleware(bodyParser.json());
Picker.middleware(bodyParser.urlencoded({ extended: false }));

Picker.route(
  '/incoming-payment',
  (params, req, res) => RouteHandler.incomingPayment(params, req, res)
);

// TODO - temp to test webhook
// see if I can read in custom line items added to order to represent subscription
Picker.route('/order-payment', (params, req, res) => {
  console.log(req.body);
});

export default RouteHandler;
