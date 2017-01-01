import { SET_NUM_PHOTO_FILES } from '../actions/index';
import { MATCH_ATTEMPT_COMPLETE } from '../actions/index';

const initialState = {
  numPhotoFiles: 0,
  successfulMatches: 0,
  unsuccessfulMatches: 0
};

export default function(state = initialState, action) {

  switch (action.type) {

    case SET_NUM_PHOTO_FILES: {
      let newState = Object.assign({}, state);
      newState.numPhotoFiles = action.payload;

      return newState;
    }
    case MATCH_ATTEMPT_COMPLETE: {
      let newState = Object.assign({}, state);
      if (action.payload) {
        newState.successfulMatches++;
      }
      else {
        newState.unsuccessfulMatches++;
      }

      console.log('Successful matches, unsuccessful matches: ', newState.successfulMatches, newState.unsuccessfulMatches);
      return newState;
    }
  }

  return state;
}
