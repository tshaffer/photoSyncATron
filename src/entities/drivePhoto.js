// @flow

export class DrivePhoto {

  path: string;
  dimensions: Object;
  // https://flowtype.org/docs/nullable-types.html
  lastModified: ?Date = null;
  lastModifiedISO: string;
  exifCreateDate: string;
  exifDateTimeOriginal: string;

  constructor(path: string) {
    this.path = path;
    this.dimensions = {};
    this.lastModified = null;
    this.lastModifiedISO = '';
    this.exifCreateDate = '';
    this.exifDateTimeOriginal = '';
  }

  getPath(): string {
    return this.path;
  }

  setDimensions(dimensions: Object) {
    this.dimensions = dimensions;
  }

  getDimensions(): Object {
    return this.dimensions;
  }

  getWidth(): number {
    return this.dimensions.width;
  }

  getHeight(): number {
    return this.dimensions.height;
  }

  setLastModified(lastModified: Date) {
    this.lastModified = lastModified;
  }

  getLastModified(): ?Date {
    return this.lastModified;
  }

  setLastModifiedISO(lastModifiedISO: string) {
    this.lastModifiedISO = lastModifiedISO;
  }

  getLastModifiedISO(): string {
    return this.lastModifiedISO;
  }

  setExifCreateDate(exifCreateDate: string) {
    this.exifCreateDate = exifCreateDate;
  }

  getExifCreateDate(): string {
    return this.exifCreateDate;
  }

  setExifDateTimeOriginal(exifDateTimeOriginal: string) {
    this.exifDateTimeOriginal = exifDateTimeOriginal;
  }

  getExifDateTimeOriginal(): string {
    return this.exifDateTimeOriginal;
  }
}
