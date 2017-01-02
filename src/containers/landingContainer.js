import { connect } from 'react-redux';

import Landing from '../components/landing';

import { loadGooglePhotos } from '../store/googlePhotos';
import { readGooglePhotos } from '../store/googlePhotos';
import { matchPhotos } from '../store/photoMatcher';

function mapStateToProps (state) {
  return {
    googlePhotos: state.googlePhotos.googlePhotos,
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
    onMatchPhotos: (volumeName) => {
      dispatch(matchPhotos(volumeName));
    }
  };
}

const LandingContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(Landing);

export default LandingContainer;

