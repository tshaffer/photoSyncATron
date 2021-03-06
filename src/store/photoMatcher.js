// @flow

const fs = require('fs');
const sizeOf = require('image-size');

import { DrivePhoto } from '../entities/drivePhoto';
import { GooglePhoto } from '../entities/googlePhoto';

import { setVolumeName } from './drivePhotos';
import { readDrivePhotoFiles } from './drivePhotos';
import { setDrivePhotos } from './drivePhotos';
import { buildPhotoDictionaries } from './googlePhotos';

import * as nameMatcher from '../utilities/nameMatcher';
import * as dateMatcher from '../utilities/dateMatcher';

let photoCompareList = [];
let dfMatchResults = {};

// ------------------------------------
// Helper functions
// ------------------------------------
function setDrivePhotoMatchResult(df: DrivePhoto, result) {
  dfMatchResults[df.getPath()] = result;
}

function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  return new Promise( (resolve) => {

    let gfsMatchingDFNameAndDimensionsPromise = nameMatcher.gfsMatchingDFDimensions( drivePhotoFile, getState().googlePhotos);

    let gfsMatchingDFDateTimesPromise = dateMatcher.gfsMatchingDFDateTimes(drivePhotoFile, getState().googlePhotos);

    Promise.all([gfsMatchingDFNameAndDimensionsPromise, gfsMatchingDFDateTimesPromise]).then( (results) => {

      // analyze results
      // TODO - figure out a better way to do this?
      const nameMatchResults = results[0];
      const exifDateTimeMatches = results[1][0];
      const lastModifiedDateTimeMatches = results[1][1];

      let matchingGF = null;
      if (exifDateTimeMatches) {

        // TODO - Joel, why doesn't this work (declared them earlier)?
        // TODO - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
        // let createDateToDateTimeExifMatch;
        // let dateTimeOriginalToDateTimeExifMatch;
        // let createDateToExifDateTimeExifMatch;
        // let dateTimeOriginalToExifDateTime;
        // {createDateToDateTimeExifMatch, dateTimeOriginalToDateTimeExifMatch, createDateToExifDateTimeExifMatch, dateTimeOriginalToExifDateTime} = exifDateTimeMatches;
        let {createDateToDateTimeExifMatch, dateTimeOriginalToDateTimeExifMatch, createDateToExifDateTimeExifMatch, dateTimeOriginalToExifDateTime} = exifDateTimeMatches;


        // TODO - if / else or look at all of them? I think I want to at least look at the name matches? show all successful matches?

        if (createDateToDateTimeExifMatch) {
          matchingGF = createDateToDateTimeExifMatch;
        }
        else if (dateTimeOriginalToDateTimeExifMatch) {
          matchingGF = dateTimeOriginalToDateTimeExifMatch;
        }
        else if (createDateToExifDateTimeExifMatch) {
          matchingGF = createDateToExifDateTimeExifMatch;
        }
        else if (dateTimeOriginalToExifDateTime) {
          matchingGF = dateTimeOriginalToExifDateTime;
        }
      }

      let lastModifiedToDateTimeMatch = lastModifiedDateTimeMatches[0];
      let lastModifiedToExifDateTimeMatch = lastModifiedDateTimeMatches[1];
      if (lastModifiedDateTimeMatches) {
        lastModifiedToDateTimeMatch = lastModifiedDateTimeMatches[0];
        lastModifiedToExifDateTimeMatch = lastModifiedDateTimeMatches[1];
      }

      if (!matchingGF) {
        if (lastModifiedToDateTimeMatch) {
          matchingGF = lastModifiedToDateTimeMatch;
        }
        else if (lastModifiedToExifDateTimeMatch) {
          matchingGF = lastModifiedToExifDateTimeMatch;
        }
      }

      let result = null;
      if (matchingGF || lastModifiedToDateTimeMatch || lastModifiedToExifDateTimeMatch) {
        result = {
          drivePhotoFile,
          matchResult: MATCH_FOUND,
          matchingGF
        };
      }
      else if (nameMatchResults.nameMatchResult === 'NAME_MATCH_EXACT') {

        let photoCompareItem = {};
        photoCompareItem.baseFile = drivePhotoFile;
        photoCompareItem.photoList = nameMatchResults.gfList;
        photoCompareList.push(photoCompareItem);

        result = {
          drivePhotoFile,
          matchResult: MANUAL_MATCH_PENDING,
          gfList: nameMatchResults.gfList
        };
      }
      else {
        result = {
          drivePhotoFile,
          matchResult: NO_MATCH_FOUND
        };
      }
      dispatch(automaticMatchAttemptComplete(result.matchResult === MATCH_FOUND));
      setDrivePhotoMatchResult(drivePhotoFile, result);
      resolve();
    }, (err) => {
      console.log(err);
      debugger;
    });
  });
}


