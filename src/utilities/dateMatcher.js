const fs = require('fs');
const exifImage = require('exif').ExifImage;

import * as utils from '../utilities/utils';

function getDateTimeMatch(dateTime, fsByDateTime) {

  if (!dateTime) return null;

  const dateTimeStr = dateTime;
  const exifDateTime = utils.getDateFromString(dateTimeStr);
  const isoString = exifDateTime.toISOString();
  return fsByDateTime[isoString];
}

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
          df.setExifCreateDate(exifData.exif.CreateDate);
          df.setExifDateTimeOriginal(exifData.exif.DateTimeOriginal);

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

function dtStartOfSecond(dt) {
  return new Date( dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds(), 0);
}

function dfToGFDateTimeMatch(dt, secondsOffset, gfsByDateTime) {
  return gfsByDateTime[(new Date(dt.getTime() + (secondsOffset * 1000))).toISOString()];
}

function matchAdjustedLastModifiedToGF(dt, secondsOffset, gfsByDateTime, gfsByExifDateTime) {
  let dtMatch = dfToGFDateTimeMatch(dt, secondsOffset, gfsByDateTime);
  if (!dtMatch) {
    dtMatch = dfToGFDateTimeMatch(dt, secondsOffset, gfsByExifDateTime);
  }
  return dtMatch;
}

export function getAllLastModifiedDateTimeMatches(df, gfStore) {

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

        let baseDT = dtStartOfSecond(lastModified);

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

export function getDFGFSDateTimeMatch(df, gfStore) {

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

