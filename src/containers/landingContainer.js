import { connect } from 'react-redux';

import Landing from '../components/landing';

import { loadGooglePhotos } from '../actions/index';
import { readPhotosFromDrive } from '../actions/index';

// function mapStateToProps (state, ownProps) {
//   return {
//     activity: getActivity(state, ownProps.params.id),
//     activities: state.activities,
//     segments: state.segments,
//     segmentEfforts: state.segmentEfforts,
//     effortsForSegments: getEffortsForActivitySegments(state, ownProps.params.id),
//     segmentEffortsForActivity: getSegmentEffortsForActivity(state, ownProps.params.id),
//     segmentEndPoint: state.segmentEndPoint,
//     activityLocations: state.activityLocations,
//     locationCoordinates: state.locationCoordinates
//   };
// }

function mapDispatchToProps(dispatch) {
  return {
    onLoadGooglePhotos: () => {
      dispatch(loadGooglePhotos());
    },
    onReadPhotosFromDrive: (volumeName) => {
      dispatch(readPhotosFromDrive(volumeName));
    }
  };
}

const LandingContainer = connect(
  null,
  mapDispatchToProps
)(Landing);

export default LandingContainer;

