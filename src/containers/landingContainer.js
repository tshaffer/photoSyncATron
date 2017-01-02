import { connect } from 'react-redux';

import Landing from '../components/landing';

import { loadGooglePhotos } from '../store/googlePhotos';
import { readGooglePhotos } from '../store/googlePhotos';
import { readPhotosFromDrive } from '../store/drivePhotos';

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

