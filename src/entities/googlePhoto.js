// @flow

export class GooglePhoto {

  name: string;
  url: string;
  width: string;
  height: string;
  dateTime: string;
  exifDateTime: string;
  hash: ?Object

  constructor(googlePhotoSpec: Object) {
    this.name = googlePhotoSpec.name;
    this.url = googlePhotoSpec.url;
    this.width = googlePhotoSpec.width;
    this.height = googlePhotoSpec.height;
    this.dateTime = googlePhotoSpec.dateTime;
    this.exifDateTime = googlePhotoSpec.exifDateTime;
    this.hash = googlePhotoSpec.hash;
  }

  getName(): string {
    return this.name;
  }

  getWidth(): string {
    return this.width;
  }

  getHeight(): string {
    return this.height;
  }

  getDateTime(): string {
    return this.dateTime;
  }

  getExifDateTime(): string {
    return this.exifDateTime;
  }
}
