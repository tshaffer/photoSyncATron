const path = require('path');
const fs = require('fs');
const deepcopy = require("deepcopy");
const sizeOf = require('image-size');
const exifImage = require('exif').ExifImage;

import { DrivePhotoFile } from '../entities/drivePhotoFile';

import { setVolumeName } from './drivePhotos';
import { readDrivePhotoFiles } from './drivePhotos';
import { setDrivePhotos } from './drivePhotos';
import { buildPhotoDictionaries } from './googlePhotos';

import * as utils from '../utilities/utils';

let photoCompareList = [];

// ------------------------------------
// Helper functions
// ------------------------------------
// df - drivePhotoFile
// gfStore - google photo store contents
// let numgfsMatchingDFDimensions = 0;
function getNameWithDimensionsMatch(df, gfStore) {

  // gfsByName is a structure mapping google photo names to a list of google photos that have the same name

  // cases for possible match between file on drive and google photo
  // case 1 - look for a match with the file name as read from the drive
  // case 2 - look for a match between a tif file on the drive and a corresponding jpg google file
  // case 3 - look for a match between the file name from the drive and the modified google file names (3301.jpg => 01.jpg for example)
  const gfsByName = gfStore.gfsByName;
  const gfsByAltKey = gfStore.photosByAltKey;

  const dfPath = df.getPath();
  let nameWithoutExtension = '';

  let dfName = path.basename(dfPath).toLowerCase();

  const extension = path.extname(dfPath);
  if (extension !== '') {
    nameWithoutExtension = dfName.slice(0, -4);
  }

  let gfsMatchingDFDimensions = {};

  let nameMatchResult = NO_NAME_MATCH;

  if (!gfsByName[dfName]) {
    if (extension === '.tif') {
      dfName = nameWithoutExtension + ".jpg";
    }
  }

  if (gfsByName[dfName]) {
    let gfsMatchingDimensions = null;
    if (gfsByName[dfName].gfList) {
      gfsMatchingDimensions = deepcopy(gfsByName[dfName].gfList);
    }
    if (gfsMatchingDimensions) {
      gfsMatchingDimensions = gfsMatchingDimensions.filter(dimensionsMatch, df.dimensions);
      if (gfsMatchingDimensions && gfsMatchingDimensions.length === 0) {
        gfsMatchingDimensions = null;
        if (extension === '.tif') {
          nameMatchResult = TIF_NAME_MATCH_NO_DIMS_MATCH;
        }
        else {
          nameMatchResult = NAME_MATCH_EXACT_NO_DIMS_MATCH;
        }
      }
      else {
        // name match found with matching dimensions
        if (extension === '.tif') {
          nameMatchResult = TIF_NAME_MATCH;
        }
        else {
          nameMatchResult = NAME_MATCH_EXACT;
        }
      }
    }
    gfsMatchingDFDimensions = {
      gfList: gfsMatchingDimensions
    };
  }

  if (dfName.length >= 6) {
    // look for match with alt names
    // TODO - don't use hardcoded constant below
    if (utils.isNumeric(nameWithoutExtension)) {
      const partialName = dfName.slice(dfName.length - 6);
      if (gfsByAltKey[partialName]) {
        // this doesn't make sense to me - won't this always be null?
        if (!gfsMatchingDFDimensions) {
          gfsMatchingDFDimensions = {
            gfList: []
          };
        }
        gfsByAltKey[partialName].forEach( (gf) => {
          let gfAdded = false;
          if (df.dimensions) {
            if (gf.width === df.dimensions.width &&
              gf.height === df.dimensions.height) {
              gfsMatchingDFDimensions.gfList.unshift(gf);
              gfAdded = true;
            }
          }
          if (!gfAdded) {
            gfsMatchingDFDimensions.gfList.push(gf);
          }
        });
        if (gfsMatchingDFDimensions.gfList.length > 0) {
          nameMatchResult = ALT_NAME_MATCH;
        }
        else {
          nameMatchResult = ALT_NAME_MATCH_NO_DIMS_MATCH;
        }
      }
    }
  }

  gfsMatchingDFDimensions.nameMatchResult = nameMatchResult;

  // if (nameMatchResult !== NO_NAME_MATCH) {
  //   console.log(gfsMatchingDFDimensions);
  //   numgfsMatchingDFDimensions++;
  // }
  // console.log("Number of google photos matching drive photos names and dimensions: ", numgfsMatchingDFDimensions);

  return gfsMatchingDFDimensions;
}

function getDateTimeMatch(dateTime, fsByDateTime) {

  if (!dateTime) return null;

  const dateTimeStr = dateTime;
  const exifDateTime = utils.getDateFromString(dateTimeStr);
  const isoString = exifDateTime.toISOString();
  return fsByDateTime[isoString];
}

