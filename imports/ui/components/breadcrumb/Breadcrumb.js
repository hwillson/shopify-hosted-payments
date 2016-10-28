import React from 'react';
import { Meteor } from 'meteor/meteor';

const Breadcrumb = () => (
  <ul className="breadcrumb ">
    <li className="breadcrumb__item breadcrumb__item--completed">
      <a
        className="breadcrumb__link"
        href={Meteor.settings.public.paymentPage.cartUrl}
      >
        Cart
      </a>
    </li>
    <li className="breadcrumb__item breadcrumb__item--completed">
      Customer information
    </li>
    <li className="breadcrumb__item breadcrumb__item--completed">
      Shipping method
    </li>
    <li className="breadcrumb__item breadcrumb__item--current">
      Payment method
    </li>
  </ul>
);

export default Breadcrumb;
