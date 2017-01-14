export class GooglePhoto {

  constructor(googlePhotoSpec) {
    this.name = googlePhotoSpec.name;
    this.url = googlePhotoSpec.url;
    this.width = googlePhotoSpec.width;
    this.height = googlePhotoSpec.height;
    this.dateTime = googlePhotoSpec.dateTime;
    this.exifDateTime = googlePhotoSpec.exifDateTime;
  }

  getName() {
    return this.name;
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }

  getDateTime() {
    return this.dateTime;
  }

  getExifDateTime() {
    return this.exifDateTime;
  }
}
