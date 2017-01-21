// @flow

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const sizeOf = require('image-size');

import { DrivePhoto } from '../entities/drivePhoto';
import { GooglePhoto } from '../entities/googlePhoto';

import { setVolumeName } from './drivePhotos';
import { readDrivePhotoFiles } from './drivePhotos';
import { setDrivePhotos } from './drivePhotos';
import { buildPhotoDictionaries } from './googlePhotos';

import * as nameMatcher from '../utilities/nameMatcher';
import * as dateMatcher from '../utilities/dateMatcher';
import { convertPhoto } from '../utilities/photoUtilities';
import * as utils from '../utilities/utils';

let photoCompareList = [];
let dfMatchResults = {};

// ------------------------------------
// Helper functions
// ------------------------------------
function setDrivePhotoMatchResult(df: DrivePhoto, result) {
  dfMatchResults[df.getPath()] = result;
}

function hashPhoto(url) {
  return new Promise( (resolve, reject) => {
    Jimp.read(url).then((image) => {
      const hash = image.hash(2);
      resolve(hash);
    }).catch( (err) => {
      reject(err);
    });
  });
}

function getNearestNumber(gfs, dfHash) {

  let currentIndex = 0;
  let currentValue = 1;
  gfs.forEach( (gf, index) => {

    if (gf.hash) {
      let newValue = Jimp.distanceByHash(dfHash, gf.hash);
      if (newValue < currentValue) {
        currentValue = newValue;
        currentIndex = index;
      }
    }
  });

  return {
    index: currentIndex,
    value: currentValue
  };
}

function gfWithNearestMatchingDFHash(dfPath, gfStore) {

  return new Promise((resolve, reject) => {

    let {googlePhotos, gfsByHash} = gfStore;
    hashPhoto(dfPath).then( ( dfHash ) => {

      let matchingGFByHash = gfsByHash[dfHash] ? gfsByHash[dfHash] : null;
      let matchingGFByNearestHash = null;

      if (!matchingGFByHash) {

        let hashCompareResults = getNearestNumber(googlePhotos, dfHash);
        let indexOfNearestNumber = hashCompareResults.index;

        matchingGFByNearestHash = {
          hashCompareResults,
          gf: googlePhotos[indexOfNearestNumber],
        };
      }

      resolve(
        {
          matchingGFByHash,
          matchingGFByNearestHash
        }
      );
    }).catch( (err) => {
      reject(err);
    });
  });
}

const hashThreshold = 0.04;

