import {combineReducers} from 'redux';
import GooglePhotosReducer from './googlePhotos';
import DrivePhotosReducer from './drivePhotos';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  drivePhotos: DrivePhotosReducer
});

export default rootReducer;
