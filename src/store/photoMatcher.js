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
function getPhotoDimensions(photoFilePath) {

  let dimensions = null;

  try {
    dimensions = sizeOf(photoFilePath);
  } catch (sizeOfError) {
    console.log(sizeOfError, " invoking sizeOf on: ", photoFilePath);
  }

  return dimensions;
}

function buildDrivePhotoFiles(drivePhotoFilePaths) {

  let drivePhotoFiles = [];
  drivePhotoFilePaths.forEach( (drivePhotoFilePath) => {
    let drivePhotoFile = {};
    drivePhotoFile.path = drivePhotoFilePath;
    drivePhotoFile.dimensions = getPhotoDimensions(drivePhotoFilePath);
    drivePhotoFiles.push(drivePhotoFile);
  });

  return drivePhotoFiles;
}

let _results = null;
function searchForPhoto(drivePhotoFilePath) {

  drivePhotoFilePath = drivePhotoFilePath.toLowerCase();

  // if a result for this photo doesn't exist, ensure that it is included in the search
  if (!_results[drivePhotoFilePath]) return true;

  // only include the photo in the search if its result was 'matchPending'
  let result = _results[drivePhotoFilePath].result;
  if (result) {
    return (result === 'manualMatchPending');
  }
  return true;
}

function filterDrivePhotos(volumeName, searchResults, drivePhotoFilePaths) {

  if (searchResults.Volumes[volumeName]) {
    _results = searchResults.Volumes[volumeName].resultsByPhoto;
    return drivePhotoFilePaths.filter(searchForPhoto);
  }
  return drivePhotoFilePaths;
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
      const photoFile = searchResult.photoFile;
      const drivePhotoDimensions = photoFile.dimensions;
      if (drivePhotoDimensions) {
        let photoCompareItem = null;
        const googlePhotoList = searchResult.photoList.photoList;
        if (googlePhotoList) {
          googlePhotoList.forEach( (googlePhoto) => {
            if (comparePhotos(Number(googlePhoto.width), Number(googlePhoto.height), drivePhotoDimensions.width, drivePhotoDimensions.height)) {
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
        }
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

  buildManualPhotoMatchList(dispatch, searchResults);

  searchResults.forEach( (searchResult) => {

    const path = searchResult.photoFile.path.toLowerCase();

    let resultData = {};

    if (searchResult.googlePhotoFile) {
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
      resultData.result = searchResult.reason;
      resultData.drivePhotoDimensions = searchResult.drivePhotoDimensions;
    }
    else {
      resultData.result = searchResult.reason;
      resultData.drivePhotoDimensions = searchResult.drivePhotoDimensions;
    }

    matchPhotosResults[path] = resultData;
  });

  dispatch(setDriveMatchResults(matchPhotosResults));
  dispatch(setPhotoMatchingComplete());
  console.log("ALL DONE");
}

function dimensionsMatch(googlePhoto) {
  // if (Number(googlePhoto.width) === this.width && Number(googlePhoto.height) === this.height) {
  //   return true;
  // }

  return (comparePhotos(Number(googlePhoto.width), Number(googlePhoto.height), this.width, this.height));

  // return false;
}

// return true if the dimensions match or their aspect ratios are 'really' close
function comparePhotos(googlePhotoWidth, googlePhotoHeight, drivePhotoWidth, drivePhotoHeight) {
  if (googlePhotoWidth === drivePhotoWidth && googlePhotoHeight === drivePhotoHeight) {
    return true;
  }

  const googlePhotoAspectRatio = googlePhotoWidth / googlePhotoHeight;
  const drivePhotoAspectRatio = drivePhotoWidth / drivePhotoHeight;

  const minValue = 0.99;
  const maxValue = 1.01;

  const aspectRatioRatio = googlePhotoAspectRatio / drivePhotoAspectRatio;
  if ( aspectRatioRatio > minValue && aspectRatioRatio < maxValue) {
    return true;
  }

  return false;
}

function findPhotoByFilePath(getState, drivePhotoFile) {

  const googlePhotosByName = getState().googlePhotos.photosByName;
  const googlePhotosByAltKey = getState().googlePhotos.photosByAltKey;

  // photosByName is a structure mapping google photo names to a list of google photos that have the same name

  // cases for possible match between file on drive and google photo
  // case 1 - look for a match with the file name as read from the drive
  // case 2 - look for a match between a tif file on the drive and a corresponding jpg google file
  // case 3 - look for a match between the file name from the drive and the modified google file names (3301.jpg => 01.jpg for example)

  // return value
  //    photoFiles
  //      object that contains
  //        photoFile - object representing the photo file on the drive. includes
  //          path
  //          dimensions
  //            QUESTION - in the case of .tif files, should this be the original path, or the path as modified to have the .jpg extension?
  //            I think it should have the original path.
  //        photoList
  //          array of google photos that match photoFile (see above for what 'match' means)

  let nameWithoutExtension = '';
  let googlePhotosMatchingDrivePhotoDimensions = null;

  let fileName = path.basename(drivePhotoFile.path).toLowerCase();

  const extension = path.extname(drivePhotoFile.path);
  if (extension !== '') {
    nameWithoutExtension = fileName.slice(0, -4);
  }

  if (!googlePhotosByName[fileName]) {
    if (extension === '.tif') {
      fileName = nameWithoutExtension + ".jpg";
    }
  }

  if (googlePhotosByName[fileName]) {

    let googlePhotoListMatchingDimensions = null;
    if (googlePhotosByName[fileName].photoList) {
      googlePhotoListMatchingDimensions = deepcopy(googlePhotosByName[fileName].photoList);
    }
    if (googlePhotoListMatchingDimensions) {
      googlePhotoListMatchingDimensions = googlePhotoListMatchingDimensions.filter(dimensionsMatch, drivePhotoFile.dimensions);
      if (googlePhotoListMatchingDimensions && googlePhotoListMatchingDimensions.length === 0) {
        googlePhotoListMatchingDimensions = null;
      }
    }
    googlePhotosMatchingDrivePhotoDimensions = {
      pathOnDrive: drivePhotoFile.path,
      photoList: googlePhotoListMatchingDimensions
    };
  }

  // TODO - use path.extname to figure stuff out (check whether or not it's blank) rather than length of string (if it makes sense)
  if (fileName.length >= 6) {
    if (utils.isNumeric(nameWithoutExtension)) {
      const partialName = fileName.slice(fileName.length - 6);
      if (googlePhotosByAltKey[partialName]) {
        if (!googlePhotosMatchingDrivePhotoDimensions) {
          googlePhotosMatchingDrivePhotoDimensions = {
            pathOnDrive: drivePhotoFile.path,
            photoList: []
          };
        }
        googlePhotosByAltKey[partialName].forEach( (googlePhoto) => {

          let googlePhotoAdded = false;
          if (drivePhotoFile.dimensions) {
            if (googlePhoto.width === drivePhotoFile.dimensions.width &&
              googlePhoto.height === drivePhotoFile.dimensions.height) {
              googlePhotosMatchingDrivePhotoDimensions.photoList.unshift(googlePhoto);
              googlePhotoAdded = true;
            }
          }
          if (!googlePhotoAdded) {
            googlePhotosMatchingDrivePhotoDimensions.photoList.push(googlePhoto);
          }
        });
      }
    }
  }

  return googlePhotosMatchingDrivePhotoDimensions;
}

// function findPhotoByKey(dispatch, getState, drivePhotoFile) {
//
//   const name = path.basename(drivePhotoFile.path);
//   const photosByKey = getState().googlePhotos.photosByKey;
//
//   try {
//     const dimensions = drivePhotoFile.dimensions;
//
//     const key = (name + '-' + dimensions.width.toString() + dimensions.height.toString()).toLowerCase();
//     if (photosByKey[key]) {
//       const googlePhotoFile = photosByKey[key];
//       return setSearchResult(dispatch, getState, drivePhotoFile, googlePhotoFile, 'keyMatch', '');
//     }
//     else {
//       return setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', '');
//     }
//   } catch (sizeOfError) {
//     return setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', sizeOfError);
//   }
// }

function setSearchResult(dispatch, getState, drivePhotoFile, googlePhotoFile, reason, error) {

  let success = false;
  if (googlePhotoFile) {
    success = true;
  }

  let photoList = null;
  if (!success) {
    // is there ever any reason to call this (as I think it's always been called already)
    const photoFile = findPhotoByFilePath(getState, drivePhotoFile);
    if (photoFile) {
      photoList = photoFile;
    }
  }

  const drivePhotoDimensions = drivePhotoFile.dimensions;

  dispatch(matchAttemptComplete(success));

  return {
    photoFile : drivePhotoFile,
    googlePhotoFile,
    reason,
    error,
    photoList,
    drivePhotoDimensions
  };
}

function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  let googlePhotosByExifDateTime = getState().googlePhotos.photosByExifDateTime;

  let searchResult = {};

  return new Promise( (resolve) => {

    // get list of google photos whose name 'matches' name of photo on drive
    // and whose dimension matches as well

    // if (drivePhotoFile.path.indexOf('agf00010.tif') > 0) {
    //   debugger;
    // }
    const photoFiles = findPhotoByFilePath(getState, drivePhotoFile);
    if (!photoFiles) {
      searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', '');
      resolve(searchResult);
    }
    else {
      searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', '');
      resolve(searchResult);

      // remove exifImage until I can determine whether or not it's causing lockup, or it's just coincidental
      // if it is, try workaround of invoking it sequentially
      // try {
      //   new exifImage({image: drivePhotoFile.path}, function (error, exifData) {
      //
      //     if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {
      //
      //       searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', error);
      //       resolve(searchResult);
      //     }
      //     else {
      //       let dateTimeStr = '';
      //       if (exifData.exif.CreateDate) {
      //         dateTimeStr = exifData.exif.CreateDate;
      //       }
      //       else {
      //         dateTimeStr = exifData.exif.DateTimeOriginal;
      //       }
      //       const exifDateTime = utils.getDateFromString(dateTimeStr);
      //       const isoString = exifDateTime.toISOString();
      //       if (googlePhotosByExifDateTime[isoString]) {
      //         const googlePhotoFile = googlePhotosByExifDateTime[isoString];
      //         searchResult = setSearchResult(dispatch, getState, drivePhotoFile, googlePhotoFile, 'exifMatch', '');
      //       }
      //       else {
      //         searchResult = findPhotoByKey(dispatch, getState, drivePhotoFile);
      //       }
      //       searchResult.isoString = isoString;
      //       resolve(searchResult);
      //     }
      //   });
      // } catch (error) {
      //   searchResult = setSearchResult(dispatch, getState, drivePhotoFile, null, 'noMatch', error);
      //   resolve(searchResult);
      // }
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
      readDrivePhotoFiles().then( (drivePhotoFilePaths) => {

        drivePhotoFilePaths = filterDrivePhotos(volumeName, searchResults, drivePhotoFilePaths);

        let drivePhotoFiles = buildDrivePhotoFiles(drivePhotoFilePaths);

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
          existingVolumeResults.resultsByPhoto[photoFilePath] = driveMatchResults[photoFilePath];
        }
      }
    }
    else {
      searchResults.Volumes[volumeName] = {};
      searchResults.Volumes[volumeName].resultsByPhoto = driveMatchResults;
    }

    // update statistics for current volume
    let driveResults = searchResults.Volumes[volumeName].resultsByPhoto;
    let numMatchesFound = 0;
    let numNoMatchesFound = 0;
    let numManualMatchFailures = 0;
    let numManualMatchesPending = 0;
    for (let drivePhotoFilePath in driveResults) {
      if (driveResults.hasOwnProperty(drivePhotoFilePath)) {
        const compareResult = driveResults[drivePhotoFilePath].result;
        switch (compareResult) {
          case 'matchFound':
            numMatchesFound++;
            break;
          case 'noMatch':
            numNoMatchesFound++;
            break;
          case 'manualMatchFailure':
            numManualMatchFailures++;
            break;
          case 'manualMatchPending':
            numManualMatchesPending++;
            break;
          default:
            debugger;
            break;
        }
      }
    }

    let summaryResults = {};
    summaryResults.matchesFoundCount = numMatchesFound;
    summaryResults.noMatchesFoundCount = numNoMatchesFound + numManualMatchFailures;
    summaryResults.manualMatchesPendingCount = numManualMatchesPending;
    searchResults.Volumes[volumeName].summaryResults = summaryResults;

    // update last modified
    searchResults.lastUpdated = new Date().toLocaleDateString();

    // store search results in a file
    const searchResultsStr = JSON.stringify(searchResults, null, 2);
    fs.writeFileSync('searchResults.json', searchResultsStr);

    console.log('searchResults.json saved');
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

      // console.log('Successful matches, unsuccessful matches: ',
      //   newState.successfulMatches, newState.unsuccessfulMatches);
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
      resultData.drivePhotoDimensions = action.payload.dimensions;
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
