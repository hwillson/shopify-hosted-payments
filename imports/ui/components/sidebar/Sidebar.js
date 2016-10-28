import React from 'react';

const Sidebar = () => (
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
                    <span className="payment-due__currency">CAD</span>
                    <span className="payment-due__price">
                      $118.00
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

export default Sidebar;