// let numgfsMatchingDateTime = 0;
function getAllExifDateTimeMatches(df, gfStore) {

  const dfPath = df.getPath();
  const gfsByDateTime = gfStore.gfsByDateTime;
  const gfsByExifDateTime = gfStore.gfsByExifDateTime;

  return new Promise((resolve) => {

    // check for blacklisted files
    if (dfPath.indexOf('_dsc3755') >= 0) {
      resolve(null);
      return;
    }

    try {
      new exifImage({image: dfPath}, function (error, exifData) {
        if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {
          resolve(null);
        }
        else {
          const createDateToDateTimeExifMatch = getDateTimeMatch(exifData.exif.CreateDate, gfsByDateTime);
          const dateTimeOriginalToDateTimeExifMatch = getDateTimeMatch(exifData.exif.DateTimeOriginal, gfsByDateTime);
          const createDateToExifDateTimeExifMatch = getDateTimeMatch(exifData.exif.CreateDate, gfsByExifDateTime);
          const dateTimeOriginalToExifDateTime = getDateTimeMatch(exifData.exif.DateTimeOriginal.gfsByExifDateTime);

          const exifDateTimeCompareResults = {
            createDateToDateTimeExifMatch,
            dateTimeOriginalToDateTimeExifMatch,
            createDateToExifDateTimeExifMatch,
            dateTimeOriginalToExifDateTime
          };

          // console.log("Number of df's with exif date/time: ", numgfsMatchingDateTime++);

          resolve(exifDateTimeCompareResults);
          // searchResult.isoString = isoString;
        }
      });
    } catch (error) {
      console.log('FAILED return from exifImage call: ', dfPath);
      resolve(null);
    }
  });
}

function dtDownToSecond(dt) {
  const newDate = new Date( dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds(), 0);
  return newDate;
}

function dateTimeMatch(dt, secondsOffset, gfsByDateTime) {

  const newDate = (new Date(dt.getTime() + (secondsOffset * 1000))).toISOString();
  const matchingGF = gfsByDateTime[newDate];
  return matchingGF;
}

function matchAdjustedLastModifiedToGF(dt, secondsOffset, gfsByDateTime, gfsByExifDateTime) {
  let dtMatch = dateTimeMatch(dt, secondsOffset, gfsByDateTime);
  if (!dtMatch) {
    dtMatch = dateTimeMatch(dt, secondsOffset, gfsByExifDateTime);
  }
  return dtMatch;
}

function getAllLastModifiedDateTimeMatches(df, gfStore) {

  const dfPath = df.getPath();
  const gfsByDateTime = gfStore.gfsByDateTime;
  const gfsByExifDateTime = gfStore.gfsByExifDateTime;

  return new Promise( (resolve, reject) => {
    fs.lstat(dfPath, (err, stats) => {
      if (err) {
        console.log(dfPath);
        reject(err);
      }
      const lastModified = stats.mtime; // Date object
      df.setLastModified(lastModified);

      const lastModifiedISO = lastModified.toISOString();
      df.setLastModifiedISO(lastModifiedISO);

      const lastModifiedToDateTimeMatch = gfsByDateTime[lastModifiedISO];
      const lastModifiedToExifDateTimeMatch = gfsByExifDateTime[lastModifiedISO];

      let lastModifiedCompareResults = null;

      if (!lastModifiedToDateTimeMatch && !lastModifiedToExifDateTimeMatch) {

        let baseDT = dtDownToSecond(lastModified);

        let dtMatch = null;
        for (let i = -5; i <= 5; i++) {
          dtMatch = matchAdjustedLastModifiedToGF(baseDT, i, gfsByDateTime, gfsByExifDateTime);
          if (dtMatch) break;
        }

        // TODO - tmp
        lastModifiedCompareResults = [
          dtMatch,
          null
        ];
      }
      else {
        lastModifiedCompareResults = [
          lastModifiedToDateTimeMatch,
          lastModifiedToExifDateTimeMatch
        ];
      }
      resolve(lastModifiedCompareResults);
    });
  });
}


function getDFGFSDateTimeMatch(df, gfStore) {

  return new Promise( (resolve) => {

    // look for matches between drive photo file's exif date and google photos' dates
    let allExifDateTimeMatchesPromise = getAllExifDateTimeMatches(df, gfStore);
    let allLastModifiedDateTimeMatchesPromise = getAllLastModifiedDateTimeMatches(df, gfStore);

    Promise.all([allExifDateTimeMatchesPromise, allLastModifiedDateTimeMatchesPromise]).then( (results) => {
      resolve(results);
    }, (err) => {
      console.log(err);
      debugger;
    });
  });
}

let allResults = {};
function setResults(df, result) {
  allResults[df.getPath()] = result;
}

