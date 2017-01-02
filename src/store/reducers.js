import {combineReducers} from 'redux';
import GooglePhotosReducer from './googlePhotos';
import DrivePhotosReducer from './drivePhotos';
import PhotoMatcherReducer from './photoMatcher';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  drivePhotos: DrivePhotosReducer,
  photoMatchingData: PhotoMatcherReducer
});

export default rootReducer;
