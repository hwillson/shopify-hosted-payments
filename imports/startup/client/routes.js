import React from 'react';
import { Router, Route, browserHistory } from 'react-router';

import UpdateCardPage from '../../ui/pages/UpdateCardPage';

const renderRoutes = () => (
  <Router history={browserHistory}>
    <Route path="app">
      <Route
        path="update-card/:email"
        component={UpdateCardPage}
      />
    </Route>
  </Router>
);

export default renderRoutes;
