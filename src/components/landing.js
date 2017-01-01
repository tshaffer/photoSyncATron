import React, { Component } from 'react';
import { hashHistory } from 'react-router';

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

  handleComparePhotos() {
    console.log("handleComparePhotos: ");
    console.log(this.props.googlePhotos[0].url);
    console.log(this.props.googlePhotos[1].url);
    let images = [];
    images.push(encodeURIComponent(this.props.googlePhotos[0].url));
    images.push(encodeURIComponent(this.props.googlePhotos[1].url));

    hashHistory.push('/comparePhotos/' + images);
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
            <RaisedButton
              onClick={this.handleComparePhotos.bind(this)}
              label="Compare Photos"
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
  googlePhotos: React.PropTypes.array.isRequired
};

export default Landing;
