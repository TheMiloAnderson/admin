import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { HashRouter, Route, Switch } from 'react-router-dom';
import configureStore from './state/store';
// Containers
import DefaultLayout from './containers/DefaultLayout';
import HttpsRedirect from 'react-https-redirect';

// Bootstrap the store
var Store = configureStore();

class App extends Component {
  render() {
    return (
      <HttpsRedirect>
        <Provider store={Store}>
          <HashRouter>
            <Switch>
              <Route path="/" name="Home" component={DefaultLayout} />
            </Switch>
          </HashRouter>
        </Provider>
      </HttpsRedirect>
    );
  }
}

export default App;
