import { SET_VOLUME_NAME } from '../actions/index';

const initialState = '';

export default function(state = initialState, action) {

    switch (action.type) {

        case SET_VOLUME_NAME:
        {
            return action.payload;
        }
    }

    return state;
}
