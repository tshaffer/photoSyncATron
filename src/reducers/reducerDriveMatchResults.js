import { SET_DRIVE_MATCH_RESULTS } from '../actions/index';
import { MATCH_FOUND } from '../actions/index';
import { NO_MATCH_FOUND } from '../actions/index';

const initialState = [];

export default function(state = initialState, action) {

  switch (action.type) {

    case SET_DRIVE_MATCH_RESULTS: {
      let newState = action.payload;
      return newState;
    }
    case MATCH_FOUND: {
      let newState = Object.assign({}, state);
      delete newState[action.payload];
      return newState;
    }
    case NO_MATCH_FOUND: {
      let newState = Object.assign({}, state);
      newState[action.payload] = 'NoManualMatch';
      return newState;
    }
  }

  return state;
}
