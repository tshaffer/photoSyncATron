import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';


class Landing extends Component {

  componentWillMount() {
    console.log("landing.js::componentWillMount invoked");
  }

  handleLoadGooglePhotos() {
    this.props.onLoadGooglePhotos();
  }

  handleReadGooglePhotos() {
    this.props.onReadGooglePhotos();
  }

  handleReadDrivePhotos() {
    const volumeName = this.volumeNameField.input.value;
    this.props.onReadPhotosFromDrive(volumeName);
  }

  render() {

    const self = this;

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
              label="Load Photos from Cloud"
              style={style}
            />
            <RaisedButton
              onClick={this.handleReadGooglePhotos.bind(this)}
              label="Load Photos from File"
              style={style}
            />
          </div>

          <div>
            <div id="volumeName">
              <TextField
                ref={(c) => {
                  self.volumeNameField = c;
                }}
                defaultValue={""}
                floatingLabelText="Volume name"
                floatingLabelFixed={true}
              />
              <RaisedButton
                onClick={this.handleReadDrivePhotos.bind(this)}
                label="Read Photos from Drive"
                style={style}
              />

            </div>
          </div>

        </div>

      </MuiThemeProvider>
    );
  }

}

Landing.propTypes = {
  onLoadGooglePhotos: React.PropTypes.func.isRequired,
  onReadPhotosFromDrive: React.PropTypes.func.isRequired,
  onReadGooglePhotos: React.PropTypes.func.isRequired,
};

export default Landing;
