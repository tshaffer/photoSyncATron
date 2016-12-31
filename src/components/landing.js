import React, { Component } from 'react';

class Landing extends Component {

  componentWillMount() {
    console.log("landing.js::componentWillMount invoked");
    this.props.onLoadGooglePhotos();
  }


  render() {
    return (
      <div>Pizza</div>
    );
  }

}

Landing.propTypes = {
  onLoadGooglePhotos: React.PropTypes.func.isRequired,
};

export default Landing;