function matchPhotoFile(dispatch, getState, drivePhotoFile) {

  return new Promise( (resolve) => {
    let gfsMatchingDFNameAndDimensionsPromise = getNameWithDimensionsMatch( drivePhotoFile, getState().googlePhotos);

    let dateTimeMatchPromise = getDFGFSDateTimeMatch(drivePhotoFile, getState().googlePhotos);

    Promise.all([gfsMatchingDFNameAndDimensionsPromise, dateTimeMatchPromise]).then( (results) => {

      // analyze results
      // TODO - figure out a better way to do this?
      const nameMatchResults = results[0];
      const exifDateTimeMatches = results[1][0];
      const lastModifiedDateTimeMatches = results[1][1];

      let matchingGF = null;
      if (exifDateTimeMatches) {

        // TODO - Joel, why doesn't this work (declared them earlier)?
        // TODO - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
        // {{createDateToDateTimeExifMatch, dateTimeOriginalToDateTimeExifMatch, createDateToExifDateTimeExifMatch, dateTimeOriginalToExifDateTime} = exifDateTimeMatches};

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
      dispatch(matchAttemptComplete(result.matchResult === MATCH_FOUND));
      setResults(drivePhotoFile, result);
      resolve();
    }, (err) => {
      console.log(err);
      debugger;
    });
  });
}


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
    let drivePhotoFile = new DrivePhotoFile(drivePhotoFilePath);
    drivePhotoFile.setDimensions(getPhotoDimensions(drivePhotoFilePath));
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

function dimensionsMatch(googlePhoto) {
  return (comparePhotos(Number(googlePhoto.width), Number(googlePhoto.height), this.width, this.height));
}

// return true if the dimensions match or their aspect ratios are 'really' close
const minSizeRequiringComparison = 1750000;
function comparePhotos(googlePhotoWidth, googlePhotoHeight, drivePhotoWidth, drivePhotoHeight) {
  if (googlePhotoWidth === drivePhotoWidth && googlePhotoHeight === drivePhotoHeight) {
    return true;
  }

  if (drivePhotoWidth * drivePhotoHeight > minSizeRequiringComparison) {
    const googlePhotoAspectRatio = googlePhotoWidth / googlePhotoHeight;
    const drivePhotoAspectRatio = drivePhotoWidth / drivePhotoHeight;

    const minValue = 0.99;
    const maxValue = 1.01;

    const aspectRatioRatio = googlePhotoAspectRatio / drivePhotoAspectRatio;
    if (aspectRatioRatio > minValue && aspectRatioRatio < maxValue) {
      return true;
    }
  }

  return false;
}

function matchAllPhotoFiles(dispatch, getState, drivePhotoFiles) {

  let promises = [];
  drivePhotoFiles.forEach( (drivePhotoFile) => {
    promises.push(matchPhotoFile(dispatch, getState, drivePhotoFile));
  });
  Promise.all(promises).then( (_) => {
    dispatch(setPhotoCompareList(photoCompareList));
    dispatch(setDriveMatchResults(allResults));
    dispatch(setPhotoMatchingComplete());
  }, (err) => {
    console.log("matchAllPhotos err: ", err);
    debugger;
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

export function matchFound(drivePhotoFile, googlePhoto) {
  return {
    type: MATCH_FOUND,
    payload: {
      drivePhotoFile,
      googlePhoto
    }
  };
}

export function manualMatchFound(drivePhotoFile, googlePhoto) {
  return {
    type: MANUAL_MATCH_FOUND,
    payload: {
      drivePhotoFile,
      googlePhoto
    }
  };
}

export function noMatchFound(drivePhotoFile) {
  return {
    type: NO_MATCH_FOUND,
    payload: drivePhotoFile
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
        const compareResult = driveResults[drivePhotoFilePath].matchResult;
        switch (compareResult) {
          case 'MATCH_FOUND':
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
      debugger;
      return null;
    }
    case MANUAL_MATCH_FOUND: {
      let result = {};
      result.matchResult = MANUAL_MATCH_FOUND;
      result.drivePhotoFile = action.payload.drivePhotoFile;
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
const SET_DRIVE_MATCH_RESULTS = 'SET_DRIVE_MATCH_RESULTS';
const MATCH_FOUND = 'MATCH_FOUND';
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
const MANUAL_MATCH_FOUND = 'MANUAL_MATCH_FOUND';
const MANUAL_MATCH_PENDING = 'MANUAL_MATCH_PENDING';
const MANUAL_MATCH_FAILURE = 'MANUAL_MATCH_FAILURE';

const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';

const NO_NAME_MATCH = 'NO_NAME_MATCH';
const NAME_MATCH_EXACT = 'NAME_MATCH_EXACT';
const TIF_NAME_MATCH = 'TIF_NAME_MATCH';
const ALT_NAME_MATCH = 'ALT_NAME_MATCH';
const NAME_MATCH_EXACT_NO_DIMS_MATCH = 'NAME_MATCH_EXACT_NO_DIMS_MATCH';
const TIF_NAME_MATCH_NO_DIMS_MATCH = 'TIF_NAME_MATCH_NO_DIMS_MATCH';
const ALT_NAME_MATCH_NO_DIMS_MATCH = 'ALT_NAME_MATCH_NO_DIMS_MATCH';

// const NO_DATETIME_MATCH = '';