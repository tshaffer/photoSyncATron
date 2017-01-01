import React, { Component } from 'react';
import { connect } from 'react-redux';

import MatchPhotosProgress from '../components/matchPhotosProgress';

class MatchPhotosProgressContainer extends Component {

  render() {
    console.log("MatchPhotosProgressContainer render invoked");

    return (
        <MatchPhotosProgress
            {...this.props}
        />
    );
  }
}

function mapStateToProps (state) {
  return {
    numPhotoFiles: state.matchPhotosData.numPhotoFiles,
    successfulMatches: state.matchPhotosData.successfulMatches,
    unsuccessfulMatches: state.matchPhotosData.unsuccessfulMatches,
      photoMatchingComplete: state.matchPhotosData.photoMatchingComplete,
      photoCompareList: state.matchPhotosData.photoCompareList,
  };
}

export default connect(mapStateToProps)(MatchPhotosProgressContainer);

