import {combineReducers} from 'redux';
import GooglePhotosReducer from './reducerGooglePhotos';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
});

export default rootReducer;
