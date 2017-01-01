import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

class ComparePhotos extends Component {

    constructor(props) {
        super(props);
        this.setState( {
            leftImage: '',
            rightImage: ''
        })
    }

    componentWillMount() {
        console.log('fetch images to show');
    }

    getImages() {

        if (this.state.leftImage === '' || this.state.rightImage === '') {
            return (
                <div>No images to compare</div>
            );
        }
        else {
            return (
                <div className="allImages">
                    <img
                        className="leftImage"
                        src={this.state.leftImage}
                    >
                    </img>
                    <img
                        className="rightImage"
                        src={this.state.rightImage}
                    >
                    </img>
                </div>
            );
        }
    }

    render () {

        const jsx = getImages();

        return (
            <MuiThemeProvider>
                {jsx}
            </MuiThemeProvider>
        );
    }
}

export default ComparePhotos;
