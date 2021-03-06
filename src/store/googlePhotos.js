// @flow

const fs = require('fs');
import axios from 'axios';

import { GooglePhoto } from '../entities/googlePhoto';
import * as utils from '../utilities/utils';

// ------------------------------------
// Constants
// ------------------------------------
const ADD_GOOGLE_PHOTOS = 'ADD_GOOGLE_PHOTOS';
const SET_GOOGLE_PHOTO_DICTIONARIES = 'SET_GOOGLE_PHOTO_DICTIONARIES';

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

// ------------------------------------
// Helper functions
// ------------------------------------
function parseGooglePhoto(photo) {

  const photoId = photo['gphoto:id'][0];
  const name = photo.title[0]._.toLowerCase();
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

// return a list of albumIds for the albums referenced above
function parseAlbums(albums) {

  // console.log("parseAlbums: # of albums=", albums.length);
  let googlePhotoAlbumIds = [];

  albums.forEach( (album) => {
    const albumName = album.title[0]._;
    const albumIndex = googlePhotoAlbums.indexOf(albumName);
    if (albumIndex >= 0) {
      const albumId = album['gphoto:id'][0];
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

export function buildPhotoDictionaries(dispatch: Function, getState: Function) {

  let gfsByExifDateTime = {};
  let gfsByDateTime = {};
  let gfsByName = {};
  let gfsByAltKey = {};

  let gfs = getState().googlePhotos.googlePhotos;

  gfs.forEach( (gf) => {

    const name = gf.name;

    if (gf.dateTime && gf.dateTime !== '') {
      gfsByDateTime[gf.dateTime] = gf;
    }

    if (gf.exifDateTime && gf.exifDateTime !== '') {
      gfsByExifDateTime[gf.exifDateTime] = gf;
    }

    // add to photosByAltKey if name includes only digits and is > 2 characters
    // name includes extension
    if (name.length >= 7) {
      const nameWithoutExtension = name.slice(0, -4);
      if (utils.isNumeric(nameWithoutExtension)) {
        const partialName = name.slice(name.length - 6);
        const altKey = partialName;
        if (!gfsByAltKey[altKey]) {
          gfsByAltKey[altKey] = [];
        }
        gfsByAltKey[altKey].push(gf);
      }
    }

    if (gfsByName[name]) {
      gfsByName[name].gfList.push(gf);
    }
    else {
      gfsByName[name] = {};
      gfsByName[name].gfList = [gf];
    }
  });

  dispatch(setGooglePhotoDictionaries(
    gfsByDateTime,
    gfsByExifDateTime,
    gfsByName,
    gfsByAltKey));

  // fs.writeFileSync('photosByExifDateTime.json', JSON.stringify(photosByExifDateTime, null, 2));
  // fs.writeFileSync('photosByName.json', JSON.stringify(photosByName, null, 2));
  // fs.writeFileSync('photosByAltKey.json', JSON.stringify(photosByAltKey, null, 2));
}


// ------------------------------------
// Action Creators
// ------------------------------------
export function loadGooglePhotos() {

  console.log("index.js::loadGooglePhotos");
  return function(dispatch: Function) {

    // initial implementation: read all photos from google; don't read from file and
    // therefore don't merge photos from file with photos from cloud.
    fetchGooglePhotos().then( (photosFromGoogle) => {
      console.log("Number of photos retrieved from google: ", photosFromGoogle.length);

      let googlePhotosSpec = {};
      googlePhotosSpec.version = 3;
      googlePhotosSpec.photos = photosFromGoogle;

      dispatch(addGooglePhotos(photosFromGoogle));

      // // store google photo information in a file
      const googlePhotosSpecStr = JSON.stringify(googlePhotosSpec, null, 2);
      fs.writeFileSync('googlePhotos.json', googlePhotosSpecStr);
      console.log('Google photos reference file generation complete.');
    }, (reason) => {
      console.log("loadGooglePhotos failed: ", reason);
    });
  };
}

export function readGooglePhotos() {

  return function (dispatch: Function) {

    let promise = readGooglePhotoFiles('googlePhotos.json');
    promise.then((googlePhotosStr) => {
      let googlePhotosSpec = JSON.parse(googlePhotosStr);

      let googlePhotos = [];
      googlePhotosSpec.photos.forEach( (googlePhotoSpec) => {
        googlePhotos.push(new GooglePhoto(googlePhotoSpec));
      });

      console.log("Number of existing google photos: ", googlePhotos.length);
      dispatch(addGooglePhotos(googlePhotos));
    }, (reason) => {
      console.log('Error reading allGooglePhotos.json: ', reason);
    });
  };
}

// ------------------------------------
// Actions
// ------------------------------------
function addGooglePhotos(googlePhotos) {
  return {
    type: ADD_GOOGLE_PHOTOS,
    payload: googlePhotos
  };
}

function setGooglePhotoDictionaries(
  gfsByDateTime,
  gfsByExifDateTime,
  gfsByName,
  photosByAltKey) {
  return {
    type: SET_GOOGLE_PHOTO_DICTIONARIES,
    payload: {
      gfsByDateTime,
      gfsByExifDateTime,
      gfsByName,
      photosByAltKey
    }
  };
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState: Object = {
  googlePhotos: [],
  gfsByExifDateTime: {},
  gfsByName: {},
  photosByAltKey: {}

};

export default function(state: Object = initialState, action: Object) {

  switch (action.type) {

    case ADD_GOOGLE_PHOTOS:
      {
        let newState = Object.assign({}, state);
        newState.googlePhotos = action.payload;
        return newState;
      }
    case SET_GOOGLE_PHOTO_DICTIONARIES:
      {
        let payload = action.payload;
        let newState = Object.assign({}, state);
        newState.gfsByDateTime = payload.gfsByDateTime;
        newState.gfsByExifDateTime = payload.gfsByExifDateTime;
        newState.gfsByName = payload.gfsByName;
        newState.photosByAltKey = payload.photosByAltKey;
        return newState;
      }
  }

  return state;
}

