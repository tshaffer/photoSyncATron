import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { saveResults } from '../store/photoMatcher';

import MatchPhotosProgress from '../components/matchPhotosProgress';

class MatchPhotosProgressContainer extends Component {

  render() {
    return (
      <MatchPhotosProgress
        {...this.props}
      />
    );
  }
}

function mapStateToProps (state) {
  return {
    numPhotoFiles: state.drivePhotos.numPhotoFiles,
    successfulMatches: state.matchPhotosData.successfulMatches,
    unsuccessfulMatches: state.matchPhotosData.unsuccessfulMatches,
    photoMatchingComplete: state.matchPhotosData.photoMatchingComplete,
    photoCompareList: state.matchPhotosData.photoCompareList,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ saveResults },
    dispatch);
}


export default connect(mapStateToProps, mapDispatchToProps)(MatchPhotosProgressContainer);

