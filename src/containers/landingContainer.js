import { connect } from 'react-redux';

import Landing from '../components/landing';

import { loadGooglePhotos } from '../actions/index';
import { readGooglePhotos } from '../actions/index';
import { readPhotosFromDrive } from '../actions/index';

function mapStateToProps (state) {
  return {
    googlePhotos: state.googlePhotos,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onLoadGooglePhotos: () => {
      dispatch(loadGooglePhotos());
    },
    onReadGooglePhotos: () => {
      dispatch(readGooglePhotos());
    },
    onReadPhotosFromDrive: (volumeName) => {
      dispatch(readPhotosFromDrive(volumeName));
    }
  };
}

const LandingContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Landing);

export default LandingContainer;

