import { Meteor } from 'meteor/meteor';
import bugsnag from 'bugsnag';

bugsnag.register(Meteor.settings.private.bugsnag.key);

export default bugsnag;
