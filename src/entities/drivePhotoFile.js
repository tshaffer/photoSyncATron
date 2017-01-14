export class DrivePhotoFile {

  constructor(path) {
    this.path = path;
    this.dimensions = [];
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
}
