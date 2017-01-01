'use strict';

import thunkMiddleware from 'redux-thunk';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, hashHistory } from 'react-router';
import { Route } from 'react-router';
import injectTapEventPlugin from 'react-tap-event-plugin';

import reducers from './reducers';

import App from './components/app';
import MatchPhotosProgressContainer from './containers/matchPhotosProgressContainer';
import ComparePhotos from './components/comparePhotos';

const store = createStore(
  reducers,
  applyMiddleware(
    thunkMiddleware
  )
);

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

ReactDOM.render(
  <Provider store={store}>
    <Router history={hashHistory}>
      <Route path="/" component={App} />
      <Route path="/matchPhotosProgressContainer" component={MatchPhotosProgressContainer}/>
      <Route path="/comparePhotos/:images" component={ComparePhotos}/>
    </Router>
  </Provider>
  , document.getElementById('content'));
