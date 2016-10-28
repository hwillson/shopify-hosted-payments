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

Picker.middleware(bodyParser.urlencoded({ extended: false }));
Picker.route(
  '/incoming-payment',
  (params, req, res) => RouteHandler.incomingPayment(params, req, res)
);

export default RouteHandler;
