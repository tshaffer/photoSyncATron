import {combineReducers} from 'redux';
import GooglePhotosReducer from './reducerGooglePhotos';
import MatchPhotosDataReducer from './reducerMatchPhotosData';
import DriveMatchResultsReducer from './reducerDriveMatchResults';
import VolumeNameReducer from './reducerVolumeName';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  matchPhotosData: MatchPhotosDataReducer,
  driveMatchResults: DriveMatchResultsReducer,
  volumeName: VolumeNameReducer
});

export default rootReducer;
