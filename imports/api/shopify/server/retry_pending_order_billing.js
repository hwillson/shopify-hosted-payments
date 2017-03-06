import StripeHelper from '../../cards/server/stripe_helper';
import ShopifyCustomerApi from './shopify_customer_api';
import shopifyOrderApi from './shopify_order_api';


const retryPendingOrderBilling = () => {
  const pendingOrders = shopifyOrderApi.getPendingOrders();
  const pendingOrder = pendingOrders[0];
console.log(pendingOrder);
  // pendingOrders.forEach((pendingOrder) => {
    const customerMetadata =
      ShopifyCustomerApi.getCustomerMetadata(pendingOrder.customer.id);
console.log(customerMetadata);
    if (customerMetadata && customerMetadata.stripe) {
      const stripeCustomerId = customerMetadata.stripe.stripeCustomerId;
      try {
        // StripeHelper.chargeCard({
        //   customerId: stripeCustomerId,
        //   amount: pendingOrder.total_price * 100,
        //   description:
        //     `Re-trying failed charge for order ID ${pendingOrder.id} `
        //     + '(thefeed.com)',
        // });

        shopifyOrderApi.markOrderAsPaid({
          orderId: pendingOrder.id,
          totalPrice: pendingOrder.totalPrice,
        });

        console.log(
          'Pending order billing retry attempt has succeeded for order ID '
          + `${pendingOrder.id}.`
        );
      } catch (error) {
        console.log(
          'Pending order billing retry attempt has failed for order ID '
          + `${pendingOrder.id}. ${error}`
        );
      }
    } else {
      console.log(
        'Shopify does not have any stripe metadata stored for customer ID '
        + `${pendingOrder.customer.id}.`
      );
    }
  // });




  // TODO
  // x- get a list of all pending orders: ShopifyOrderApi.getPendingOrders()
  // x- for each order:
  //     - get stripe meta for customer on order
  //     - try a new stripe charge for the total_price: StripeHelper.chargeCard()
  // x- if successful, update order with "paid" financial_status: ShopifyOrderApi.updateOrder()
  // - run this job every 24 hours
  // - add note to credit card form stating that recently failed orders will be re-processed within 24 hours

};

export default retryPendingOrderBilling;
