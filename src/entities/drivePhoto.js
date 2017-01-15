// @flow

export class DrivePhoto {

  path: string;
  dimensions: Array<Number>;
  // https://flowtype.org/docs/nullable-types.html
  lastModified: ?Date = null;
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

  getPath(): string {
    return this.path;
  }

  setDimensions(dimensions: Array<Number>) {
    this.dimensions = dimensions;
  }

  getDimensions(): Array<Number> {
    return this.dimensions;
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
