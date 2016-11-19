/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */
/* eslint-disable no-duplicate-imports, import/no-duplicates */

import { Meteor } from 'meteor/meteor';
import { expect } from 'meteor/practicalmeteor:chai';

import getStripePubKey from './methods';

describe('api.environment.methods', function () {
  describe('#getStripePubKey', function () {
    it('should return publishable key', function (done) {
      getStripePubKey.call((error, key) => {
        if (error) {
          done(error);
        } else {
          expect(key).to.not.be.empty;
          if (Meteor.isServer) {
            import StripeKeys from './server/stripe_keys';
            expect(key).to.equal(StripeKeys.public);
          }
          done();
        }
      });
    });
  });
});
