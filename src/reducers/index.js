import {combineReducers} from 'redux';
import GooglePhotosReducer from './reducerGooglePhotos';
import MatchPhotosDataReducer from './reducerMatchPhotosData';
import DriveMatchResultsReducer from './reducerDriveMatchResults';
const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  matchPhotosData: MatchPhotosDataReducer,
  driveMatchResults: DriveMatchResultsReducer
});

export default rootReducer;
