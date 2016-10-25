import React from 'react';
import { StyleSheet, css } from 'aphrodite';

let styles;

const Logo = ({ logoUrl }) => (
  <img
    className={css(styles.logo)}
    src={logoUrl}
    alt="Company Logo"
  />
);

Logo.propTypes = {
  logoUrl: React.PropTypes.string.isRequired,
};

styles = StyleSheet.create({
  logo: {
    width: '200px',
    margin: '20px',
  },
});

export default Logo;
