// @flow

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { saveResults, manualMatchFound, noMatchFound } from '../store/photoMatcher';

import ComparePhotos from '../components/comparePhotos';

class ComparePhotosContainer extends Component {

  render() {
    console.log("ComparePhotosContainer render invoked");

    return (
      <ComparePhotos
        {...this.props}
        />
    );
  }
}

function mapStateToProps (state) {
  return {
    photoCompareList: state.matchPhotosData.photoCompareList,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({saveResults, manualMatchFound, noMatchFound },
    dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ComparePhotosContainer);

