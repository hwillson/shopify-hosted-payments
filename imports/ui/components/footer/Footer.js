import React from 'react';
import { Meteor } from 'meteor/meteor';

const Footer = () => (
  <div className="main__footer">
    <div role="contentinfo" aria-label="Footer">
      <p className="copyright-text">
        All rights reserved&nbsp;
        {Meteor.settings.public.paymentPage.companyName}
      </p>
    </div>
  </div>
);

export default Footer;
