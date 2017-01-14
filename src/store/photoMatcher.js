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

// let pendingExifImageCalls = [];
// let exifImageCallInvoked = false;

// ------------------------------------
// Helper functions
// ------------------------------------
// df - drivePhotoFile
// gfStore - google photo store contents
let numgfsMatchingDFDimensions = 0;
function getNameWithDimensionsMatch(df, gfStore) {

  // gfsByName is a structure mapping google photo names to a list of google photos that have the same name

  // cases for possible match between file on drive and google photo
  // case 1 - look for a match with the file name as read from the drive
  // case 2 - look for a match between a tif file on the drive and a corresponding jpg google file
  // case 3 - look for a match between the file name from the drive and the modified google file names (3301.jpg => 01.jpg for example)
  const gfsByName = gfStore.gfsByName;
  const gfsByAltKey = gfStore.photosByAltKey;

  const dfPath = df.path;
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

function resultsOut(df, lbl, dfDateTime, dateTimeMatch) {
  if (dateTimeMatch) {
    console.log(df);
    console.log(lbl);
    console.log(dfDateTime);
    console.log(dateTimeMatch);
    numgfsMatchingDateTime++;
  }
}

let numgfsMatchingDateTime = 0;
function getAllExifDateTimeMatches(df, gfStore) {

  const dfPath = df.path;
  const gfsByDateTime = gfStore.gfsByDateTime;
  const gfsByExifDateTime = gfStore.gfsByExifDateTime;

  return new Promise((resolve) => {

    // check for blacklisted files
    if (dfPath.indexOf('_dsc3755') >= 0) {
      resolve(null);
    }

    try {
      new exifImage({image: dfPath}, function (error, exifData) {
        if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {
          resolve(null);
        }
        else {
          const createDateToDateTimeExifMatch = getDateTimeMatch(exifData.exif.CreateDate, gfsByDateTime);
          const dateTimeOriginalToDateTimeExifMatch = getDateTimeMatch(exifData.exif.DateTimOriginal, gfsByDateTime);
          const createDateToExifDateTimeExifMatch = getDateTimeMatch(exifData.exif.CreateDate, gfsByExifDateTime);
          const dateTimeOriginalToExifDateTime = getDateTimeMatch(exifData.exif.DateTimeOriginal.gfsByExifDateTime);

          // resultsOut(df, "createDateToDateTimeExifMatch", exifData.exif.CreateDate, createDateToDateTimeExifMatch);
          // resultsOut(df, "dateTimeOriginalToDateTimeExifMatch", exifData.exif.DateTimOriginal, dateTimeOriginalToDateTimeExifMatch);
          // resultsOut(df, "createDateToExifDateTimeExifMatch", exifData.exif.CreateDate, createDateToExifDateTimeExifMatch);
          // resultsOut(df, "dateTimeOriginalToExifDateTime", exifData.exif.DateTimeOriginal, dateTimeOriginalToExifDateTime);

          const exifDateTimeCompareResults = {
            createDateToDateTimeExifMatch,
            dateTimeOriginalToDateTimeExifMatch,
            createDateToExifDateTimeExifMatch,
            dateTimeOriginalToExifDateTime
          };

          console.log("Number of date/time matches: ", numgfsMatchingDateTime);

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

function getAllLastModifiedDateTimeMatches(df, gfStore) {

  const dfPath = df.path;
  const gfsByDateTime = gfStore.gfsByDateTime;
  const gfsByExifDateTime = gfStore.gfsByExifDateTime;

  return new Promise( (resolve, reject) => {
    fs.lstat(dfPath, (err, stats) => {
      if (err) reject(err);
      const lastModified = stats.mtime; // Date object
      const lastModifiedISO = lastModified.toISOString();

      const lastModifiedToDateTimeMatch = gfsByDateTime[lastModifiedISO];
      const lastModifiedToExifDateTimeMatch = gfsByExifDateTime[lastModifiedISO];

      // resultsOut(df, "lastModifiedToDateTimeMatch", lastModifiedISO, lastModifiedToDateTimeMatch);
      // resultsOut(df, "lastModifiedToExifDateTimeMatch", lastModifiedISO, lastModifiedToExifDateTimeMatch);

      const lastModifiedCompareResults = [
        lastModifiedToDateTimeMatch,
        lastModifiedToExifDateTimeMatch
      ];
      // const dfLastModifiedDateTimeCompareResults = {
      //   lastModifiedCompareResults
      // };
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
      // resolve ( {
      //   exifDateTimeCompareResults: results[0],
      //   dfLastModifiedDateTimeCompareResults: results[1]
      // });
    }, (err) => {
      console.log(err);
      debugger;
    });
  });
}

let allResults = {};
function setResults(df, result) {
  allResults[df.path] = result;
}

function matchPhotoFile(_, getState, drivePhotoFile) {

  return new Promise( (resolve) => {
    let gfsMatchingDFNameAndDimensionsPromise = getNameWithDimensionsMatch( drivePhotoFile, getState().googlePhotos);

    let dateTimeMatchPromise = getDFGFSDateTimeMatch(drivePhotoFile, getState().googlePhotos);

    Promise.all([gfsMatchingDFNameAndDimensionsPromise, dateTimeMatchPromise]).then( (results) => {

      // analyze results
      // TODO - figure out a better way to do this?
      const df = drivePhotoFile;
      const nameMatchResults = results[0];
      const exifDateTimeMatches = results[1][0];
      const lastModifiedDateTimeMatches = results[1][1];

      let createDateToDateTimeExifMatch = null;
      let dateTimeOriginalToDateTimeExifMatch = null;
      let createDateToExifDateTimeExifMatch = null;
      let dateTimeOriginalToExifDateTime = null;
      if (exifDateTimeMatches) {
        createDateToDateTimeExifMatch = exifDateTimeMatches[0];
        dateTimeOriginalToDateTimeExifMatch = exifDateTimeMatches[1];
        createDateToExifDateTimeExifMatch = exifDateTimeMatches[2];
        dateTimeOriginalToExifDateTime = exifDateTimeMatches[3];
      }

      let lastModifiedToDateTimeMatch = lastModifiedDateTimeMatches[0];
      let lastModifiedToExifDateTimeMatch = lastModifiedDateTimeMatches[1];
      if (lastModifiedDateTimeMatches) {
        lastModifiedToDateTimeMatch = lastModifiedDateTimeMatches[0];
        lastModifiedToExifDateTimeMatch = lastModifiedDateTimeMatches[1];
      }

      // TODO - if / else or look at all of them?
      let matchingGF = null;
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
      else if (lastModifiedToDateTimeMatch) {
        matchingGF = lastModifiedToDateTimeMatch;
      }
      else if (lastModifiedToExifDateTimeMatch) {
        matchingGF = lastModifiedToExifDateTimeMatch;
      }
      let result = null;
      if (createDateToDateTimeExifMatch || dateTimeOriginalToDateTimeExifMatch || createDateToExifDateTimeExifMatch ||
        dateTimeOriginalToExifDateTime || lastModifiedToDateTimeMatch || lastModifiedToExifDateTimeMatch) {
        result = {
          drivePhotoFile,
          MATCH_FOUND,
          matchingGF
        };
      }
      else if (nameMatchResults.nameMatchResult === 'NAME_MATCH_EXACT') {
        result = {
          drivePhotoFile,
          summaryResult: MANUAL_MATCH_PENDING,
          gfList: nameMatchResults.gfList
        };
      }
      else {
        result = {
          drivePhotoFile,
          NO_MATCH_FOUND
        };
      }
      setResults(df, result);
      resolve();
    }, (err) => {
      console.log(err);
      debugger;
    });
  });

  // debugger;
  // let gfsByExifDateTime = getState().googlePhotos.gfsByExifDateTime;
  //
  // let searchResult = {};
  //
  // return new Promise( (resolve) => {
  //
  //   let fileIsBlacklisted = false;
  //
  //   // check for blacklisted files
  //   if (drivePhotoFile.path.indexOf('_dsc3755') >= 0) {
  //     fileIsBlacklisted = true;
  //   }
  //
  //   // get list of google photos whose name 'matches' name of photo on drive
  //   // and whose dimension matches as well
  //   const googlePhotosMatchingDrivePhotoDimensions = findPhotoByFilePath(getState, drivePhotoFile);
  //   if (!googlePhotosMatchingDrivePhotoDimensions || fileIsBlacklisted) {
  //     searchResult = setSearchResult(dispatch, drivePhotoFile, null, 'noMatch', '', googlePhotosMatchingDrivePhotoDimensions);
  //     resolve(searchResult);
  //   }
  //   else {
  //     // searchResult = setSearchResult(dispatch, drivePhotoFile, null, 'noMatch', '', googlePhotosMatchingDrivePhotoDimensions);
  //     // resolve(searchResult);
  //
  //     // remove exifImage until I can determine whether or not it's causing lockup, or it's just coincidental
  //     // if it is, try workaround of invoking it sequentially
  //     let pendingExifImageCall = {
  //       image: drivePhotoFile.path,
  //       drivePhotoFile,
  //       googlePhotosMatchingDrivePhotoDimensions,
  //       gfsByExifDateTime,
  //       resolve
  //     };
  //     pendingExifImageCalls.push(pendingExifImageCall);
  //
  //     // TODO - bogus
  //     if (!exifImageCallInvoked) {
  //       exifImageCallInvoked = true;
  //       launchExifImageCall(dispatch, getState);
  //     }
  //   }
  // });
}

// function launchExifImageCall(dispatch, getState) {
//   if (pendingExifImageCalls.length > 0) {
//
//     let searchResult = null;
//
//     let pendingExifImageCall = pendingExifImageCalls.shift();
//     const drivePhotoFile = pendingExifImageCall.drivePhotoFile;
//     const googlePhotosMatchingDrivePhotoDimensions = pendingExifImageCall.googlePhotosMatchingDrivePhotoDimensions;
//     const googlePhotosByExifDateTime = pendingExifImageCall.googlePhotosByExifDateTime;
//     let resolve = pendingExifImageCall.resolve;
//
//     try {
//
//       new exifImage({image: pendingExifImageCall.image}, function (error, exifData) {
//
//         if (error || !exifData || !exifData.exif || (!exifData.exif.CreateDate && !exifData.exif.DateTimeOriginal)) {
//
//           // get last modified, created date from node
//           const stats = fs.lstatSync(pendingExifImageCall.image);
//           const lastModifiedTime = stats.mtime; // Date object
//           const isoString = lastModifiedTime.toISOString();
//           if (googlePhotosByExifDateTime[isoString]) {
//             const googlePhotoFile = googlePhotosByExifDateTime[isoString];
//             searchResult = setSearchResult(dispatch, drivePhotoFile, googlePhotoFile, 'exifMatch', '', googlePhotosMatchingDrivePhotoDimensions);
//             console.log("match: ", pendingExifImageCall.image, " using fsStat");
//           }
//           else {
//             searchResult = setSearchResult(dispatch,
//               drivePhotoFile, null, 'noMatch', error, googlePhotosMatchingDrivePhotoDimensions);
//           }
//           searchResult.isoString = isoString;
//           resolve(searchResult);
//           launchExifImageCall(dispatch, getState);
//         }
//         else {
//           let dateTimeStr = '';
//           if (exifData.exif.CreateDate) {
//             dateTimeStr = exifData.exif.CreateDate;
//           }
//           else {
//             dateTimeStr = exifData.exif.DateTimeOriginal;
//           }
//           const exifDateTime = utils.getDateFromString(dateTimeStr);
//           const isoString = exifDateTime.toISOString();
//           if (googlePhotosByExifDateTime[isoString]) {
//             const googlePhotoFile = googlePhotosByExifDateTime[isoString];
//             searchResult = setSearchResult(dispatch, drivePhotoFile, googlePhotoFile, 'exifMatch', '', googlePhotosMatchingDrivePhotoDimensions);
//           }
//           else {
//             // // given the fact that the code has made it here implies that it has matching photo dimensions with one or more google photos
//             searchResult = setSearchResult(dispatch,
//               drivePhotoFile, null, 'noMatch', '', googlePhotosMatchingDrivePhotoDimensions);
//           }
//           searchResult.isoString = isoString;
//           resolve(searchResult);
//           launchExifImageCall(dispatch, getState);
//         }
//       });
//     } catch (error) {
//       console.log('FAILED return from exifImage call: ', drivePhotoFile.pathOnDrive);
//
//       searchResult = setSearchResult(dispatch, drivePhotoFile, null, 'noMatch', error, googlePhotosMatchingDrivePhotoDimensions);
//       resolve(searchResult);
//       launchExifImageCall(dispatch, getState);
//     }
//   }
// }
//

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

// function buildManualPhotoMatchList(dispatch, searchResults) {
//
//   let photoCompareList = [];
//
//   searchResults.forEach( (searchResult) => {
//     if (searchResult.photoList) {
//       searchResult.reason = 'noMatch';    // reset value if match is possible (dimensions match)
//       // add the google photos to the list whose dimensions match that of the baseFile
//       const photoFile = searchResult.photoFile;
//       const drivePhotoDimensions = photoFile.dimensions;
//       if (drivePhotoDimensions) {
//         let photoCompareItem = null;
//         const googlePhotoList = searchResult.photoList.photoList;
//         if (googlePhotoList) {
//           googlePhotoList.forEach( (googlePhoto) => {
//             if (comparePhotos(Number(googlePhoto.width), Number(googlePhoto.height), drivePhotoDimensions.width, drivePhotoDimensions.height)) {
//               // if this is the first google photo in the photo list to match the drive photo's dimensions,
//               // create the necessary data structures
//               if (!photoCompareItem) {
//                 photoCompareItem = {};
//                 photoCompareItem.baseFile = searchResult.photoFile;
//                 photoCompareItem.photoList = [];
//               }
//               photoCompareItem.photoList.push(googlePhoto);
//             }
//           });
//         }
//         if (photoCompareItem) {
//           photoCompareList.push(photoCompareItem);
//           searchResult.reason = 'manualMatchPending';
//         }
//       }
//     }
//   });
//
//   dispatch(setPhotoCompareList(photoCompareList));
// }

// function saveSearchResults(dispatch, searchResults) {
//
//   // build results based on this search
//   let matchPhotosResults = {};
//
//   buildManualPhotoMatchList(dispatch, searchResults);
//
//   searchResults.forEach( (searchResult) => {
//
//     const path = searchResult.photoFile.path.toLowerCase();
//
//     let resultData = {};
//
//     if (searchResult.googlePhotoFile) {
//       resultData.result = 'matchFound';
//       const googlePhotoFile = searchResult.googlePhotoFile;
//       let googlePhoto = {};
//       if (googlePhotoFile.exifDateTime) {
//         googlePhoto.dateTime = googlePhotoFile.exifDateTime;
//       }
//       else {
//         googlePhoto.dateTime = googlePhotoFile.dateTime;
//       }
//       googlePhoto.name = googlePhotoFile.name.toLowerCase();
//       googlePhoto.imageUniqueId = googlePhotoFile.imageUniqueId;
//       resultData.googlePhoto = googlePhoto;
//     }
//     else if (searchResult.photoList) {
//       resultData.result = searchResult.reason;
//       resultData.drivePhotoDimensions = searchResult.drivePhotoDimensions;
//     }
//     else {
//       resultData.result = searchResult.reason;
//       resultData.drivePhotoDimensions = searchResult.drivePhotoDimensions;
//     }
//
//     matchPhotosResults[path] = resultData;
//   });
//
//   dispatch(setDriveMatchResults(matchPhotosResults));
//   dispatch(setPhotoMatchingComplete());
//   console.log("ALL DONE");
// }
//
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

// function findPhotoByFilePath(getState, drivePhotoFile) {
//
//   const googlePhotosByName = getState().googlePhotos.photosByName;
//   const googlePhotosByAltKey = getState().googlePhotos.photosByAltKey;
//
//   // photosByName is a structure mapping google photo names to a list of google photos that have the same name
//
//   // cases for possible match between file on drive and google photo
//   // case 1 - look for a match with the file name as read from the drive
//   // case 2 - look for a match between a tif file on the drive and a corresponding jpg google file
//   // case 3 - look for a match between the file name from the drive and the modified google file names (3301.jpg => 01.jpg for example)
//
//   // return value
//   //    photoFiles
//   //      object that contains
//   //        photoFile - object representing the photo file on the drive. includes
//   //          path
//   //          dimensions
//   //            QUESTION - in the case of .tif files, should this be the original path, or the path as modified to have the .jpg extension?
//   //            I think it should have the original path.
//   //        photoList
//   //          array of google photos that match photoFile (see above for what 'match' means)
//
//   let nameWithoutExtension = '';
//   let googlePhotosMatchingDrivePhotoDimensions = null;
//
//   let fileName = path.basename(drivePhotoFile.path).toLowerCase();
//
//   const extension = path.extname(drivePhotoFile.path);
//   if (extension !== '') {
//     nameWithoutExtension = fileName.slice(0, -4);
//   }
//
//   if (!googlePhotosByName[fileName]) {
//     if (extension === '.tif') {
//       fileName = nameWithoutExtension + ".jpg";
//     }
//   }
//
//   if (googlePhotosByName[fileName]) {
//
//     let googlePhotoListMatchingDimensions = null;
//     if (googlePhotosByName[fileName].photoList) {
//       googlePhotoListMatchingDimensions = deepcopy(googlePhotosByName[fileName].photoList);
//     }
//     if (googlePhotoListMatchingDimensions) {
//       googlePhotoListMatchingDimensions = googlePhotoListMatchingDimensions.filter(dimensionsMatch, drivePhotoFile.dimensions);
//       if (googlePhotoListMatchingDimensions && googlePhotoListMatchingDimensions.length === 0) {
//         googlePhotoListMatchingDimensions = null;
//       }
//     }
//     googlePhotosMatchingDrivePhotoDimensions = {
//       pathOnDrive: drivePhotoFile.path,
//       photoList: googlePhotoListMatchingDimensions
//     };
//   }
//
//   // TODO - use path.extname to figure stuff out (check whether or not it's blank) rather than length of string (if it makes sense)
//   if (fileName.length >= 6) {
//     if (utils.isNumeric(nameWithoutExtension)) {
//       const partialName = fileName.slice(fileName.length - 6);
//       if (googlePhotosByAltKey[partialName]) {
//         if (!googlePhotosMatchingDrivePhotoDimensions) {
//           googlePhotosMatchingDrivePhotoDimensions = {
//             pathOnDrive: drivePhotoFile.path,
//             photoList: []
//           };
//         }
//         googlePhotosByAltKey[partialName].forEach( (googlePhoto) => {
//
//           let googlePhotoAdded = false;
//           if (drivePhotoFile.dimensions) {
//             if (googlePhoto.width === drivePhotoFile.dimensions.width &&
//               googlePhoto.height === drivePhotoFile.dimensions.height) {
//               googlePhotosMatchingDrivePhotoDimensions.photoList.unshift(googlePhoto);
//               googlePhotoAdded = true;
//             }
//           }
//           if (!googlePhotoAdded) {
//             googlePhotosMatchingDrivePhotoDimensions.photoList.push(googlePhoto);
//           }
//         });
//       }
//     }
//   }
//
//   return googlePhotosMatchingDrivePhotoDimensions;
// }
//

// function setSearchResult(dispatch, drivePhotoFile, googlePhotoFile, reason, error, googlePhotosMatchingDrivePhotoDimensions) {
//
//   let success = false;
//   if (googlePhotoFile) {
//     success = true;
//   }
//
//   let photoList = null;
//   if (!success) {
//     if (googlePhotosMatchingDrivePhotoDimensions) {
//       photoList = googlePhotosMatchingDrivePhotoDimensions;
//     }
//   }
//
//   const drivePhotoDimensions = drivePhotoFile.dimensions;
//
//   dispatch(matchAttemptComplete(success));
//
//   return {
//     photoFile : drivePhotoFile,
//     googlePhotoFile,
//     reason,
//     error,
//     photoList,
//     drivePhotoDimensions
//   };
// }

function matchAllPhotoFiles(dispatch, getState, drivePhotoFiles) {

  let promises = [];
  drivePhotoFiles.forEach( (drivePhotoFile) => {
    promises.push(matchPhotoFile(dispatch, getState, drivePhotoFile));
  });
  Promise.all(promises).then( (_) => {
    console.log(allResults);
    debugger;
    // saveSearchResults(dispatch, searchResults);
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
// function matchAttemptComplete(success) {
//   return {
//     type: MATCH_ATTEMPT_COMPLETE,
//     payload: success
//   };
// }
//
// function setPhotoCompareList(photoCompareList) {
//   return {
//     type: SET_PHOTO_COMPARE_LIST,
//     payload: photoCompareList
//   };
// }

// function setDriveMatchResults(driveResults) {
//   return {
//     type: SET_DRIVE_MATCH_RESULTS,
//     payload: driveResults
//   };
// }
//
// function setPhotoMatchingComplete() {
//   return {
//     type: PHOTO_MATCHING_COMPLETE
//   };
// }
//
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


// ------------------------------------
// Constants
// ------------------------------------
const MATCH_ATTEMPT_COMPLETE = 'MATCH_ATTEMPT_COMPLETE';
const PHOTO_MATCHING_COMPLETE = 'PHOTO_MATCHING_COMPLETE';
const SET_PHOTO_COMPARE_LIST = 'SET_PHOTO_COMPARE_LIST';
const SET_DRIVE_MATCH_RESULTS = 'SET_DRIVE_MATCH_RESULTS';
const MATCH_FOUND = 'MATCH_FOUND';
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';
const MANUAL_MATCH_PENDING = 'MANUAL_MATCH_PENDING';

const SET_SEARCH_RESULTS = 'SET_SEARCH_RESULTS';

const NO_NAME_MATCH = 'NO_NAME_MATCH';
const NAME_MATCH_EXACT = 'NAME_MATCH_EXACT';
const TIF_NAME_MATCH = 'TIF_NAME_MATCH';
const ALT_NAME_MATCH = 'ALT_NAME_MATCH';
const NAME_MATCH_EXACT_NO_DIMS_MATCH = 'NAME_MATCH_EXACT_NO_DIMS_MATCH';
const TIF_NAME_MATCH_NO_DIMS_MATCH = 'TIF_NAME_MATCH_NO_DIMS_MATCH';
const ALT_NAME_MATCH_NO_DIMS_MATCH = 'ALT_NAME_MATCH_NO_DIMS_MATCH';

// const NO_DATETIME_MATCH = '';