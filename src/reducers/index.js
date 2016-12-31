import {combineReducers} from 'redux';
import GooglePhotosReducer from './reducerGooglePhotos';
import MatchPhotosDataReducer from './reducerMatchPhotosData';

const rootReducer = combineReducers({
  googlePhotos: GooglePhotosReducer,
  matchPhotosData: MatchPhotosDataReducer
});

export default rootReducer;
