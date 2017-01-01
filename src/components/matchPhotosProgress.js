import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

class MatchPhotosProgress extends Component {

    render () {

        console.log('MatchPhotosProgress render invoked');
        console.log('successful matches: ', this.props.successfulMatches);
        console.log('unsuccessful matches: ', this.props.unsuccessfulMatches);

        return (
                <div>
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
        );
    }
}

MatchPhotosProgress.propTypes = {
  numPhotoFiles: React.PropTypes.number.isRequired,
  successfulMatches: React.PropTypes.number.isRequired,
  unsuccessfulMatches: React.PropTypes.number.isRequired,
};

export default MatchPhotosProgress;
