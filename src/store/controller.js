const path = require('path');
const deepcopy = require("deepcopy");
const sizeOf = require('image-size');

const exifImage = require('exif').ExifImage;

import { setVolumeName } from './drivePhotos';
import { readDrivePhotoFiles } from './drivePhotos';
import { setDrivePhotos } from './drivePhotos';
import { buildPhotoDictionaries } from './googlePhotos';

import * as utils from '../utilities/utils';

let photoDimensionsByName = {};

// ------------------------------------
// Constants
// ------------------------------------

// ------------------------------------
// Helper functions
// ------------------------------------
function findPhotoByName(getState, photoFile) {

  const photosByName = getState().googlePhotos.photosByName;
  const photosByAltKey = getState().googlePhotos.photosByAltKey;

  // photosByName is a structure mapping google photo names to google photos

  // cases for possible match between file on drive and google photo
  // case 1 - look for a match with the file name as read from the drive
  // case 2 - look for a match between a tif file on the drive and a corresponding jpg google file
  // case 3 - look for a match between the file name from the drive and the modified google file names (3301.jpg => 01.jpg for example)

  // return value
  //    photoFiles
  //      object that contains
  //        photoFile - path to photo on drive
  //            QUESTION - in the case of .tif files, should this be the original path, or the path as modified to have the .jpg extension?
  //            I think it should have the original path.
  //        photoList
  //          array of google photos that match photoFile (see cases above)

  let nameWithoutExtension = '';
  let photoFiles = null;

  let fileName = path.basename(photoFile).toLowerCase();

  const extension = path.extname(photoFile);
  if (extension !== '') {
    nameWithoutExtension = fileName.slice(0, -4);
  }

  if (!photosByName[fileName]) {
    if (extension === '.tif') {
      fileName = nameWithoutExtension + ".jpg";
    }
  }

  if (photosByName[fileName]) {

    let photoList = null;
    if (photosByName[fileName].photoList) {
      photoList = deepcopy(photosByName[fileName].photoList);
    }
    photoFiles = {
      photoFile,
      photoList
    };
  }

  // TODO - use path.extname to figure stuff out (check whether or not it's blank) rather than length of string (if it makes sense)
  if (fileName.length >= 6) {
    if (utils.isNumeric(nameWithoutExtension)) {
      const partialName = fileName.slice(fileName.length - 6);
      if (photosByAltKey[partialName]) {
        if (!photoFiles) {
          photoFiles = {
            photoFile,
            photoList: []
          };
        }
        photosByAltKey[partialName].forEach( (googlePhoto) => {

          let googlePhotoAdded = false;
          if (photoDimensionsByName[photoFile]) {
            if (googlePhoto.width === photoDimensionsByName[photoFile].width &&
              googlePhoto.height === photoDimensionsByName[photoFile].height) {
              photoFiles.photoList.unshift(googlePhoto);
              googlePhotoAdded = true;
            }
          }
          if (!googlePhotoAdded) {
            photoFiles.photoList.push(googlePhoto);
          }
        });
      }
    }
  }

  return photoFiles;
}

function findPhotoByKey(dispatch, getState, drivePhotoFile) {
  const name = path.basename(drivePhotoFile);
  const photosByKey = getState().googlePhotos.photosByKey;

  try {
    const dimensions = sizeOf(drivePhotoFile);

    photoDimensionsByName[drivePhotoFile] = {
      width: dimensions.width.toString(),
      height: dimensions.height.toString()
    };

    const key = (name + '-' + dimensions.width.toString() + dimensions.height.toString()).toLowerCase();
    if (photosByKey[key]) {
      return setSearchResult(dispatch, drivePhotoFile, true, 'keyMatch', '');
    }
    else {
      return setSearchResult(dispatch, drivePhotoFile, false, 'noKeyMatch', '');
    }
  } catch (sizeOfError) {
    return setSearchResult(dispatch, drivePhotoFile, false, 'sizeOfError', sizeOfError);
  }
}

