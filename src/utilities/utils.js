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

export function getDateFromString(dateTimeStr) {
  const year = Number(dateTimeStr.substring(0, 4));
  const month = Number(dateTimeStr.substring(5, 7)) - 1;
  const day = Number(dateTimeStr.substring(8, 10));
  const hours = Number(dateTimeStr.substring(11, 13));
  const minutes = Number(dateTimeStr.substring(14, 16));
  const seconds = Number(dateTimeStr.substring(17, 19));
  const dateTime = new Date(year, month, day, hours, minutes, seconds);
  return dateTime;
}

export function isNumeric(num){
  if (num === '') return false;
  return !isNaN(num)
}