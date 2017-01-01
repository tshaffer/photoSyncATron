import React, { Component } from 'react';
import { connect } from 'react-redux';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

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
    const diskImage = this.props.photoCompareList[0].baseFile;
    const googleImage = this.props.photoCompareList[0].photoList[0].url;
    this.setState({
        diskImage,
        googleImage
    });
  }

  render () {

    return (
      <MuiThemeProvider>
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
