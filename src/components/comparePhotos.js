import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

class ComparePhotos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      images: []
    };
  }


  componentWillMount() {
    console.log("comparePhotos.js::componentWillMount");
    const images = this.props.params.images.split(",");
    console.log('comparePhotos, images: ', images);
    this.setState({images});

  }

  getImages() {

    if (this.state.images.length === 0) {
      return (
        <div>No images to compare</div>
      );
    }
    else {
      return (
        <div className="allImages">
          <img
            className="leftImage"
            src={this.state.images[0]}
         />
          <img
            className="rightImage"
            src={this.state.images[1]}
         />
        </div>
      );
    }
  }

  render () {

    const jsx = this.getImages();

    return (
      <MuiThemeProvider>
        {jsx}
      </MuiThemeProvider>
    );
  }
}

ComparePhotos.propTypes = {
  params: React.PropTypes.object.isRequired,
};


export default ComparePhotos;
