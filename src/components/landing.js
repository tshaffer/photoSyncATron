import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';


class Landing extends Component {

  componentWillMount() {
    console.log("landing.js::componentWillMount invoked");
  }


  handleLoadGooglePhotos() {
    this.props.onLoadGooglePhotos();
  }

  render() {

    const style = {
      marginLeft: '2px',
      marginTop: '16px',
      fontSize: '16px',
    };

    return (

      <MuiThemeProvider>
        <div>
          <div>Pizza</div>
          <div>
            <RaisedButton
              onClick={this.handleLoadGooglePhotos.bind(this)}
              label="Load Google Photos"
              style={style}
            />
          </div>
        </div>
      </MuiThemeProvider>
    );
  }

}

Landing.propTypes = {
  onLoadGooglePhotos: React.PropTypes.func.isRequired,
};

export default Landing;
