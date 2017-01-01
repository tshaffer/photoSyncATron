import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import { saveResults, matchFound, noMatchFound } from '../actions/index';

class ComparePhotos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      diskImage: '',
      googleImage: ''
    };
  }

  componentWillMount() {

    console.log("comparePhotos.js::componentWillMount");
    console.log(this.props.photoCompareList);

    this.numDrivePhotosToCompare = this.props.photoCompareList.length;
    this.drivePhotoIndex = 0;

    this.numGooglePhotosToCompare = this.props.photoCompareList[this.drivePhotoIndex].photoList.length;
    this.googlePhotoIndex = 0;

    this.updatePhotosToCompare();
  }

  updatePhotosToCompare() {
    const diskImage = this.props.photoCompareList[this.drivePhotoIndex].baseFile;
    const googleImage = this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex].url;

    this.setState({
      diskImage,
      googleImage
    });
  }

  moveToNextDrivePhoto() {
    this.drivePhotoIndex++;
    this.googlePhotoIndex = 0;
  }

  handlePhotosMatch() {
    console.log('handlePhotosMatch');

    // mark this drive photo as matching
    this.props.matchFound(this.props.photoCompareList[this.drivePhotoIndex].baseFile);

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
    this.props.saveResults();
  }

  render () {

    const style = {
      marginLeft: '2px',
      marginTop: '8px',
      fontSize: '12px',
    };

    return (
      <MuiThemeProvider>
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
          <div>
            <RaisedButton
              label="Photos Match"
              onClick={this.handlePhotosMatch.bind(this)}
              style={style}
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


function mapStateToProps (state) {
  return {
    photoCompareList: state.matchPhotosData.photoCompareList,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({saveResults, matchFound, noMatchFound },
        dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ComparePhotos);
