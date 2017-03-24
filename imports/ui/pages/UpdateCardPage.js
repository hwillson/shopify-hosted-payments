/* global window, StripeCheckout */

import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import { StyleSheet, css } from 'aphrodite';

import getStripePubKey from '../../api/environment/methods';
import updateCard from '../../api/cards/methods';

let styles;

class UpdateCardPage extends Component {
  constructor(props) {
    super(props);
    this.openStripeCheckout = this.openStripeCheckout.bind(this);
    this.state = {
      stripeCheckoutActive: false,
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
    const headerLogo = Meteor.settings.public.paymentPage.paymentGatewayLogo;
    const footerLogo = Meteor.settings.public.paymentPage.footerLogo;
    return (
      <div className="update-card-page">
        <header className={css(styles.header)}>
          <img src={headerLogo} alt="Company logo" />
        </header>
        <section className={css(styles.updateCardContainer)}>
          <a
            href="#update-card"
            className={css(styles.button)}
            onClick={this.openStripeCheckout}
          >
            Update your credit card
          </a>
        </section>
        <footer className={css(styles.footer)}>
          <img
            src={footerLogo}
            alt="Company logo"
            className={css(styles.footerLogo)}
          />
        </footer>
      </div>
    );
  }
}

UpdateCardPage.propTypes = {
  params: React.PropTypes.object.isRequired,
};

styles = StyleSheet.create({
  header: {
    textAlign: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #E5E5E5',
  },
  updateCardContainer: {
    textAlign: 'center',
    paddingTop: '60px',
  },
  button: {
    textTransform: 'uppercase',
    padding: '20px',
    fontSize: '13px',
    borderRadius: '100px',
    display: 'inline-block',
    backgroundColor: '#FEBE43',
    color: '#1c1d1d',
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#0a1620',
    position: 'fixed',
    bottom: 0,
    height: '150px',
    width: '100%',
    paddingTop: '100px',
    textAlign: 'center',
  },
  footerLogo: {
    width: '200px',
  },
});

export default UpdateCardPage;
