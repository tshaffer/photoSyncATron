import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';


class Landing extends Component {

  componentWillMount() {
    console.log("landing.js::componentWillMount invoked");
    this.props.onReadGooglePhotos();
  }

  handleLoadGooglePhotos() {
    this.props.onLoadGooglePhotos();
  }

  handleReadDrivePhotos() {
    const volumeName = this.volumeNameField.input.value;
    this.props.onReadPhotosFromDrive(volumeName);
    hashHistory.push('/matchPhotosProgressContainer');
  }

  render() {

    const self = this;

    const style = {
      marginLeft: '2px',
      marginTop: '2px',
      fontSize: '16px',
    };

    return (

      <MuiThemeProvider>
        <div>

          <h1>PhotoSyncATron</h1>
          <h2>Match backup photos with Google photos</h2>
          <h3>Load Google photos</h3>
          <p>Click on Load from Cloud to load additional Google photos from the cloud (advanced)</p>
          <div>
            <RaisedButton
              onClick={this.handleLoadGooglePhotos.bind(this)}
              label="Load from Cloud"
              style={style}
            />
          </div>

          <h3>Match photos</h3>
          <p>Insert CD/DVD, enter the drive name and click on Match Photos to start the matching process.</p>
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
                label="Match Photos"
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
  googlePhotos: React.PropTypes.array.isRequired
};

export default Landing;
