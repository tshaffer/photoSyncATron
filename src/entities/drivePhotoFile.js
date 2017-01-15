// @flow

export class DrivePhotoFile {

  path: string;
  dimensions: Array<Number>;
  // https://flowtype.org/docs/nullable-types.html
  lastModified: ?Object = null;
  lastModifiedISO: string;
  exifCreateDate: string;
  exifDateTimeOriginal: string;

  constructor(path: string) {
    this.path = path;
    this.dimensions = [];
    this.lastModified = null;
    this.lastModifiedISO = '';
    this.exifCreateDate = '';
    this.exifDateTimeOriginal = '';
  }

  getPath() {
    return this.path;
  }

  setDimensions(dimensions: Array<Number>) {
    this.dimensions = dimensions;
  }

  getDimensions() {
    return this.dimensions;
  }

  setLastModified(lastModified: Object) {
    this.lastModified = lastModified;
  }

  getLastModified() {
    return this.lastModified;
  }

  setLastModifiedISO(lastModifiedISO: string) {
    this.lastModifiedISO = lastModifiedISO;
  }

  getLastModifiedISO() {
    return this.lastModifiedISO;
  }

  setExifCreateDate(exifCreateDate: string) {
    this.exifCreateDate = exifCreateDate;
  }

  getExifCreateDate() {
    return this.exifCreateDate;
  }

  setExifDateTimeOriginal(exifDateTimeOriginal: string) {
    this.exifDateTimeOriginal = exifDateTimeOriginal;
  }

  getExifDateTimeOriginal() {
    return this.exifDateTimeOriginal;
  }
}
