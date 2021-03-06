import { HTTP } from 'meteor/http';

const loyaltyLion = {
  apiUrl: 'https://api.loyaltylion.com/v2',
  subscriptionTierId: 123,
  goldTierId: 121,

  updateTier({ customerId, tierId }) {
    const auth = this.getBasicAuthString();
    if (auth && customerId && tierId) {
      try {
        HTTP.post(`${this.apiUrl}/customers/${customerId}/change_tier`, {
          auth,
          params: {
            tier_id: tierId,
          },
        });
      } catch (error) {
        // Happens when the passed in customer can't be found in LoyaltyLion.
        // Swallow this error for now.
      }
    }
  },

  changeToSubscriptionTier(customerId) {
    if (customerId) {
      this.updateTier({ customerId, tierId: this.subscriptionTierId });
    }
  },

  changeToGoldTier(customerId) {
    if (customerId) {
      this.updateTier({ customerId, tierId: this.goldTierId });
    }
  },

  getBasicAuthString() {
    const token = process.env.LOYALTY_LION_TOKEN;
    const secret = process.env.LOYALTY_LION_SECRET;
    return (token && secret) ? `${token}:${secret}` : null;
  },
};

export default loyaltyLion;
