const photoFileExtensions = [
  'jpg',
  'png',
  // 'psd',
  'tif',
  'tiff'
];

export function getFileExtension(fileName) {
  return fileName.split('.').pop();
}

export function isJpegFile(fileName) {
  const ext = getFileExtension(fileName.toLowerCase());
  if ( (['jpg'].indexOf(ext)) >= 0) {
    return true;
  }
  else {
    return false;
  }
}

export function isPhotoFile(fileName) {
  const ext = getFileExtension(fileName.toLowerCase());
  if ( (photoFileExtensions.indexOf(ext)) >= 0) {
    return true;
  }
  else {
    return false;
  }
}

export function isPhoto(photo) {
  const fileName = photo.title[0]._;
  return isPhotoFile(fileName);
}

export function isNumeric(num){
  if (num === '') return false;
  return !isNaN(num);
}