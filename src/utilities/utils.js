// @flow

const photoFileExtensions = [
  'jpg',
  'png',
  // 'psd',
  'tif',
  'tiff'
];

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop();
}

export function isJpegFile(fileName: string) {
  const ext = getFileExtension(fileName.toLowerCase());
  if ( (['jpg'].indexOf(ext)) >= 0) {
    return true;
  }
  else {
    return false;
  }
}

export function isPhotoFile(fileName: string) {
  const ext = getFileExtension(fileName.toLowerCase());
  if ( (photoFileExtensions.indexOf(ext)) >= 0) {
    return true;
  }
  else {
    return false;
  }
}

export function isPhoto(photo: Object) {
  const fileName = photo.title[0]._;
  return isPhotoFile(fileName);
}

export function isNumeric(num: string){
  if (num === '') return false;
  return !isNaN(num);
}

export function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

