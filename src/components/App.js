import React, { Component } from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

// import Encoder from '../components/encoder';

export default class App extends Component {

  componentDidMount() {
    console.log("app.js::componentDidMount invoked");
  }

  render() {

    return (
      <MuiThemeProvider>
        <div>pizza</div>
      </MuiThemeProvider>
    );
  }
}


