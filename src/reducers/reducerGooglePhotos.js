import { ADD_GOOGLE_PHOTOS } from '../actions/index';

const initialState =
  {
    allGooglePhotos: []
  };


export default function(state = initialState, action) {

  switch (action.type) {

    case ADD_GOOGLE_PHOTOS:
      {
        let newState = {
          allGooglePhotos: action.payload
        };

        return newState;
      }
  }

  return state;
}
