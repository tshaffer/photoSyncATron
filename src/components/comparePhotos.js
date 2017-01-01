import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

class ComparePhotos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      diskImage: '',
      googleImage: '',
      drivePhotoIndex: 0,
      googlePhotoIndex: 0,
      remainingPhotosToCompare: 0
    };
  }

  componentWillMount() {

    debugger;

    console.log("comparePhotos.js::componentWillMount");
    console.log(this.props.photoCompareList);

    this.numDrivePhotosToCompare = this.props.photoCompareList.length;
    this.setState({drivePhotoIndex: 0});

    this.numGooglePhotosToCompare = this.props.photoCompareList[this.state.drivePhotoIndex].photoList.length;
    this.setState({googlePhotoIndex: 0});

    this.setState({remainingPhotosToCompare: this.numDrivePhotosToCompare});

    this.updatePhotosToCompare();
  }

  updatePhotosToCompare() {
    const diskImage = this.props.photoCompareList[this.state.drivePhotoIndex].baseFile;
    const googleImage =
      this.props.photoCompareList[this.state.drivePhotoIndex].photoList[this.state.googlePhotoIndex].url;

    this.setState({
      diskImage,
      googleImage
    });
  }

  moveToNextDrivePhoto() {
    this.setState({drivePhotoIndex: this.state.drivePhotoIndex + 1});
    this.setState({googlePhotoIndex: 0});
    this.setState({remainingPhotosToCompare: this.numDrivePhotosToCompare - this.state.drivePhotoIndex});
  }

  handlePhotosMatch() {
    console.log('handlePhotosMatch');

    // mark this drive photo as matching
    this.props.matchFound(this.props.photoCompareList[this.state.drivePhotoIndex].baseFile);

    this.moveToNextDrivePhoto();
    if (this.state.drivePhotoIndex >= this.numDrivePhotosToCompare) {
      console.log("all comparisons complete - do something");
    }
    else {
      this.updatePhotosToCompare();
    }
  }

  handlePhotosDontMatch() {
    console.log('handleDontPhotosMatch');

    const nextGooglePhotoIndex = this.state.googlePhotoIndex + 1;
    if (nextGooglePhotoIndex >= this.numGooglePhotosToCompare) {

      // mark this photo as not matching
      this.props.noMatchFound(this.props.photoCompareList[this.state.drivePhotoIndex].baseFile);

      this.moveToNextDrivePhoto();
      if (this.state.drivePhotoIndex >= this.numDrivePhotosToCompare) {
        console.log("all comparisons complete - do something");
        return;
      }
    }
    else {
      this.setState({googlePhotoIndex: this.state.googlePhotoIndex + 1});
    }
    this.updatePhotosToCompare();
  }

  handleSaveResults() {
    console.log('handleSaveResults');
    this.props.saveResults();
  }

  handleSaveResultsOnCompletion() {
    console.log('handleSaveResultsOnCompletion');
    this.props.saveResults();
    hashHistory.push('/');
  }

  handleDiscardResultsOnCompletion() {
    console.log('handleDiscardResultsOnCompletion');
    hashHistory.push('/');
  }

  getDriveImageJSX() {
    return this.props.photoCompareList[this.state.drivePhotoIndex].baseFile;
  }

  getGoogleImageJSX() {

    const googlePhoto = this.props.photoCompareList[this.state.drivePhotoIndex].photoList[this.state.googlePhotoIndex];

    let dtStr;
    const exifDateTime = googlePhoto.exifDateTime;
    if (exifDateTime === '') {
      dtStr = googlePhoto.dateTime;
    }
    else {
      dtStr = exifDateTime;
    }

    return googlePhoto.name + ' from ' + dtStr;
  }

  getImagesJSX() {

    /*
    file on drive:
      this.props.photoCompareList[this.drivePhotoIndex].baseFile
    google file:
      this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex]
      object properties that are of interest:
        name
        exifDateTime if not ''; else dateTime.
     */
    if (this.state.remainingPhotosToCompare > 0) {
      return (
        <div>
          <div className="allImages">
            <img
              className="leftImage"
              src={this.state.diskImage}
            />
            <img
              className="rightImage"
              src={this.state.googleImage}
            />
          </div>
          <div className="clear" />
          <p>Photo on left: {this.getDriveImageJSX()}</p>
          <p>Photo on right: {this.getGoogleImageJSX()}</p>
        </div>
      );
    }
    else {
      return (
        <h3>Comparisons complete - save or discard the results.</h3>
      );
    }
  }

  getUIJSX() {

    const leftButtonStyle = {
      marginLeft: '2px',
      marginTop: '4px',
      fontSize: '12px',
    };

    const style = {
      marginLeft: '8px',
      marginTop: '4px',
      fontSize: '12px',
    };

    if (this.state.remainingPhotosToCompare > 0) {
      return (
        <div>
          <RaisedButton
            label="Photos Match"
            onClick={this.handlePhotosMatch.bind(this)}
            style={leftButtonStyle}
          />
          <RaisedButton
            label="Photos Don't Match"
            onClick={this.handlePhotosDontMatch.bind(this)}
            style={style}
          />
          <RaisedButton
            label="Save Results"
            onClick={this.handleSaveResults.bind(this)}
            style={style}
          />
        </div>
      );
    }
    else {
      return (
        <div>
          <RaisedButton
            label="Save Results"
            onClick={this.handleSaveResultsOnCompletion.bind(this)}
            style={leftButtonStyle}
          />
          <RaisedButton
            label="Discard Results"
            onClick={this.handleDiscardResultsOnCompletion.bind(this)}
            style={style}
          />
        </div>
      );
    }
  }

  render () {

    const imagesJSX = this.getImagesJSX();
    const uiJSX = this.getUIJSX();

    return (
      <MuiThemeProvider>
        <div>
          <div>
            <h3>Compare photos on drive for possible matches</h3>
            <span>
              Remaining drive photos to compare: {this.state.remainingPhotosToCompare}
            </span>
          </div>
          {imagesJSX}
          <div className="clear" />
          {uiJSX}
        </div>
      </MuiThemeProvider>
    );
  }
}

ComparePhotos.propTypes = {
  photoCompareList: React.PropTypes.array.isRequired,
  saveResults: React.PropTypes.func.isRequired,
  matchFound: React.PropTypes.func.isRequired,
  noMatchFound: React.PropTypes.func.isRequired,
};


export default ComparePhotos;
