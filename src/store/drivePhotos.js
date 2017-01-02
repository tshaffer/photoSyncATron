const recursive = require('recursive-readdir');

import * as utils from '../utilities/utils';

// ------------------------------------
// Constants
// ------------------------------------
const SET_VOLUME_NAME = 'SET_VOLUME_NAME';
const SET_DRIVE_PHOTOS = 'SET_DRIVE_PHOTOS';

const driveLetter = "d:/";

// ------------------------------------
// Helper functions
// ------------------------------------
export function readDrivePhotoFiles() {

  return new Promise( (resolve, reject) => {

    recursive(driveLetter, (err, files) => {
      if (err) {
        console.log("getPhotoFilesFromDrive: error");
        reject(err);
      }
      files = files.filter(utils.isPhotoFile);
      resolve(files);
    }, (reason) => {
      reject(reason);
    });
  });
}


// ------------------------------------
// Action Creators
// ------------------------------------
export function setVolumeName(volumeName) {
  return {
    type: SET_VOLUME_NAME,
    payload: volumeName
  };
}

export function setDrivePhotos(drivePhotos) {
  return {
    type: SET_DRIVE_PHOTOS,
    payload: drivePhotos
  };
}
// ------------------------------------
// Actions
// ------------------------------------
// export function readPhotosFromDrive(volumeName) {
//
//   return function (dispatch, getState) {
//
//     recursive("d:/", (err, files) => {
//       if (err) {
//         console.log("getPhotoFilesFromDrive: error");
//         reject(err);
//       }
//       files = files.filter(utils.isPhotoFile);
//       resolve(files);
//     });
//
//     // let state = getState();
//     // buildPhotoDictionaries(dispatch, state.googlePhotos);
//     // matchPhotoFiles(dispatch);
//   };
// }

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  volumeName: '',
  drivePhotos: [],
  numPhotoFiles: 0
};

export default function(state = initialState, action) {

  let newState;

  switch (action.type) {

    case SET_VOLUME_NAME:
    {
      newState = Object.assign({}, state);
      newState.volumeName = action.payload;
      return newState;
    }
    case SET_DRIVE_PHOTOS:
    {
      newState = Object.assign({}, state);
      newState.drivePhotos = action.drivePhotos;
      newState.numPhotoFiles = newState.drivePhotos.length;
      return newState;
    }
  }

  return state;
}