function setSearchResult(dispatch, photoFile, success, reason, error) {

  let photoList = null;
  if (!success) {
    const photoFiles = findPhotoByName(photoFile);
    if (photoFiles) {
      photoList = photoFiles;
    }
  }

  dispatch(matchAttemptComplete(success));

  return {
    photoFile,
    success,
    reason,
    error,
    photoList
  };
}


function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  let searchResult = {};

  return new Promise( (resolve) => {
    try {
      new exifImage({ image : drivePhotoFile }, function (error, exifData) {

        if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {

          // no exif date - search in photosByKey if it's a jpeg file
          if (utils.isJpegFile(drivePhotoFile)) {
            searchResult = findPhotoByKey(dispatch, getState, drivePhotoFile);
          }
          else {
            searchResult = setSearchResult(dispatch, drivePhotoFile, false, 'noExifNotJpg', error);
          }
          resolve(searchResult);
        }
        else {
          let dateTimeStr = '';
          if (exifData.exif.CreateDate) {
            dateTimeStr = exifData.exif.CreateDate;
          }
          else {
            dateTimeStr = exifData.exif.DateTimeOriginal;
          }
          const exifDateTime = utils.getDateFromString(dateTimeStr);
          const isoString = exifDateTime.toISOString();
          if (photosByExifDateTime[isoString]) {
            searchResult = setSearchResult(dispatch, drivePhotoFile, true, 'exifMatch', '');
          }
          else {
            if (utils.isJpegFile(drivePhotoFile)) {
              searchResult = findPhotoByKey(dispatch, drivePhotoFile);
            }
            else {
              searchResult = setSearchResult(dispatch, drivePhotoFile, false, 'noExifMatch', '');
            }
          }
          searchResult.isoString = isoString;
          resolve(searchResult);
        }
      });
    } catch (error) {
      searchResult = setSearchResult(dispatch, drivePhotoFile, false, 'other', error);
      resolve(searchResult);
    }
  });
}

function matchAllPhotoFiles(dispatch, getState, drivePhotoFiles) {

  let promises = [];
  drivePhotoFiles.forEach( (drivePhotoFile) => {
    let promise = matchPhotoFile(dispatch, getState, drivePhotoFile);
    promises.push(promise);
  });
  Promise.all(promises).then( (searchResults) => {
    saveSearchResults(dispatch, searchResults);
  });
}

function matchPhotoFiles(dispatch, getState) {

  let drivePhotoFiles = getState().drivePhotos.drivePhotos;

  // for testing a subset of all the files.
  // drivePhotoFiles = drivePhotoFiles.slice(0, 4);

  const numPhotoFiles = drivePhotoFiles.length;
  console.log("Number of photos on drive: ", numPhotoFiles);
  matchAllPhotoFiles(dispatch, getState, drivePhotoFiles);
}

// ------------------------------------
// Action Creators
// ------------------------------------

// ------------------------------------
// Actions
// ------------------------------------
export function matchPhotos(volumeName) {

  console.log("controller.js::matchPhotos");

  return function (dispatch, getState) {

    // save the volume name for later use
    dispatch(setVolumeName(volumeName));

    // read the photo files from the drive
    readDrivePhotoFiles().then( (drivePhotoFiles) => {
      // TODO - instead of this construct, could pass dispatch into readDrivePhotos. however, code would still need
      // to wait for it to complete before moving on. true??
      dispatch(setDrivePhotos(drivePhotoFiles));
      // TODO - it's very possible that the following could be called via dispatch - I think it's completely synchronous
      buildPhotoDictionaries(dispatch, getState);
      matchPhotoFiles(dispatch, getState);
    });
    // TODO catch errors

    // let state = getState();
    // buildPhotoDictionaries(dispatch, state.googlePhotos);
    // matchPhotoFiles(dispatch);
  };
}

