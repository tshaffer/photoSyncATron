const recursive = require('recursive-readdir');
import fs from 'fs';
import path from 'path';

import * as utils from '../utilities/utils';

// ------------------------------------
// Constants
// ------------------------------------
const SET_VOLUME_NAME = 'SET_VOLUME_NAME';
const SET_DRIVE_PHOTOS = 'SET_DRIVE_PHOTOS';

const rootFolder = "d:/";
// const rootFolder = path.join("/Users/tedshaffer/Documents/Projects/photoSyncATron", "PhotosOnMac");
// ------------------------------------
// Helper functions
// ------------------------------------
export function readDrivePhotoFiles() {

  return new Promise( (resolve, reject) => {

    recursive(rootFolder, (err, files) => {
      if (err) {
        console.log("getPhotoFilesFromDrive: error");
        reject(err);
      }
      files = files.filter(utils.isPhotoFile);
      files = files.map(function(x){ return x.toLowerCase();});
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
        newState.drivePhotos = action.payload;
        newState.numPhotoFiles = newState.drivePhotos.length;
        return newState;
      }
  }

  return state;
}
