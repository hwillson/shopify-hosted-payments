import React from 'react';

const paymentCurrency = (payment) => {
  let currency;
  if (payment && payment.x_currency) {
    currency = payment.x_currency;
  }
  return currency;
};

const paymentAmount = (payment) => {
  let amount = '...';
  if (payment && payment.x_amount) {
    amount = `$${payment.x_amount}`;
  }
  return amount;
};

const Sidebar = ({ payment }) => (
  <div className="sidebar" role="complementary">
    <div className="sidebar__content">
      <div className="order-summary order-summary--is-collapsed">
        <h2 className="visually-hidden">Order summary</h2>
        <div className="order-summary__sections">
          <div className="order-summary__section order-summary__section--total-lines">
            <table className="total-line-table">
              <caption className="visually-hidden">Cost summary</caption>
              <tfoot className="total-line-table__footer">
                <tr className="total-line">
                  <td className="total-line__name payment-due-label">
                    <span className="payment-due-label__total">Total</span>
                  </td>
                  <td className="total-line__price payment-due">
                    <span className="payment-due__currency">
                      {paymentCurrency(payment)}
                    </span>
                    <span className="payment-due__price">
                      {paymentAmount(payment)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Sidebar.propTypes = {
  payment: React.PropTypes.object,
};

export default Sidebar;
