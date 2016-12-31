import { SET_NUM_PHOTO_FILES } from '../actions/index';

const initialState = {
  numPhotoFiles: 0
};


export default function(state = initialState, action) {

    switch (action.type) {

        case SET_NUM_PHOTO_FILES:
        {
            let newState = Object.assign({}, state);
            newState.numPhotoFiles = action.payload;

            return newState;
        }
    }

    return state;
}
