// @flow

const path = require('path');

const recursive = require('recursive-readdir');

import { DrivePhoto } from '../entities/drivePhoto';
import * as utils from '../utilities/utils';

// ------------------------------------
// Constants
// ------------------------------------
const SET_VOLUME_NAME = 'SET_VOLUME_NAME';
const SET_DRIVE_PHOTOS = 'SET_DRIVE_PHOTOS';

// CD / DVD drive
// const rootFolder = "d:/";

// On Mac
// const rootFolder = path.join("/Users/tedshaffer/Documents/Projects/photoSyncATron", "PhotosOnMac");
const rootFolder = path.join("/Users/tedshaffer/Documents/Projects/testPhotos", "Photos2");
// const rootFolder = path.join("/Users/tedshaffer/Documents/Projects/testPhotos", "testPhotos");
// const rootFolder = path.join("/Users/tedshaffer/Documents/Projects/testPhotos", "PHOTOS5");

// On Windows PC
// const rootFolder = "C:\\Users\\Ted\\Documents\\testPhotos\\d6-25-2006";
// const rootFolder = "C:\\Users\\Ted\\Documents\\testPhotos\\d2005Photos8";
// const rootFolder = "C:\\Users\\Ted\\Documents\\testPhotos\\Photos2";
// const rootFolder = "C:\\Users\\Ted\\Documents\\testPhotos\\Photos5";
// const rootFolder = "C:\\Users\\Ted\\Documents\\testPhotos\\Photos3-2";

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
export function setVolumeName(volumeName: string) {
  return {
    type: SET_VOLUME_NAME,
    payload: volumeName
  };
}

export function setDrivePhotos(drivePhotos: Array<DrivePhoto>) {
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
const initialState: Object = {
  volumeName: '',
  drivePhotos: [],
  numPhotoFiles: 0
};

export default function(state: Object = initialState, action: Object) {

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
