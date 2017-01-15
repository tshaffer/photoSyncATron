export class DrivePhotoFile {

  constructor(path) {
    this.path = path;
    this.dimensions = [];
    this.lastModified = null;
    this.lastModifiedISO = '';
  }

  getPath() {
    return this.path;
  }

  setDimensions(dimensions) {
    this.dimensions = dimensions;
  }

  getDimensions() {
    return this.dimensions;
  }

  setLastModified(lastModified) {
    this.lastModified = lastModified;
  }

  setLastModifiedISO(lastModifiedISO) {
    this.lastModifiedISO = lastModifiedISO;
  }
}
