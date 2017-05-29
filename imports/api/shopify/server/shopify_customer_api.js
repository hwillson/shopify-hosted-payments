import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

const ShopifyCustomerApi = {
  findCustomer(email) {
    let customer;
    if (email) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      const response = HTTP.get(
        `${serviceUrl}/customers/search.json`,
        {
          auth: `${apiKey}:${apiPass}`,
          query: `query=email:${email}`,
        }
      );
      if (response && response.data) {
        const customers = response.data.customers;
        if (customers.length) {
          const loadedCustomer = customers[0];
          customer = {
            id: loadedCustomer.id,
            firstName: loadedCustomer.first_name,
            lastName: loadedCustomer.last_name,
          };
        }
      }
    }
    return customer;
  },

  getActivationUrl(customerId) {
    let activationUrl;
    if (customerId) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      try {
        const response = HTTP.post(
          `${serviceUrl}/customers/${customerId}/account_activation_url.json`,
          {
            auth: `${apiKey}:${apiPass}`,
          }
        );
        if (response && response.data && response.data.account_activation_url) {
          activationUrl = response.data.account_activation_url;
        }
      } catch (error) {
        activationUrl = null;
      }
    }
    return activationUrl;
  },

  updateMetafield({ customerId, namespace, key, value, valueType }) {
    if (customerId && namespace && key && value && valueType) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      HTTP.call(
        'POST',
        `${serviceUrl}/customers/${customerId}/metafields.json`,
        {
          auth: `${apiKey}:${apiPass}`,
          data: {
            metafield: {
              key,
              value,
              value_type: valueType,
              namespace,
            },
          },
        }
      );
    }
  },

  updateStripeMetafield({ payment, charge }) {
    if (payment && charge) {
      const email = payment.x_customer_email || payment.email;
      const customer = this.findCustomer(email);
      if (customer) {
        this.updateMetafield({
          customerId: customer.id,
          namespace: 'stripe',
          key: 'customer',
          value: JSON.stringify({
            stripeCustomerId: charge.customer,
            cardType: charge.source.brand,
            cardExpYear: charge.source.exp_year,
            cardExpMonth: charge.source.exp_month,
            cardLast4: charge.source.last4,
          }),
          valueType: 'string',
        });
      }
    }
  },

  getCustomerMetadata(shopifyCustomerId) {
    const customerMetadata = {};
    if (shopifyCustomerId) {
      const serviceUrl = Meteor.settings.private.shopifyServiceUrl;
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiPass = process.env.SHOPIFY_API_PASS;
      const response = HTTP.get(
        `${serviceUrl}/customers/${shopifyCustomerId}/metafields.json`,
        {
          auth: `${apiKey}:${apiPass}`,
        }
      );
      if (response && response.data) {
        const metafields = response.data.metafields;
        if (metafields.length) {
          metafields.forEach((metafield) => {
            if (metafield.namespace === 'stripe'
                && metafield.key === 'customer') {
              customerMetadata.stripe = JSON.parse(metafield.value);
            } else if (metafield.namespace === 'moreplease'
                && metafield.key === 'subscription_id') {
              customerMetadata.subscriptionId = metafield.value;
            }
          });
        }
      }
    }
    return customerMetadata;
  },
};

export default ShopifyCustomerApi;
