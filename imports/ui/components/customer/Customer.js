import React from 'react';

const shippingAddress = (payment) => {
  let content = (<p>...</p>);
  if (payment) {
    content = (
      <p>
        {payment.x_customer_first_name} {payment.x_customer_last_name}
        <br />
        {payment.x_customer_shipping_address1}
        <br />
        {payment.x_customer_shipping_city}&nbsp;
        {payment.x_customer_shipping_state}&nbsp;
        {payment.x_customer_shipping_zip}
        <br />
        {payment.x_customer_shipping_country}
      </p>
    );
  }
  return content;
};

const billingAddress = (payment) => {
  let content = (<p>...</p>);
  if (payment) {
    content = (
      <p>
        {payment.x_customer_first_name} {payment.x_customer_last_name}
        <br />
        {payment.x_customer_billing_address1}
        <br />
        {payment.x_customer_billing_city}&nbsp;
        {payment.x_customer_billing_state}&nbsp;
        {payment.x_customer_billing_zip}
        <br />
        {payment.x_customer_billing_country}
      </p>
    );
  }
  return content;
};

const Customer = ({ payment }) => (
  <div className="content-box">
    <div className="content-box__row content-box__row--no-border">
      <h2>Customer information</h2>
    </div>
    <div className="content-box__row">
      <div className="section__content">
        <div className="section__content__column section__content__column--half">
          <h3>Shipping address</h3>
          {shippingAddress(payment)}
        </div>
        <div className="section__content__column section__content__column--half">
          <h3>Billing address</h3>
          {billingAddress(payment)}
        </div>
      </div>
    </div>
  </div>
);

Customer.propTypes = {
  payment: React.PropTypes.object,
};

export default Customer;
