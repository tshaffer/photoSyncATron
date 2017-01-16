// @flow

import {combineReducers} from 'redux';
import GooglePhotosReducer from './googlePhotos';
import DrivePhotosReducer from './drivePhotos';
import PhotosMatcherReducer from './photoMatcher';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  drivePhotos: DrivePhotosReducer,
  matchPhotosData: PhotosMatcherReducer
});

export default rootReducer;
