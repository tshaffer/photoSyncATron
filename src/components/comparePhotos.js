import React, { Component } from 'react';
import { connect } from 'react-redux';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

class ComparePhotos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      diskImage: '',
      googleImage: ''
    };
  }

  componentWillMount() {

    console.log("comparePhotos.js::componentWillMount");
    console.log(this.props.photoCompareList);

    this.numDrivePhotosToCompare = this.props.photoCompareList.length;
    this.drivePhotoIndex = 0;

    this.numGooglePhotosToCompare = this.props.photoCompareList[this.drivePhotoIndex].photoList.length;
    this.googlePhotoIndex = 0;

      // this.numGooglePhotosToCompare = this.props.photoCompareList.length;
      // this.photoCompareListIndex = 0;
      // this.photoCompareListGooglePhotoIndex = 0;
      // this.photoCompareListNumGooglePhotos = this.props.photoCompareList[this.photoCompareListGooglePhotoIndex].photoList;

    this.updatesPhotosToCompare();
  }

  updatesPhotosToCompare() {
    const diskImage = this.props.photoCompareList[this.drivePhotoIndex].baseFile;
    const googleImage = this.props.photoCompareList[this.drivePhotoIndex].photoList[this.googlePhotoIndex].url;

    // const diskImage = this.props.photoCompareList[this.photoCompareListIndex].baseFile;
    // const googleImage = this.props.photoCompareList[this.photoCompareListGooglePhotoIndex].photoList[0].url;
    this.setState({
      diskImage,
      googleImage
    });
  }

    // handlePhotosMatch() {
    //
    //
    //     // this.photoCompareListIndex++;
    //     // if (this.photoCompareListIndex >= this.numGooglePhotosToCompare) {
    //     //     console.log("all comparisons complete - do something");
    //     // }
    //     // else {
    //     //
    //     // }
    // }
    //
    // handlePhotosDontMatch() {
    // }


  render () {

    const style = {
      marginLeft: '2px',
      marginTop: '8px',
      fontSize: '12px',
    };

      // {/*/!*<div>*!/*/}
      //     {/*/!*<RaisedButton*!/*/}
      //         {/*/!*onClick={this.handlePhotosMatch.bind(this)}*!/*/}
      //         {/*/!*label="Photos Match"*!/*/}
      //         {/*/!*style={style}*!/*/}
      // //     {/*/>*/}
      // //     {/*<RaisedButton*/}
      // // //         onClick={this.handlePhotosDontMatch.bind(this)}
      // // //         label="Photos Dont Match"
      // // //         style={style}
      // // //     />
      // // //
      // // // </div>

    return (
      <MuiThemeProvider>
        <div>
          <div className="allImages">
            <img
              className="leftImage"
              src={this.state.diskImage}
                />
            <img
              className="rightImage"
              src={this.state.googleImage}
                />
          </div>
            <div className="clear">
            </div>
            <div>
                <RaisedButton
                    label="Photos Match"
                    style={style}
                />
                <RaisedButton
                    label="Photos Don't Match"
                    style={style}
                />
            </div>
        </div>
      </MuiThemeProvider>
    );
  }
}

ComparePhotos.propTypes = {
  photoCompareList: React.PropTypes.array.isRequired
};


function mapStateToProps (state) {
  return {
    photoCompareList: state.matchPhotosData.photoCompareList,
  };
}

export default connect(mapStateToProps)(ComparePhotos);
