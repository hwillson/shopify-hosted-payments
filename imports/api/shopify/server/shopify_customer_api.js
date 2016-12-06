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
};

export default ShopifyCustomerApi;
