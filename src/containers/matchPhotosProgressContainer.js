import React, { Component } from 'react';
import { connect } from 'react-redux';

import MatchPhotosProgress from '../components/matchPhotosProgress';

class MatchPhotosProgressContainer extends Component {

  render() {
    return (
        <MatchPhotosProgress
            numPhotoFiles={this.props.numPhotoFiles}
        />
    );
  }
}

function mapStateToProps (state) {
  return {
    numPhotoFiles: state.matchPhotosData.numPhotoFiles
  };
}

export default connect(mapStateToProps)(MatchPhotosProgressContainer);

