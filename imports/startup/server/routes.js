import { Picker } from 'meteor/meteorhacks:picker';
import bodyParser from 'body-parser';
import ShopifyRequest from '../../api/shopify/server/shopify_request';

const RouteHandler = {
  incomingPayment(params, req, res) {
    const shopifyRequest = Object.create(ShopifyRequest);
    shopifyRequest.init(req.body);

    if (shopifyRequest.isSignatureValid()) {

// store request details in payments collection ...


      res.writeHead(302, {
        Location: '/',
      });
    } else {
      // Invalid signature; redirect to shopify
      res.writeHead(302, {
        Location: shopifyRequest.request.x_url_cancel,
      });
    }


    // after successful payment, redirect to x_url_complete with needed response values
    // after successful payment also asynch post to x_url_callback
    // if payment cancelled, redirect to x_url_cancel

    res.end();
  },
};

Picker.middleware(bodyParser.urlencoded({ extended: false }));
Picker.route(
  '/incoming-payment',
  (params, req, res) => RouteHandler.incomingPayment(params, req, res)
);

export default RouteHandler;
