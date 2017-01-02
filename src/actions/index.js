const path = require('path');


import * as utils from '../utilities/utils';

let photosByKey = {};
let photosByExifDateTime = {};
let photosByName = {};
let photosByAltKey = {};


export const MATCH_ATTEMPT_COMPLETE = 'MATCH_ATTEMPT_COMPLETE';
export const PHOTO_MATCHING_COMPLETE = 'PHOTO_MATCHING_COMPLETE';
export const SET_PHOTO_COMPARE_LIST = 'SET_PHOTO_COMPARE_LIST';
export const SET_DRIVE_MATCH_RESULTS = 'SET_DRIVE_MATCH_RESULTS';
export const MATCH_FOUND = 'MATCH_FOUND';
export const NO_MATCH_FOUND = 'NO_MATCH_FOUND';

function setDriveMatchResults(driveResults) {
  return {
    type: SET_DRIVE_MATCH_RESULTS,
    payload: driveResults
  };
}

export function matchFound(photoFilePath) {
  return {
    type: MATCH_FOUND,
    payload: photoFilePath
  };
}

export function noMatchFound(photoFilePath) {
  return {
    type: NO_MATCH_FOUND,
    payload: photoFilePath
  };
}

function matchAttemptComplete(success) {
  return {
    type: MATCH_ATTEMPT_COMPLETE,
    payload: success
  };
}

function setPhotoMatchingComplete() {
  return {
    type: PHOTO_MATCHING_COMPLETE
  };
}

function setPhotoCompareList(photoCompareList) {
  return {
    type: SET_PHOTO_COMPARE_LIST,
    payload: photoCompareList
  };
}


function buildManualPhotoMatchList(dispatch, searchResults) {

  let photoCompareList = [];
  searchResults.forEach( (searchResult) => {
    if (searchResult.photoList) {
      let photoCompareItem = {};
      photoCompareItem.baseFile = searchResult.photoFile;
      photoCompareItem.photoList = searchResult.photoList.photoList;
      photoCompareList.push(photoCompareItem);
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

    if (searchResult.success) {
      numMatchesFound++;
    }
    else if (searchResult.photoList) {
      numWithPhotoList++;
      matchPhotosResults[searchResult.photoFile] = 'ManualMatchPending';
    }
    else {
      matchPhotosResults[searchResult.photoFile] = searchResult.reason;
    }
  });

  console.log('Total number of matches: ', numMatchesFound);
  console.log('Number of potential matches: ', numWithPhotoList);

  dispatch(setDriveMatchResults(matchPhotosResults));
  dispatch(setPhotoMatchingComplete());
  console.log("ALL DONE");
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

export function saveResults() {

  return function (_, getState) {

    loadExistingSearchResults().then((searchResults) => {
      // update data structure
      searchResults.lastUpdated = new Date().toLocaleDateString();
      const state = getState();
      const volumeName = state.volumeName;
      searchResults.Volumes[volumeName] = state.driveMatchResults;

      // store search results in a file
      const searchResultsStr = JSON.stringify(searchResults, null, 2);
      fs.writeFileSync('searchResults.json', searchResultsStr);

      console.log('searchResults.json saved');
    });
  };
}



