const path = require('path');
const fs = require('fs');
import axios from 'axios';
const recursive = require('recursive-readdir');
const exifImage = require('exif').ExifImage;
const jpegJS = require('jpeg-js');
const deepcopy = require("deepcopy");

import * as utils from '../utilities/utils';

const googlePhotoAlbums = [
  'Year2016',
  'Year2015',
  'Year2014',
  'Year2013',
  'Year2012',
  'Year2008',
  'Year2007',
  'Year2006',
  'Year2005',
  'Year2004',
  'Year2003',
  'Year2002',
  'Year2001',
  'Year2000',
  'YearPre2000'
];

let photosByKey = {};
let photosByExifDateTime = {};
let photosByName = {};
let photosByAltKey = {};

let photoDimensionsByName = {};

export const ADD_GOOGLE_PHOTOS = 'ADD_GOOGLE_PHOTOS';
export const SET_GOOGLE_PHOTO_DICTIONARIES = 'SET_GOOGLE_PHOTO_DICTIONARIES';
export const SET_NUM_PHOTO_FILES = 'SET_NUM_PHOTO_FILES';
export const MATCH_ATTEMPT_COMPLETE = 'MATCH_ATTEMPT_COMPLETE';
export const PHOTO_MATCHING_COMPLETE = 'PHOTO_MATCHING_COMPLETE';
export const SET_PHOTO_COMPARE_LIST = 'SET_PHOTO_COMPARE_LIST';
export const SET_DRIVE_MATCH_RESULTS = 'SET_DRIVE_MATCH_RESULTS';
export const MATCH_FOUND = 'MATCH_FOUND';
export const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
export const SET_VOLUME_NAME = 'SET_VOLUME_NAME';

function setVolumeName(volumeName) {
  return {
    type: SET_VOLUME_NAME,
    payload: volumeName
  };
}

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

function addGooglePhotos(googlePhotos) {
  return {
    type: ADD_GOOGLE_PHOTOS,
    payload: googlePhotos
  };
}

