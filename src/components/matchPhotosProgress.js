import React, { Component } from 'react';
import { hashHistory } from 'react-router';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import RaisedButton from 'material-ui/RaisedButton';

class MatchPhotosProgress extends Component {

    handleComparePhotos() {
        hashHistory.push('/comparePhotos');
    }

    render () {

        console.log('MatchPhotosProgress render invoked');
        console.log('successful matches: ', this.props.successfulMatches);
        console.log('unsuccessful matches: ', this.props.unsuccessfulMatches);

        const style = {
            marginLeft: '2px',
            marginTop: '16px',
            fontSize: '16px',
        };

        let resolveButton = '';
        if (this.props.photoMatchingComplete) {
            resolveButton =
                <RaisedButton
                    onClick={this.handleComparePhotos.bind(this)}
                    label="Resolve"
                    style={style}
                />
            ;
        }

        return (
            <MuiThemeProvider>
                <div>
                    {resolveButton}
                    <div>
                        Number of photo files on drive:
                        <span>
                            {this.props.numPhotoFiles}
                        </span>
                    </div>
                    <div>
                        Successful matches:
                        <span>
                            {this.props.successfulMatches}
                        </span>
                    </div>
                    <div>
                        Unsuccessful matches:
                        <span>
                            {this.props.unsuccessfulMatches}
                        </span>
                    </div>
                </div>
            </MuiThemeProvider>
        );
    }
}

MatchPhotosProgress.propTypes = {
  numPhotoFiles: React.PropTypes.number.isRequired,
  successfulMatches: React.PropTypes.number.isRequired,
  unsuccessfulMatches: React.PropTypes.number.isRequired,
    photoMatchingComplete: React.PropTypes.bool.isRequired,
    photoCompareList: React.PropTypes.array.isRequired,
};

export default MatchPhotosProgress;