function getPhotoDimensions(photoFilePath): ?Object {

  let dimensions: ?Object = null;

  try {
    dimensions = sizeOf(photoFilePath);
  } catch (sizeOfError) {
    console.log(sizeOfError, " invoking sizeOf on: ", photoFilePath);
  }

  return dimensions;
}

function buildDrivePhotos(drivePhotoFilePaths) {

  let drivePhotoFiles = [];
  drivePhotoFilePaths.forEach( (drivePhotoFilePath) => {
    let drivePhoto = new DrivePhoto(drivePhotoFilePath);
    drivePhoto.setDimensions(getPhotoDimensions(drivePhotoFilePath));
    drivePhotoFiles.push(drivePhoto);
  });

  return drivePhotoFiles;
}

let _results = {};
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

// TODO - figure out what this is doing, why it is doing it, and document / rename appropriately
function filterDrivePhotos(volumeName, searchResults, drivePhotoFilePaths) {

  if (searchResults.Volumes[volumeName]) {
    _results = searchResults.Volumes[volumeName].resultsByPhoto;
    return drivePhotoFilePaths.filter(searchForPhoto);
  }
  return drivePhotoFilePaths;
}


function loadExistingSearchResults() {

  return new Promise( (resolve) => {
    fs.readFile('searchResults.json', { encoding: null, flag: 'r' }, (err: ?Object, data: Buffer) => {

      let existingSearchResults;

      if (err) {
        existingSearchResults = {};
        existingSearchResults.Volumes = {};
      }
      else {
        existingSearchResults = JSON.parse(data.toString('ascii'));
      }
      resolve(existingSearchResults);
    });
  });
}

function matchAllPhotoFiles(dispatch, getState, drivePhotoFiles) {

  let promises = [];
  drivePhotoFiles.forEach( (drivePhotoFile) => {
    promises.push(matchPhotoFile(dispatch, getState, drivePhotoFile));
  });
  Promise.all(promises).then( (_) => {
    dispatch(setPhotoCompareList(photoCompareList));
    dispatch(setPhotoMatchResults(dfMatchResults));
    dispatch(setPhotoMatchingComplete());
  }, (err) => {
    console.log("matchAllPhotos err: ", err);
    debugger;
  });
}

function matchPhotoFiles(dispatch, getState) {

  let drivePhotos = getState().drivePhotos.drivePhotos;

  // for testing a subset of all the files.
  // drivePhotoFiles = drivePhotoFiles.slice(0, 20);

  console.log("Number of photos on drive: ", drivePhotos.length);
  matchAllPhotoFiles(dispatch, getState, drivePhotos);
}

