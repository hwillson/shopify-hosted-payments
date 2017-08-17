import React from 'react';
import { StyleSheet, css } from 'aphrodite';

let styles;

const UpdateCardButton = () => (
  <a
    href="#update-card"
    className={css(styles.button)}
    onClick={this.openStripeCheckout}
  >
    Update your credit card
  </a>
);

styles = StyleSheet.create({
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
});

export default UpdateCardButton;
