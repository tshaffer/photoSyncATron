import React, { Component } from 'react';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

class MatchPhotosProgress extends Component {

    render () {
        return (
            <MuiThemeProvider>
                <div>
                    <div>
                        Number of photo files on drive:
                        <span>
                        {this.props.numPhotoFiles}
                    </span>
                    </div>
                    <div>pizza</div>
                </div>
            </MuiThemeProvider>
        );
    }
}

MatchPhotosProgress.propTypes = {
  numPhotoFiles: React.PropTypes.number.isRequired,
};

export default MatchPhotosProgress;
