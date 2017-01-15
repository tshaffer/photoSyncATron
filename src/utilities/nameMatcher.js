const path = require('path');
const deepcopy = require("deepcopy");

import * as utils from '../utilities/utils';

const NO_NAME_MATCH = 'NO_NAME_MATCH';
const NAME_MATCH_EXACT = 'NAME_MATCH_EXACT';
const TIF_NAME_MATCH = 'TIF_NAME_MATCH';
const ALT_NAME_MATCH = 'ALT_NAME_MATCH';
const NAME_MATCH_EXACT_NO_DIMS_MATCH = 'NAME_MATCH_EXACT_NO_DIMS_MATCH';
const TIF_NAME_MATCH_NO_DIMS_MATCH = 'TIF_NAME_MATCH_NO_DIMS_MATCH';
const ALT_NAME_MATCH_NO_DIMS_MATCH = 'ALT_NAME_MATCH_NO_DIMS_MATCH';

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

function dimensionsMatch(googlePhoto) {
  return (comparePhotos(Number(googlePhoto.width), Number(googlePhoto.height), this.width, this.height));
}

export function getNameWithDimensionsMatch(df, gfStore) {

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

  return gfsMatchingDFDimensions;
}