function setNumPhotoFiles(numPhotoFiles) {
  return {
    type: SET_NUM_PHOTO_FILES,
    payload: numPhotoFiles
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

function setGooglePhotoDictionaries(
    photosByExifDateTime,
    photosByKey,
    photosByName,
    photosByAltKey) {
  return {
    type: SET_GOOGLE_PHOTO_DICTIONARIES,
    payload: {
      photosByExifDateTime,
      photosByKey,
      photosByName,
      photosByAltKey
    }
  };
}

// return a list of albumIds for the albums referenced above
function parseAlbums(albums) {

  // console.log("parseAlbums: # of albums=", albums.length);

  let googlePhotoAlbumIds = [];

  albums.forEach( (album) => {
    const albumName = album.title[0]._;
    const albumIndex = googlePhotoAlbums.indexOf(albumName);
    if (albumIndex >= 0) {
      const albumId = album['gphoto:id'][0];
      // console.log("albumId: ", albumId, " albumName: ", googlePhotoAlbums[albumIndex]);
      googlePhotoAlbumIds.push(albumId);
    }
  });

  return googlePhotoAlbumIds;
}

function fetchAlbums() {

  return new Promise( (resolve, reject) => {

    const getAlbumsUrl = "http://picasaweb.google.com/data/feed/api/user/shafferfamilyphotostlsjr";
    axios.get(getAlbumsUrl)
      .then(function (albumsResponse) {
        const xml = albumsResponse.data;
        const parseString = require('xml2js').parseString;
        parseString(xml, function (_, result) {
          resolve(result);
        });
      })
      .catch(function (albumsError) {
        console.log(albumsError);
        reject(albumsError);
      });
  });
}

function fetchAlbum(albumId) {

  console.log("fetchAlbum:", albumId);

  return new Promise( (resolve, reject) => {

    const getAlbumUrl = "http://picasaweb.google.com/data/feed/api/user/shafferfamilyphotostlsjr/albumid/" + albumId;

    axios.get(getAlbumUrl, {
      params: {albumId}
    }).then(function (albumResponse) {
      console.log("album fetch complete");
      const xml = albumResponse.data;
      const parseString = require('xml2js').parseString;
      parseString(xml, function (_, result) {
        resolve(result.feed);
      });
    })
      .catch(function (fetchAlbumError) {
        console.log(fetchAlbumError);
        reject(fetchAlbumError);
      });
  });
}

function parseGooglePhoto(photo) {

  const photoId = photo['gphoto:id'][0];
  const name = photo.title[0]._;
  const url = photo['media:group'][0]['media:content'][0].$.url;
  const width = photo["gphoto:width"][0];
  const height = photo["gphoto:height"][0];

  const exifTags = photo['exif:tags'][0];

  let timestamp, ts;
  let exifDateTime = "";
  const exifTimestamp = exifTags['exif:time'];
  if (exifTimestamp) {
    timestamp = photo['exif:tags'][0]['exif:time'][0];
    exifDateTime = new Date();
    ts = Number(timestamp);
    exifDateTime.setTime(ts);
  }

  timestamp = photo['gphoto:timestamp'][0];
  let dateTime = new Date();
  ts = Number(timestamp);
  dateTime.setTime(ts);

  let imageUniqueId = '';
  const exifUniqueIdTag = exifTags["exif:imageUniqueID"];
  if (exifUniqueIdTag) {
    imageUniqueId = exifUniqueIdTag[0];
  }

  return {
    photoId,
    name,
    url,
    width,
    height,
    timestamp,
    dateTime,
    exifDateTime,
    imageUniqueId
  };
}

function fetchPhotosFromAlbums(googlePhotoAlbumIds) {

  return new Promise( (resolve, reject) => {

    let promises = [];

    // fetch each album
    googlePhotoAlbumIds.forEach( (googlePhotoAlbumId) => {
      let fetchAlbumPromise = fetchAlbum(googlePhotoAlbumId);
      promises.push(fetchAlbumPromise);
    });

    // wait until all albums have been retrieved, then get all photos
    // this wasn't the original intention, but I messed up the code,
    // figure out the right way to do it.
    Promise.all(promises).then( (googlePhotoAlbums) => {
      let allPhotos = [];
      googlePhotoAlbums.forEach( (googlePhotoAlbum) => {
        const photosInAlbum = googlePhotoAlbum.entry;
        photosInAlbum.forEach( (googlePhoto) => {
          const photo = parseGooglePhoto(googlePhoto);
          allPhotos.push(photo);
        });
      });
      resolve(allPhotos);
    }, (reason) => {
      reject("fetchPhotosFromAlbums Promise.all failed: ", reason);
    });
  });
}

function fetchGooglePhotos() {

  console.log('fetchGooglePhotos');
  return new Promise( (resolve, reject) => {

    console.log('fetchAlbums');
    fetchAlbums().then((albumsResponse) => {
      console.log('albums successfully retrieved');

      // get albumId's for the specific albums that represent all our google photo's
      const googlePhotoAlbumIds = parseAlbums(albumsResponse.feed.entry);

      // get all photos in an array
      let promise = fetchPhotosFromAlbums(googlePhotoAlbumIds);
      promise.then( (allPhotos) => {
        resolve(allPhotos);
      });
    }, (reason) => {
      reject("fetchAlbums failed: ", reason);
    });
  });
}

function retrievePhotosFromGoogle() {

  return new Promise( (resolve, reject) => {
    fetchGooglePhotos().then( (googlePhotos) => {
      console.log("Number of photos retrieved from google: ", googlePhotos.length);
      resolve(googlePhotos);
    }, (reason) => {
      console.log("fetchGooglePhotos failed: ", reason);
      reject(null);
    });
  });
}

export function loadGooglePhotos() {

  console.log("index.js::loadGooglePhotos");
  return function(dispatch, getState) {
    console.log(getState);

    // initial implementation: read all photos from google; don't read from file and
    // therefore don't merge photos from file with photos from cloud.
    retrievePhotosFromGoogle().then( (photosFromGoogle) => {

      let googlePhotosSpec = {};
      googlePhotosSpec.version = 3;
      googlePhotosSpec.photos = photosFromGoogle;

      dispatch(addGooglePhotos(photosFromGoogle));
      let state = getState();
      console.log(state);

      // // store google photo information in a file
      const googlePhotosSpecStr = JSON.stringify(googlePhotosSpec, null, 2);
      fs.writeFileSync('googlePhotos.json', googlePhotosSpecStr);
      console.log('Google photos reference file generation complete.');

    }, (reason) => {
      console.log("loadGooglePhotos error: ", reason);
    });
  };
}

function readGooglePhotoFiles(path) {
  return new Promise( (resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(data);
      }
    });
  });
}

