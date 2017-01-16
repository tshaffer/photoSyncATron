// @flow

const path = require('path');
var fs = require('fs-extra');
const childProcess = require('child_process');

import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

// ------------------------------------
// Constants
// ------------------------------------
// const convertCmd = 'convert';
const convertCmd = '/usr/local/Cellar/imagemagick/6.9.7-2/bin/convert';

class ComparePhotos extends Component {

  constructor(props: Object) {
    super(props);
    // this.targetDir = "C:\\Users\\Ted\\Documents\\Projects\\photoSyncATron\\tmpFiles";
    this.targetDir = "/Users/tedshaffer/Documents/Projects/photoSyncATron/tmpFiles";
    this.state = {
      diskImage: '',
      googleImage: '',
      remainingPhotosToCompare: 0
    };
  }

  state: Object;

  componentWillMount() {

    console.log("comparePhotos.js::componentWillMount");
    console.log(this.props.photoCompareList);

    this.numDrivePhotosToCompare = this.props.photoCompareList.length;
    this.drivePhotoIndex = 0;

    this.numGooglePhotosToCompare = this.props.photoCompareList[this.drivePhotoIndex].photoList.length;
    this.googlePhotoIndex = 0;

    this.setState({remainingPhotosToCompare: this.numDrivePhotosToCompare});

    this.updatePhotosToCompare();
  }

  targetDir: string;
  numDrivePhotosToCompare: number;
  drivePhotoIndex: number;
  numGooglePhotosToCompare: number;
  googlePhotoIndex: number;

  convertPhoto(sourcePhoto:string, targetPath) {

    return new Promise( (resolve, reject) => {

      // deal with spaces in the sourcePhoto path as needed.
      let paths = sourcePhoto.split(path.sep);
      paths.forEach( (subPath, index) => {
        if (subPath.indexOf(' ') >= 0) {
          paths[index] = '\"' + subPath + '\"';
        }
      });
      sourcePhoto = "";
      paths.forEach( (subPath) => {
        sourcePhoto += subPath + "/";
      });
      // sourcePhoto = path.join.apply(null, paths);
      sourcePhoto = sourcePhoto.substr(0, sourcePhoto.length - 1);

      let command = convertCmd + " " + sourcePhoto + " " + targetPath;
      console.log(command);
      childProcess.exec(command, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  updatePhotosToCompare() {

    let self = this;

    const googleImage = this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex].url;
    let photoFile = this.props.photoCompareList[this.drivePhotoIndex].baseFile;
    let diskImage = photoFile.path;

    const extension = path.extname(diskImage);
    if (extension === '.tif') {

      const fileNameWithoutExtension = path.basename(diskImage, '.tif');
      const targetPath = path.join(this.targetDir, fileNameWithoutExtension + ".jpg");

      let promise = this.convertPhoto(diskImage, targetPath);
      promise.then( () => {
        self.setState({
          diskImage: targetPath,
          googleImage
        });
      });
    }
    else {
      this.setState({
        diskImage,
        googleImage
      });
    }
  }

  moveToNextDrivePhoto() {
    this.drivePhotoIndex++;
    this.googlePhotoIndex = 0;
    if (this.drivePhotoIndex < this.numDrivePhotosToCompare) {
      this.numGooglePhotosToCompare = this.props.photoCompareList[this.drivePhotoIndex].photoList.length;
    }
    this.setState({remainingPhotosToCompare: this.numDrivePhotosToCompare - this.drivePhotoIndex});
  }

  handlePhotosMatch() {
    console.log('handlePhotosMatch');

    // mark this drive photo as matching
    const googlePhoto = this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex];
    this.props.manualMatchFound(this.props.photoCompareList[this.drivePhotoIndex].baseFile, googlePhoto);

    this.moveToNextDrivePhoto();
    if (this.drivePhotoIndex >= this.numDrivePhotosToCompare) {
      console.log("all comparisons complete - do something");
    }
    else {
      this.updatePhotosToCompare();
    }
  }

  handlePhotosDontMatch() {
    console.log('handleDontPhotosMatch');

    this.googlePhotoIndex++;
    if (this.googlePhotoIndex >= this.numGooglePhotosToCompare) {

      // mark this photo as not matching
      this.props.noMatchFound(this.props.photoCompareList[this.drivePhotoIndex].baseFile);

      this.moveToNextDrivePhoto();
      if (this.drivePhotoIndex >= this.numDrivePhotosToCompare) {
        console.log("all comparisons complete - do something");
        return;
      }
    }
    this.updatePhotosToCompare();
  }

  handleSaveResults() {
    console.log('handleSaveResults');
    this.emptyTmpDir();
    this.props.saveResults();
  }

  handleSaveResultsOnCompletion() {
    console.log('handleSaveResultsOnCompletion');
    this.emptyTmpDir();
    this.props.saveResults();
    hashHistory.push('/');
  }

  handleDiscardResultsOnCompletion() {
    console.log('handleDiscardResultsOnCompletion');
    this.emptyTmpDir();
    hashHistory.push('/');
  }

  emptyTmpDir() {
    fs.emptyDir(this.targetDir, function (err) {
      if (!err) {
        console.log('emptyTmpDir success!');
      }
      else {
        console.log("emptyTmpDir failure: ", err);
      }
    });
  }

  getDriveImageJSX() {
    return this.props.photoCompareList[this.drivePhotoIndex].baseFile.path;
  }

  getGoogleImageJSX() {

    const googlePhoto = this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex];

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
        <div className="sideBySidePhotos">
          <div className="allImages">
            <div className="leftPanel">
              <p>{this.getDriveImageJSX()}</p>
              <img className="leftImage"
                src={this.state.diskImage}
              />
            </div>
            <div className="rightPanel">
              <p>{this.getGoogleImageJSX()}</p>
              <img className="rightImage"
                src={this.state.googleImage}
              />
            </div>
          </div>
          <div className="clear" />
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
        <div className="comparePhotosActions">
          <p>
              Remaining drive photos to compare: {this.state.remainingPhotosToCompare}
          </p>
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
  manualMatchFound: React.PropTypes.func.isRequired,
  noMatchFound: React.PropTypes.func.isRequired,
};


export default ComparePhotos;
