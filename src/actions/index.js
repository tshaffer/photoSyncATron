export const ADD_GOOGLE_PHOTOS = 'ADD_GOOGLE_PHOTOS';

export function loadGooglePhotos() {

  console.log("index.js::loadGooglePhotos");

  return function(dispatch, getState) {
    console.log(dispatch);
    console.log(getState);
  };
}

