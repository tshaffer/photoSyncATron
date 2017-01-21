// @flow
const path = require('path');

const childProcess = require('child_process');

// ------------------------------------
// Constants
// ------------------------------------
const convertCmd = 'convert';
// const convertCmd = '/usr/local/Cellar/imagemagick/6.9.7-2/bin/convert';


export function convertPhoto(sourcePhoto:string, targetPath: string) {

  return new Promise( (resolve, reject) => {

    // deal with spaces in the sourcePhoto path as needed.
    let paths = sourcePhoto.split(path.sep);
    paths.forEach( (subPath, index) => {
      if (subPath.indexOf(' ') >= 0) {
        paths[index] = '\"' + subPath + '\"';
      }
    });
    sourcePhoto = "";
    paths.forEach( (subPath) => {
      sourcePhoto += subPath + "/";
    });
    // sourcePhoto = path.join.apply(null, paths);
    sourcePhoto = sourcePhoto.substr(0, sourcePhoto.length - 1);

    let command = convertCmd + " " + sourcePhoto + " " + targetPath;
    console.log(command);
    childProcess.exec(command, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

