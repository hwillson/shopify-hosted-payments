# shopify-hosted-payments

Meteor based hosted payment system for Shopify. Provides a hosted payment page using Stripe that can be used with Shopify's [Hosted Payment SDK](https://help.shopify.com/api/sdks/hosted-payment-sdk).

## 1. Prerequisites

To use this system you will need a valid Stripe account, as it uses Stripe's embedded payment form, [Checkout](https://stripe.com/checkout).

## 2. Installation

```
git clone https://github.com/hwillson/shopify-hosted-payments.git
cd shopify-hosted-payments
meteor npm install
```

## 3. Running

### Development

First get your Stripe "Test Publishable Key" from the Stripe admin. The run the following:

```
STRIPE_KEY=pk_test_jNAR8E9b213jKUd32gfRpRo meteor npm start
```

You can then access the hosted payment page at [http://localhost:3000](). Stripe keys are intentionally not committed to Git.

### Production

TODO

## 4. Customization

Application settings are controlled via the `/config/settings*.json` files. When running locally the `/config/settings-dev.json` file is used. When running in production `/config/settings.json` is used. The default checkout of this app includes basic defaults for all settings. Override settings to quickly customize the look and feel of the hosted payment page. All available settings are explained below.

### settings.json

```
{
  "public": {
    "paymentPage": {            
      // Shown on the Stripe checkout form
      "companyName": "Some Company Inc.",
    
      // Shown in the top left corner of the payment page
      "companyLogoUrl": "https://www.somesite.com/some-logo.png",
      
      // Shown centered on the payment page
      "backgroundImageUrl": "https://www.somesite.com/some-bg-image.jpg",
      
      // Redirect if Stripe checkout popup is closed
      "closedRedirectUrl": "https://www.somesite.com/cart/"
    }  
  }
}
```