function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  // let dfPath = drivePhotoFile.path;
  let gfStore = getState().googlePhotos;

  return new Promise((resolve) => {

    let gfsMatchingDFNameAndDimensionsPromise = nameMatcher.gfsMatchingDFDimensions(drivePhotoFile, gfStore);
    let gfsMatchingDFDateTimesPromise = dateMatcher.gfsMatchingDFDateTimes(drivePhotoFile, gfStore);

    Promise.all([gfsMatchingDFNameAndDimensionsPromise, gfsMatchingDFDateTimesPromise]).then((results) => {

      const nameMatchResults = results[0];
      const exifDateTimeMatches = results[1][0];
      const lastModifiedDateTimeMatches = results[1][1];

      let matchingGF = null;

      if (!matchingGF) {
        if (exifDateTimeMatches) {

          let {createDateToDateTimeExifMatch, dateTimeOriginalToDateTimeExifMatch, createDateToExifDateTimeExifMatch, dateTimeOriginalToExifDateTime} = exifDateTimeMatches;
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
      if (matchingGF) {

        result = {
          drivePhotoFile,
          matchResult: MATCH_FOUND,
          matchType: MATCH_BY_DATE_TIME,
          matchingGF
        };
      }
      else {

        const extension = path.extname(drivePhotoFile.path);
        if (extension === '.tif') {

          // jimp doesn't support tif - convert to jpg here for hash comparison
          // but only proceed with hash comparison if their is gf with the same name (not dimensions)
          let dfName = path.basename(drivePhotoFile.path).toLowerCase();
          let fileNameWithoutExtension = dfName.slice(0, -4);
          dfName = fileNameWithoutExtension + ".jpg";
          const gfsByName = gfStore.gfsByName;
          if (gfsByName[dfName]) {
            // gf with matching name; convert then do hash compare
            result = {};
            const targetDir = "C:\\Users\\Ted\\Documents\\Projects\\photoSyncATron\\tmpFiles";
            const guid = utils.guid();
            let targetPath = path.join(targetDir, fileNameWithoutExtension + guid + ".jpg");
            console.log('convertPhoto then perform hash compare: ', drivePhotoFile.path);


            let promise = convertPhoto(drivePhotoFile.path, targetPath);
            promise.then( () => {
              // converted file should be at targetPath
              // TODO - don't know why, but it appears as though sometimes a '-0' is appended to the photo file name
              if (!fs.existsSync(targetPath)) {
                console.log(targetPath, ' converted file does not exist');
                targetPath = path.join(targetDir, fileNameWithoutExtension + guid + "-0.jpg");
                if (!fs.existsSync(targetPath)) {
                  debugger;
                }
              }

              performHashMatch(drivePhotoFile, targetPath, nameMatchResults, dispatch, gfStore, resolve);
              return;
            });
            return;
          }
          else {
            if (nameMatchResults.nameMatchResult === 'NAME_MATCH_EXACT') {
              // console.log("tif file with NAME_MATCH_EXACT");

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
              // console.log("tif file, no name/dims match");

              result = {
                drivePhotoFile,
                matchResult: NO_MATCH_FOUND
              };
            }

            dispatch(automaticMatchAttemptComplete(result.matchResult === MATCH_FOUND));
            setDrivePhotoMatchResult(drivePhotoFile, result);
            resolve();
            return;
          }
        }
        else {
          performHashMatch(drivePhotoFile, drivePhotoFile.getPath(), nameMatchResults, dispatch, gfStore, resolve);
          return;
        }
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

function performHashMatch(drivePhotoFile: DrivePhoto, dfPath, nameMatchResults, dispatch, gfStore, resolve) {

  // TODO - what other checks need to be done with a hashMatch?
  // TODO - a name match exists.
  // TODO - its dimensions are the same or the same aspect ratio.
  // TODO - there is not a date/time match with a different name

  console.log("invoke gfWithNearestMatchingDFHashPromise: ", dfPath);

  let result = null;
  let matchingGF = null;

  let gfWithNearestMatchingDFHashPromise = gfWithNearestMatchingDFHash(dfPath, gfStore);
  gfWithNearestMatchingDFHashPromise.then( (hashMatchResults) => {

    console.log("return from gfWithNearestMatchingDFHashPromise: ", dfPath);
    console.log(hashMatchResults);

    let { matchingGFByHash, matchingGFByNearestHash } = hashMatchResults;
    let hashCompareValue = 0;
    if (matchingGFByHash) {
      matchingGF = matchingGFByHash;
    }
    else if (matchingGFByNearestHash) {
      hashCompareValue = matchingGFByNearestHash.hashCompareResults.value;
      if (hashCompareValue < hashThreshold) {
        matchingGF = matchingGFByNearestHash.gf;
      }
    }

    if (matchingGF) {
      result = {
        drivePhotoFile,
        matchResult: MATCH_FOUND,
        matchType: MATCH_BY_HASH,
        hashCompareValue: hashCompareValue.toString(),
        matchingGF
      };
    }
    else {
      if (nameMatchResults.nameMatchResult === 'NAME_MATCH_EXACT') {

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
    }

    dispatch(automaticMatchAttemptComplete(result.matchResult === MATCH_FOUND));
    setDrivePhotoMatchResult(drivePhotoFile, result);
    resolve();
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
    // debugger;
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
  // drivePhotos = drivePhotos.slice(0, 20);

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

  switch (rawSearchResult.matchResult) {
    case 'MATCH_FOUND':
      summarySearchResult.gfName = rawSearchResult.matchingGF.getName();
      summarySearchResult.matchType = rawSearchResult.matchType;
      if (rawSearchResult.matchType === MATCH_BY_HASH) {
        summarySearchResult.hashDistance = rawSearchResult.hashCompareValue;
      }
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
const MATCH_BY_DATE_TIME = 'MATCH_BY_DATE_TIME';
const MATCH_BY_HASH = 'MATCH_BY_HASH';
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
const MANUAL_MATCH_FOUND = 'MANUAL_MATCH_FOUND';
const MANUAL_MATCH_PENDING = 'MANUAL_MATCH_PENDING';
const MANUAL_MATCH_FAILURE = 'MANUAL_MATCH_FAILURE';

const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';