// ------------------------------------
// Actions
// ------------------------------------
function automaticMatchAttemptComplete(success) {
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

function setPhotoMatchResults(photoMatchResults) {
  return {
    type: SET_PHOTO_MATCH_RESULTS,
    payload: photoMatchResults
  };
}

function setPhotoMatchingComplete() {
  return {
    type: PHOTO_MATCHING_COMPLETE
  };
}

// TODO - rename me?
function setSearchResults(searchResults) {
  return {
    type: SET_SEARCH_RESULTS,
    payload: searchResults
  };
}

export function manualMatchFound(drivePhoto: DrivePhoto, googlePhoto: GooglePhoto) {
  return {
    type: MANUAL_MATCH_FOUND,
    payload: {
      drivePhoto,
      googlePhoto
    }
  };
}

export function noMatchFound(drivePhoto: DrivePhoto) {
  return {
    type: NO_MATCH_FOUND,
    payload: drivePhoto
  };
}


// ------------------------------------
// Actions Creators
// ------------------------------------
export function matchPhotos(volumeName: string) {

  console.log("photoMatcher.js::matchPhotos");

  return function (dispatch: Function, getState: Function) {

    // load prior search results
    loadExistingSearchResults().then((searchResults) => {

      // store search results for use in comparisons
      dispatch(setSearchResults(searchResults));

      // store the volume name for later use
      dispatch(setVolumeName(volumeName));

      // read the photo files from the drive
      readDrivePhotoFiles().then( (drivePhotoFilePaths) => {

        drivePhotoFilePaths = filterDrivePhotos(volumeName, searchResults, drivePhotoFilePaths);

        let drivePhotoFiles = buildDrivePhotos(drivePhotoFilePaths);

        // TODO - instead of this construct, could pass dispatch into readDrivePhotos. however, code would still need
        // TODO - to wait for it to complete before moving on. true??
        dispatch(setDrivePhotos(drivePhotoFiles));

        // TODO - it's very possible that the following could be called via dispatch - I think it's completely synchronous
        buildPhotoDictionaries(dispatch, getState);

        matchPhotoFiles(dispatch, getState);
      });
      // TODO catch errors
    });
  };
}

function summarizeSearchResult(rawSearchResult) {

  let summarySearchResult = {};
  summarySearchResult.matchResult = rawSearchResult.matchResult;
  summarySearchResult.path = rawSearchResult.drivePhotoFile.getPath();

  switch (rawSearchResult.matchResult) {
    case 'MATCH_FOUND':
      summarySearchResult.gfName = rawSearchResult.matchingGF.getName();
      break;
    case 'MANUAL_MATCH_FOUND':
      summarySearchResult.dfLastModifiedISO = rawSearchResult.drivePhotoFile.getLastModifiedISO();
      summarySearchResult.dfExifCreateDate = rawSearchResult.drivePhotoFile.getExifCreateDate();
      summarySearchResult.dfExifDateTimeOriginal = rawSearchResult.drivePhotoFile.getExifDateTimeOriginal();
      summarySearchResult.gfName = rawSearchResult.matchingGF.getName();
      summarySearchResult.gfDateTime = rawSearchResult.matchingGF.getDateTime();
      summarySearchResult.gfExifDateTime = rawSearchResult.matchingGF.getExifDateTime();
      break;
    case 'NO_MATCH_FOUND':
      break;
    case 'MANUAL_MATCH_FAILURE':
      summarySearchResult.matchResult = 'NO_MATCH_FOUND';
      break;
    case 'MANUAL_MATCH_PENDING':
      summarySearchResult.dfLastModifiedISO = rawSearchResult.drivePhotoFile.getLastModifiedISO();
      summarySearchResult.dfExifCreateDate = rawSearchResult.drivePhotoFile.getExifCreateDate();
      summarySearchResult.dfExifDateTimeOriginal = rawSearchResult.drivePhotoFile.getExifDateTimeOriginal();
      // TODO - show gfList summary (names only)?
      break;
    default:
      debugger;
      break;
  }
  return summarySearchResult;
}

export function saveResults() {

  return function (_: Function, getState: Function) {

    // merge together searchResults and driveMatchResults
    const state = getState();
    const volumeName = state.drivePhotos.volumeName;

    // start with existing search results
    let searchResults = state.matchPhotosData.searchResults;

    // search results for current volume
    let rawDriveMatchResults = state.matchPhotosData.driveMatchResults;

    // generated summarized search results from raw search results
    let summarizedSearchResults = {};
    for (let photoFilePath in rawDriveMatchResults) {
      if (rawDriveMatchResults.hasOwnProperty(photoFilePath)) {
        summarizedSearchResults[photoFilePath] = summarizeSearchResult(rawDriveMatchResults[photoFilePath]);
      }
    }

    // if necessary, merge them together
    const existingVolumeResults = searchResults.Volumes[volumeName];
    if (existingVolumeResults) {
      // TODO untested
      debugger;
      for (let photoFilePath in summarizedSearchResults) {
        if (summarizedSearchResults.hasOwnProperty(photoFilePath)) {
          existingVolumeResults.resultsByPhoto[photoFilePath] = summarizedSearchResults[photoFilePath];
        }
      }
    }
    else {
      searchResults.Volumes[volumeName] = {};
      searchResults.Volumes[volumeName].resultsByPhoto = summarizedSearchResults;
    }

    // update statistics for current volume
    let driveResults = searchResults.Volumes[volumeName].resultsByPhoto;
    let numMatchesFound = 0;
    let numNoMatchesFound = 0;
    let numManualMatchFailures = 0;
    let numManualMatchesPending = 0;
    for (let drivePhotoFilePath in driveResults) {
      if (driveResults.hasOwnProperty(drivePhotoFilePath)) {
        const compareResult = driveResults[drivePhotoFilePath].matchResult;
        switch (compareResult) {
          case 'MATCH_FOUND':
          case 'MANUAL_MATCH_FOUND':
            numMatchesFound++;
            break;
          case 'NO_MATCH_FOUND':
            numNoMatchesFound++;
            break;
          case 'MANUAL_MATCH_FAILURE':
            numManualMatchFailures++;
            break;
          case 'MANUAL_MATCH_PENDING':
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
const initialState: Object = {
  successfulMatches: 0,
  unsuccessfulMatches: 0,
  photoMatchingComplete: false,
  photoCompareList: [],
  driveMatchResults: {},
};

export default function(state: Object = initialState, action: Object) {

  switch (action.type) {

    case MATCH_ATTEMPT_COMPLETE: {
      let newState = Object.assign({}, state);
      if (action.payload) {
        newState.successfulMatches++;
      }
      else {
        newState.unsuccessfulMatches++;
      }
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
    case SET_PHOTO_MATCH_RESULTS: {
      let newState = Object.assign({}, state);
      newState.driveMatchResults = action.payload;
      return newState;
    }
    case MATCH_FOUND: {
      debugger;
      return null;
    }
    case MANUAL_MATCH_FOUND: {
      let result = {};
      result.matchResult = MANUAL_MATCH_FOUND;
      result.drivePhotoFile = action.payload.drivePhoto;
      result.matchingGF = action.payload.googlePhoto;
      let newState = Object.assign({}, state);
      newState.driveMatchResults[result.drivePhotoFile.getPath().toLowerCase()] = result;
      return newState;
    }
    case NO_MATCH_FOUND: {
      // action.payload.drivePhotoFile
      let resultData = {};
      resultData.drivePhotoFile = action.payload;
      resultData.matchResult = MANUAL_MATCH_FAILURE;
      // resultData.drivePhotoDimensions = action.payload.dimensions;
      let newState = Object.assign({}, state);
      newState.driveMatchResults[action.payload.getPath().toLowerCase()] = resultData;
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


// ------------------------------------
// Constants
// ------------------------------------
const MATCH_ATTEMPT_COMPLETE = 'MATCH_ATTEMPT_COMPLETE';
const PHOTO_MATCHING_COMPLETE = 'PHOTO_MATCHING_COMPLETE';
const SET_PHOTO_COMPARE_LIST = 'SET_PHOTO_COMPARE_LIST';
const SET_PHOTO_MATCH_RESULTS = 'SET_PHOTO_MATCH_RESULTS';
const MATCH_FOUND = 'MATCH_FOUND';
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
const MANUAL_MATCH_FOUND = 'MANUAL_MATCH_FOUND';
const MANUAL_MATCH_PENDING = 'MANUAL_MATCH_PENDING';
const MANUAL_MATCH_FAILURE = 'MANUAL_MATCH_FAILURE';

const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';