export function readGooglePhotos() {

  return function (dispatch, getState) {

    let promise = readGooglePhotoFiles('googlePhotos.json');
    promise.then((googlePhotosStr) => {
      let googlePhotosSpec = JSON.parse(googlePhotosStr);
      let googlePhotos = googlePhotosSpec.photos;
      console.log("Number of existing google photos: ", googlePhotos.length);

      googlePhotos.forEach( (photo) => {
        if (photo.exifDateTime !== '') {
          photo.exifDateTime = photo.dateTime;
        }
      });

      dispatch(addGooglePhotos(googlePhotos));
      let state = getState();
      console.log(state);
    }, (reason) => {
      console.log('Error reading allGooglePhotos.json: ', reason);
    });

  };
}


function buildPhotoDictionaries(dispatch, googlePhotos) {

  photosByKey = {};
  photosByExifDateTime = {};
  photosByName = {};
  photosByAltKey = {};
  photoDimensionsByName = {};

  let numDuplicates = 0;
  googlePhotos.forEach( (googlePhoto) => {

    const name = googlePhoto.name;

    if (googlePhoto.exifDateTime && googlePhoto.exifDateTime !== '') {
      photosByExifDateTime[googlePhoto.exifDateTime] = googlePhoto;
    }

    const key = (name + '-' + googlePhoto.width + googlePhoto.height).toLowerCase();
    if (photosByKey[key]) {
      numDuplicates++;
    }
    else {
      photosByKey[key] = googlePhoto;
    }

    // add to photosByAltKey if name includes only digits and is > 2 characters
    // name includes extension
    if (name.length >= 7) {
      const nameWithoutExtension = name.slice(0, -4);
      if (utils.isNumeric(nameWithoutExtension)) {
        const partialName = name.slice(name.length - 6);
        // const altKey = partialName + googlePhoto.width + googlePhoto.height;
        const altKey = partialName;
        if (!photosByAltKey[altKey]) {
          photosByAltKey[altKey] = [];
        }
        photosByAltKey[altKey].push(googlePhoto);
      }
    }

    // TODO - the next line (converting to lwoer case) should be done when initially retrieving google photos from the cloud
    googlePhoto.name = googlePhoto.name.toLowerCase();
    if (photosByName[name]) {
      photosByName[name].photoList.push(googlePhoto);
    }
    else {
      photosByName[name] = {};
      photosByName[name].photoList = [googlePhoto];
    }
  });

  dispatch(setGooglePhotoDictionaries(
    photosByExifDateTime,
    photosByKey,
    photosByName,
    photosByAltKey));

  console.log('buildPhotoDictionaries, numDuplicates: ', numDuplicates);

  fs.writeFileSync('photosByExifDateTime.json', JSON.stringify(photosByExifDateTime, null, 2));
  fs.writeFileSync('photosByKey.json', JSON.stringify(photosByKey, null, 2));
  fs.writeFileSync('photosByName.json', JSON.stringify(photosByName, null, 2));
  fs.writeFileSync('photosByAltKey.json', JSON.stringify(photosByAltKey, null, 2));
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

function findPhotoByKey(dispatch, photoFile) {
  const name = path.basename(photoFile);
  const jpegData = fs.readFileSync(photoFile);
  try {
    const rawImageData = jpegJS.decode(jpegData);

    photoDimensionsByName[photoFile] = {
      width: rawImageData.width.toString(),
      height: rawImageData.height.toString()
    };

    const key = (name + '-' + rawImageData.width.toString() + rawImageData.height.toString()).toLowerCase();
    if (photosByKey[key]) {
      return setSearchResult(dispatch, photoFile, true, 'keyMatch', '');
    }
    else {
      return setSearchResult(dispatch, photoFile, false, 'noKeyMatch', '');
    }
  } catch (jpegJSError) {
    return setSearchResult(dispatch, photoFile, false, 'jpegJSError', jpegJSError);
  }
}

function findPhotoByName(photoFile) {

  let photoFiles = null;
  const fileName = path.basename(photoFile).toLowerCase();
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

  if (fileName.length >= 6) {
    const nameWithoutExtension = fileName.slice(0, -4);
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

function matchPhotoFile(dispatch, photoFile) {

  let searchResult = {};

  return new Promise( (resolve) => {
    try {
      new exifImage({ image : photoFile }, function (error, exifData) {

        if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {

          // no exif date - search in photosByKey if it's a jpeg file
          if (utils.isJpegFile(photoFile)) {
            searchResult = findPhotoByKey(dispatch, photoFile);
          }
          else {
            searchResult = setSearchResult(dispatch, photoFile, false, 'noExifNotJpg', error);
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
            searchResult = setSearchResult(dispatch, photoFile, true, 'exifMatch', '');
          }
          else {
            if (utils.isJpegFile(photoFile)) {
              searchResult = findPhotoByKey(dispatch, photoFile);
            }
            else {
              searchResult = setSearchResult(dispatch, photoFile, false, 'noExifMatch', '');
            }
          }
          searchResult.isoString = isoString;
          resolve(searchResult);
        }
      });
    } catch (error) {
      searchResult = setSearchResult(dispatch, photoFile, false, 'other', error);
      resolve(searchResult);
    }
  });
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

function matchAllPhotoFiles(dispatch, photoFiles) {

  let promises = [];
  photoFiles.forEach( (photoFile) => {
    let promise = matchPhotoFile(dispatch, photoFile);
    promises.push(promise);
  });
  Promise.all(promises).then( (searchResults) => {
    saveSearchResults(dispatch, searchResults);
  });
}

function getPhotoFilesFromDrive() {

  return new Promise( (resolve, reject) => {

    console.log("getPhotoFilesFromDrive");
    recursive("d:/", (err, files) => {
      if (err) {
        console.log("getPhotoFilesFromDrive: error");
        reject(err);
      }
      files = files.filter(utils.isPhotoFile);
      resolve(files);
    });
  });
}

function matchPhotoFiles(dispatch) {

  getPhotoFilesFromDrive().then( (photoFiles) => {

    // photoFiles = photoFiles.slice(0, 4);

    const numPhotoFiles = photoFiles.length;
    console.log('poo');
    console.log("Number of photos on drive: ", numPhotoFiles);
    dispatch(setNumPhotoFiles(numPhotoFiles));


    matchAllPhotoFiles(dispatch, photoFiles);
  }, (reason) => {
    console.log("failure in matchPhotoFiles: ", reason);
  });
}

export function readPhotosFromDrive(volumeName) {

  console.log("index.js::readPhotosFromDrive");

  return function (dispatch, getState) {

    dispatch(setVolumeName(volumeName));

    let state = getState();
    buildPhotoDictionaries(dispatch, state.googlePhotos);
    matchPhotoFiles(dispatch);
  };
}

