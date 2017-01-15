// @flow

const fs = require('fs');
const exifImage = require('exif').ExifImage;

import { DrivePhoto } from '../entities/drivePhoto';
import { GooglePhoto } from '../entities/googlePhoto';

// ------------------------------------
// Photo Date Utility functions
// ------------------------------------
function getDateFromString(dateTimeStr) {
  const year = Number(dateTimeStr.substring(0, 4));
  const month = Number(dateTimeStr.substring(5, 7)) - 1;
  const day = Number(dateTimeStr.substring(8, 10));
  const hours = Number(dateTimeStr.substring(11, 13));
  const minutes = Number(dateTimeStr.substring(14, 16));
  const seconds = Number(dateTimeStr.substring(17, 19));
  return new Date(year, month, day, hours, minutes, seconds);
}

function dtStartOfSecond(dt: Date) {
  return new Date( dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds(), 0);
}

function addSeconds(dt: Date, secondsOffset: number) {
  return (new Date(dt.getTime() + (secondsOffset * 1000))).toISOString();
}

// ------------------------------------
// Photo Date Helper functions
// ------------------------------------
function gfsMatchingDateTime(dt: string, gfsByDateTime: Object) {
  return gfsByDateTime[dt];
}

function gfsMatchingExifDateTime(exifDateTimeStr: string, gfsByDateTime: Object) {

  if (!exifDateTimeStr) return null;

  const exifDateTime = getDateFromString(exifDateTimeStr);
  const isoString = exifDateTime.toISOString();
  return gfsByDateTime[isoString];
}

function gfsMatchingExifDateTimes(df: DrivePhoto, gfStore: Object) {

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

          const createDateToDateTimeExifMatch = gfsMatchingExifDateTime(exifData.exif.CreateDate, gfsByDateTime);
          const dateTimeOriginalToDateTimeExifMatch = gfsMatchingExifDateTime(exifData.exif.DateTimeOriginal, gfsByDateTime);
          const createDateToExifDateTimeExifMatch = gfsMatchingExifDateTime(exifData.exif.CreateDate, gfsByExifDateTime);
          const dateTimeOriginalToExifDateTime = gfsMatchingExifDateTime(exifData.exif.DateTimeOriginal, gfsByExifDateTime);

          const exifDateTimeCompareResults = {
            createDateToDateTimeExifMatch,
            dateTimeOriginalToDateTimeExifMatch,
            createDateToExifDateTimeExifMatch,
            dateTimeOriginalToExifDateTime
          };

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

function gfsMatchingAdjustedDFDateTime(dt: Date, secondsOffset: number, gfsByDateTime: Object, gfsByExifDateTime: Object) {
  let dtMatch = gfsMatchingDateTime(addSeconds(dt, secondsOffset), gfsByDateTime);
  if (!dtMatch) {
    dtMatch = gfsMatchingDateTime(addSeconds(dt, secondsOffset), gfsByExifDateTime);
  }
  return dtMatch;
}

function gfsMatchingLastModifiedDateTimes(df: DrivePhoto, gfStore: Object) {

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
          dtMatch = gfsMatchingAdjustedDFDateTime(baseDT, i, gfsByDateTime, gfsByExifDateTime);
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

export function gfsMatchingDFDateTimes(df: DrivePhoto, gfStore: Object) {

  return new Promise( (resolve) => {

    // look for matches between drive photo file's exif date and google photos' dates
    let allExifDateTimeMatchesPromise = gfsMatchingExifDateTimes(df, gfStore);
    let allLastModifiedDateTimeMatchesPromise = gfsMatchingLastModifiedDateTimes(df, gfStore);

    Promise.all([allExifDateTimeMatchesPromise, allLastModifiedDateTimeMatchesPromise]).then( (results) => {
      resolve(results);
    }, (err) => {
      console.log(err);
      debugger;
    });
  });
}

