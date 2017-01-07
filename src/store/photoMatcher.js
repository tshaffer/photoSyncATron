const path = require('path');
const fs = require('fs');
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
const MATCH_ATTEMPT_COMPLETE = 'MATCH_ATTEMPT_COMPLETE';
const PHOTO_MATCHING_COMPLETE = 'PHOTO_MATCHING_COMPLETE';
const SET_PHOTO_COMPARE_LIST = 'SET_PHOTO_COMPARE_LIST';
const SET_DRIVE_MATCH_RESULTS = 'SET_DRIVE_MATCH_RESULTS';
const MATCH_FOUND = 'MATCH_FOUND';
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';

// ------------------------------------
// Helper functions
// ------------------------------------
let _results = null;
function searchForPhoto(drivePhotoFile) {

  drivePhotoFile = drivePhotoFile.toLowerCase();

  // if a result for this photo doesn't exist, ensure that it is included in the search
  if (!_results[drivePhotoFile]) return true;

  // only include the photo in the search if its result was 'matchPending'
  let result = _results[drivePhotoFile].result;
  if (result) {
    return (result === 'manualMatchPending');
  }
  return true;
}

function filterDrivePhotos(volumeName, searchResults, drivePhotoFiles) {

  if (searchResults.Volumes[volumeName]) {
    _results = searchResults.Volumes[volumeName];
    return drivePhotoFiles.filter(searchForPhoto);
  }
  return drivePhotoFiles;
}


function loadExistingSearchResults() {

  return new Promise( (resolve) => {
    fs.readFile('searchResults.json', (err, data) => {

      let existingSearchResults;

      if (err) {
        existingSearchResults = {};
        existingSearchResults.Volumes = {};
      }
      else {
        existingSearchResults = JSON.parse(data);
      }
      resolve(existingSearchResults);
    });
  });
}

function buildManualPhotoMatchList(dispatch, searchResults) {

  let photoCompareList = [];

  searchResults.forEach( (searchResult) => {
    if (searchResult.photoList) {
      searchResult.reason = 'noMatch';    // reset value if match is possible (dimensions match)
      // add the google photos to the list whose dimensions match that of the baseFile
      const filePath = searchResult.photoFile;
      const drivePhotoDimensions = photoDimensionsByName[filePath];
      if (drivePhotoDimensions) {
        let photoCompareItem = null;
        const googlePhotoList = searchResult.photoList.photoList;
        googlePhotoList.forEach( (googlePhoto) => {
          if (googlePhoto.width === drivePhotoDimensions.width && googlePhoto.height === drivePhotoDimensions.height) {
            // if this is the first google photo in the photo list to match the drive photo's dimensions,
            // create the necessary data structures
            if (!photoCompareItem) {
              photoCompareItem = {};
              photoCompareItem.baseFile = searchResult.photoFile;
              photoCompareItem.photoList = [];
            }
            photoCompareItem.photoList.push(googlePhoto);
          }
        });
        if (photoCompareItem) {
          photoCompareList.push(photoCompareItem);
          searchResult.reason = 'manualMatchPending';
        }
      }
    }
  });

  dispatch(setPhotoCompareList(photoCompareList));
}

function saveSearchResults(dispatch, searchResults) {

  // build results based on this search
  let matchPhotosResults = {};
  let numMatchesFound = 0;
  let numWithPhotoList = 0;

  buildManualPhotoMatchList(dispatch, searchResults);

  searchResults.forEach( (searchResult) => {

    const path = searchResult.photoFile.toLowerCase();

    let resultData = {};

    if (searchResult.googlePhotoFile) {
      numMatchesFound++;
      resultData.result = 'matchFound';
      const googlePhotoFile = searchResult.googlePhotoFile;
      let googlePhoto = {};
      if (googlePhotoFile.exifDateTime) {
        googlePhoto.dateTime = googlePhotoFile.exifDateTime;
      }
      else {
        googlePhoto.dateTime = googlePhotoFile.dateTime;
      }
      googlePhoto.name = googlePhotoFile.name.toLowerCase();
      googlePhoto.imageUniqueId = googlePhotoFile.imageUniqueId;
      resultData.googlePhoto = googlePhoto;
    }
    else if (searchResult.photoList) {
      numWithPhotoList++;
      resultData.result = searchResult.reason;
    }
    else {
      resultData.result = searchResult.reason;
    }

    matchPhotosResults[path] = resultData;
  });

  console.log('Total number of matches: ', numMatchesFound);
  console.log('Number of potential matches: ', numWithPhotoList);

  dispatch(setDriveMatchResults(matchPhotosResults));
  dispatch(setPhotoMatchingComplete());
  console.log("ALL DONE");
}


