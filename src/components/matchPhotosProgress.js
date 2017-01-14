import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';

class MatchPhotosProgress extends Component {

  handleComparePhotos() {
    hashHistory.push('/comparePhotosContainer');
  }

  handleSaveResults() {
    console.log('handleSaveResults');
    this.props.saveResults();
  }


  render () {

    // console.log('matches: ', this.props.successfulMatches, ', failures: ', this.props.unsuccessfulMatches, ', total: ', this.props.numPhotoFiles);

    const style = {
      marginLeft: '2px',
      fontSize: '12px',
    };

    let progressIndicator = '';
    let resolveInstructions = '';
    let resolveButton = '';
    if (this.props.photoMatchingComplete) {
      if (this.props.photoCompareList.length === 0) {
        resolveInstructions = (
          <p>Comparisons complete - click below to save the results.</p>
        );
        resolveButton =
          (<RaisedButton
            label="Save Results"
            onClick={this.handleSaveResults.bind(this)}
            style={style}
          />)
        ;

      }
      else {
        resolveInstructions = (
          <p>Click the 'Compare' button to manually match photos.</p>
        );
        resolveButton =
          (<RaisedButton
            onClick={this.handleComparePhotos.bind(this)}
            label="Compare"
            style={style}
          />)
        ;
      }
    }
    else {
      progressIndicator =
        (<div>
          <CircularProgress />
        </div>);
    }

    return (
      <MuiThemeProvider>
        <div>
          <h2>Reading photos from {this.props.volumeName} </h2>
          {progressIndicator}
          <div>
            Number of photo files on drive:
            <span>
              {this.props.numPhotoFiles}
            </span>
          </div>
          <div>
            Successful matches:
            <span>
              {this.props.successfulMatches}
            </span>
          </div>
          <div>
            Unsuccessful matches:
            <span>
              {this.props.unsuccessfulMatches}
            </span>
          </div>
          {resolveInstructions}
          {resolveButton}
        </div>
      </MuiThemeProvider>
    );
  }
}

MatchPhotosProgress.propTypes = {
  numPhotoFiles: React.PropTypes.number.isRequired,
  successfulMatches: React.PropTypes.number.isRequired,
  unsuccessfulMatches: React.PropTypes.number.isRequired,
  photoMatchingComplete: React.PropTypes.bool.isRequired,
  photoCompareList: React.PropTypes.array.isRequired,
  saveResults: React.PropTypes.func.isRequired,
  volumeName: React.PropTypes.string.isRequired

};

export default MatchPhotosProgress;
