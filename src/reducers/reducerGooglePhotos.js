import { ADD_GOOGLE_PHOTOS } from '../actions/index';

const initialState = [];


export default function(state = initialState, action) {

  switch (action.type) {

    case ADD_GOOGLE_PHOTOS:
      {
        return action.payload;
      }
  }

  return state;
}
