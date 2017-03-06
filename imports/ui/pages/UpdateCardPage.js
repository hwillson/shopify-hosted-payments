/* global window, StripeCheckout */

import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

import getStripePubKey from '../../api/environment/methods';
import updateCard from '../../api/cards/methods';

class UpdateCardPage extends Component {
  constructor(props) {
    super(props);
    this.openStripeCheckout = this.openStripeCheckout.bind(this);
    this.state = {
      stripeCheckoutActive: true,
      processingUpdate: false,
    };
  }

  componentDidMount() {
    if (!this.state.processingUpdate) {
      getStripePubKey.call(
        { testMode: true },
        (error, stripeKey) => {
          if (error) {
            throw error;
          } else {
            this.initializeStripeCheckout(stripeKey);
          }
        }
      );
    }
  }

  componentWillUnmount() {
    this.stripeHandler.close();
  }

  initializeStripeCheckout(stripeKey) {
    if (stripeKey) {
      const email = this.props.params.email;
      const self = this;
      this.stripeHandler = StripeCheckout.configure({
        key: stripeKey,
        locale: 'auto',
        token(token) {
          self.setState({
            processingUpdate: true,
          });
          if (token) {
            updateCard.call({
              tokenId: token.id,
              email,
            }, (error) => {
              if (error) {
                console.log(error);
              } else {
                window.location.href =
                  Meteor.settings.public.updateCardPage.doneUrl;
              }
            });
          }
        },
      });

      this.openStripeCheckout();
    }
  }

  openStripeCheckout(event) {
    if (event) {
      event.preventDefault();
    }

    if (this.stripeHandler) {
      this.setState({
        stripeCheckoutActive: true,
      });

      const self = this;
      this.stripeHandler.open({
        name: Meteor.settings.public.paymentPage.companyName,
        description: 'Update your credit card below.',
        panelLabel: 'Update Credit Card',
        email: this.props.params.email,
        allowRememberMe: false,
        closed() {
          if (!self.state.processingUpdate) {
            window.location.href =
              Meteor.settings.public.updateCardPage.doneUrl;
          }
        },
      });
    }
  }

  render() {
    return (
      <div />
    );
  }
}

UpdateCardPage.propTypes = {
  params: React.PropTypes.object.isRequired,
};

export default UpdateCardPage;
