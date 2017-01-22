// @flow

const path = require('path');

import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';

const {dialog} = require('electron').remote;

class Landing extends Component {

  constructor(props: Object) {
    super(props);
    this.state = {
      selectedFolder: '',
      selectedFolderLabel: '',
    };
  }

  state: Object;
  selectedFolderField: Object;

  componentWillMount() {
    console.log("landing.js::componentWillMount invoked");
    this.props.onReadGooglePhotos();
  }

  handleLoadGooglePhotos() {
    this.props.onLoadGooglePhotos();
  }

  handleBrowse() {
    const selectedFolders = dialog.showOpenDialog( {
      properties: ['openDirectory'],
      defaultPath: 'e:\\RemovableMedia\\'
    } );
    // console.log(dialog.showOpenDialog({properties: ['openDirectory', 'multiSelections']}));

    if (selectedFolders.length === 1) {
      this.setState({ selectedFolder: selectedFolders[0] });
      this.setState({ selectedFolderLabel: path.basename(selectedFolders[0]) });
    }
  }

  handleMatchPhotos() {

    this.props.onMatchPhotos(this.state.selectedFolder, this.state.selectedFolderLabel);
    hashHistory.push('/matchPhotosProgressContainer');
  }

  render() {

    const self = this;

    const style = {
      marginLeft: '6px',
      marginTop: '6px',
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

          <p>Click Browse, select the folder containing the photos you want to match, then click Match Photos to start the matching process.</p>
          <div>
            <TextField
              ref={(c) => {
                  self.selectedFolderField = c;
                }}
              floatingLabelText="Photos folder"
              floatingLabelFixed={true}
              value={this.state.selectedFolderLabel}
            />

            <RaisedButton
              onClick={this.handleBrowse.bind(this)}
              label="Browse"
              style={style}
            />
            <RaisedButton
              onClick={this.handleMatchPhotos.bind(this)}
              label="Match Photos"
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
  onMatchPhotos: React.PropTypes.func.isRequired,
  onReadGooglePhotos: React.PropTypes.func.isRequired,
  googlePhotos: React.PropTypes.array.isRequired
};

export default Landing;