function findPhotoByName(getState, pathOnDrive) {

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

  let fileName = path.basename(pathOnDrive).toLowerCase();

  const extension = path.extname(pathOnDrive);
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
      pathOnDrive,
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
            pathOnDrive,
            photoList: []
          };
        }
        photosByAltKey[partialName].forEach( (googlePhoto) => {

          let googlePhotoAdded = false;
          if (photoDimensionsByName[pathOnDrive]) {
            if (googlePhoto.width === photoDimensionsByName[pathOnDrive].width &&
              googlePhoto.height === photoDimensionsByName[pathOnDrive].height) {
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
      const googlePhotoFile = photosByKey[key];
      return setSearchResult(dispatch, getState, drivePhotoFile, googlePhotoFile, 'keyMatch', '');
    }
    else {
      return setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', '');
    }
  } catch (sizeOfError) {
    return setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', sizeOfError);
  }
}

function setSearchResult(dispatch, getState, photoFile, googlePhotoFile, reason, error) {

  let success = false;
  if (googlePhotoFile) {
    success = true;
  }

  let photoList = null;
  if (!success) {
    const photoFiles = findPhotoByName(getState, photoFile);
    if (photoFiles) {
      photoList = photoFiles;
    }
  }

  dispatch(matchAttemptComplete(success));

  return {
    photoFile,
    googlePhotoFile,
    reason,
    error,
    photoList
  };
}


function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  let photosByExifDateTime = getState().googlePhotos.photosByExifDateTime;

  let searchResult = {};

  return new Promise( (resolve) => {

    // eliminate files whose dimensions don't match - cheap comparison
    searchResult = findPhotoByKey(dispatch, getState, drivePhotoFile);
    if (searchResult.reason !== 'keyMatch') {
      resolve(searchResult);
    }
    else {
      try {
        new exifImage({image: drivePhotoFile}, function (error, exifData) {

          if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {

            // // no exif date - search in photosByKey if it's a jpeg file
            // if (utils.isJpegFile(drivePhotoFile)) {
            //   searchResult = findPhotoByKey(dispatch, getState, drivePhotoFile);
            // }
            // else {
            //   searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', error);
            // }
            searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', error);
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
              const googlePhotoFile = photosByExifDateTime[isoString];
              searchResult = setSearchResult(dispatch, getState, drivePhotoFile, googlePhotoFile, 'exifMatch', '');
            }
            else {
              if (utils.isJpegFile(drivePhotoFile)) {
                searchResult = findPhotoByKey(dispatch, getState, drivePhotoFile);
              }
              else {
                searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', '');
              }
            }
            searchResult.isoString = isoString;
            resolve(searchResult);
          }
        });
      } catch (error) {
        searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', error);
        resolve(searchResult);
      }
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
  // drivePhotoFiles = drivePhotoFiles.slice(0, 20);

  const numPhotoFiles = drivePhotoFiles.length;
  console.log("Number of photos on drive: ", numPhotoFiles);
  matchAllPhotoFiles(dispatch, getState, drivePhotoFiles);
}

// ------------------------------------
// Actions
// ------------------------------------
function matchAttemptComplete(success) {
  return {
    type: MATCH_ATTEMPT_COMPLETE,
    payload: success
  };
}

function setPhotoCompareList(photoCompareList) {
  return {
    type: SET_PHOTO_COMPARE_LIST,
    payload: photoCompareList
  };
}

function setDriveMatchResults(driveResults) {
  return {
    type: SET_DRIVE_MATCH_RESULTS,
    payload: driveResults
  };
}

function setPhotoMatchingComplete() {
  return {
    type: PHOTO_MATCHING_COMPLETE
  };
}

function setSearchResults(searchResults) {
  return {
    type: SET_SEARCH_RESULTS,
    payload: searchResults
  };
}

export function matchFound(photoFilePath, googlePhoto) {
  return {
    type: MATCH_FOUND,
    payload: {
      photoFilePath,
      googlePhoto
    }
  };
}

export function noMatchFound(photoFilePath) {
  return {
    type: NO_MATCH_FOUND,
    payload: photoFilePath
  };
}


// ------------------------------------
// Actions Creators
// ------------------------------------
export function matchPhotos(volumeName) {

  console.log("photoMatcher.js::matchPhotos");

  return function (dispatch, getState) {

    // load prior search results
    loadExistingSearchResults().then((searchResults) => {

      // store search results for use in comparisons
      dispatch(setSearchResults(searchResults));

      // store the volume name for later use
      dispatch(setVolumeName(volumeName));

      // read the photo files from the drive
      readDrivePhotoFiles().then( (drivePhotoFiles) => {

        drivePhotoFiles = filterDrivePhotos(volumeName, searchResults, drivePhotoFiles);

        // TODO - instead of this construct, could pass dispatch into readDrivePhotos. however, code would still need
        // to wait for it to complete before moving on. true??
        dispatch(setDrivePhotos(drivePhotoFiles));

        // TODO - it's very possible that the following could be called via dispatch - I think it's completely synchronous
        buildPhotoDictionaries(dispatch, getState);

        matchPhotoFiles(dispatch, getState);
      });
      // TODO catch errors
    });
  };
}

export function saveResults() {

  return function (_, getState) {

    // merge together searchResults and driveMatchResults
    const state = getState();
    const volumeName = state.drivePhotos.volumeName;

    // start with existing search results
    let searchResults = state.matchPhotosData.searchResults;

    // search results for current volume
    let driveMatchResults = state.matchPhotosData.driveMatchResults;

    // if necessary, merge them together
    const existingVolumeResults = searchResults.Volumes[volumeName];
    if (existingVolumeResults) {
      for (let photoFilePath in driveMatchResults) {
        if (driveMatchResults.hasOwnProperty(photoFilePath)) {
          existingVolumeResults[photoFilePath] = driveMatchResults[photoFilePath];
        }
      }
    }
    else searchResults.Volumes[volumeName] = driveMatchResults;

    // update last modified
    searchResults.lastUpdated = new Date().toLocaleDateString();

    // store search results in a file
    const searchResultsStr = JSON.stringify(searchResults, null, 2);
    fs.writeFileSync('searchResults.json', searchResultsStr);

    console.log('searchResults.json saved');
    //
    //
    // // no longer load results here - they were loaded earlier
    //
    // loadExistingSearchResults().then((searchResults) => {
    //   // update data structure
    //   searchResults.lastUpdated = new Date().toLocaleDateString();
    //   const state = getState();
    //   const volumeName = state.drivePhotos.volumeName;
    //   searchResults.Volumes[volumeName] = state.matchPhotosData.driveMatchResults;
    //
    //   // store search results in a file
    //   const searchResultsStr = JSON.stringify(searchResults, null, 2);
    //   fs.writeFileSync('searchResults.json', searchResultsStr);
    //
    //   console.log('searchResults.json saved');
    // });
  };
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState = {
  successfulMatches: 0,
  unsuccessfulMatches: 0,
  photoMatchingComplete: false,
  photoCompareList: [],
  driveMatchResults: {},
};

export default function(state = initialState, action) {

  switch (action.type) {

    case MATCH_ATTEMPT_COMPLETE: {
      let newState = Object.assign({}, state);
      if (action.payload) {
        newState.successfulMatches++;
      }
      else {
        newState.unsuccessfulMatches++;
      }

      console.log('Successful matches, unsuccessful matches: ',
        newState.successfulMatches, newState.unsuccessfulMatches);
      return newState;
    }
    case PHOTO_MATCHING_COMPLETE: {
      let newState = Object.assign({}, state);
      newState.photoMatchingComplete = true;
      return newState;
    }
    case SET_PHOTO_COMPARE_LIST: {
      let newState = Object.assign({}, state);
      newState.photoCompareList = action.payload;
      return newState;
    }
    case SET_DRIVE_MATCH_RESULTS: {
      let newState = Object.assign({}, state);
      newState.driveMatchResults = action.payload;
      return newState;
    }
    case MATCH_FOUND: {
      const filePath = action.payload.photoFilePath;
      const googlePhotoFile = action.payload.googlePhoto;

      // TODO - this duplicates code from saveSearchResults
      let resultData = {};
      resultData.result = 'matchFound';

      let googlePhoto = {};
      if (googlePhotoFile.exifDateTime) {
        googlePhoto.dateTime = googlePhotoFile.exifDateTime;
      }
      else {
        googlePhoto.dateTime = googlePhotoFile.dateTime;
      }
      googlePhoto.name = googlePhotoFile.name;
      googlePhoto.imageUniqueId = googlePhotoFile.imageUniqueId;
      resultData.googlePhoto = googlePhoto;

      let newState = Object.assign({}, state);
      newState.driveMatchResults[filePath] = resultData;
      return newState;
    }
    case NO_MATCH_FOUND: {

      let resultData = {};
      resultData.result = 'manualMatchFailure';

      let newState = Object.assign({}, state);
      newState.driveMatchResults[action.payload] = resultData;
      return newState;
    }
    case SET_SEARCH_RESULTS: {
      let newState = Object.assign({}, state);
      newState.searchResults = action.payload;
      return newState;
    }
  }

  return state;
}
