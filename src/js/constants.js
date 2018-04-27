'use strict';

const path = require('path');

let parentPathName = path.dirname(__dirname);

module.exports = {
  TITLE:                                'Microsoft Teams',
  DEFAULT_USER_AGENT:                   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36',
  DEFAULT_TEAMS_URL:                    'https://teams.microsoft.com',
  JS_PATHNAME:                          path.join(parentPathName, 'js'),
  INJECTED_JS_PATHNAME:                 path.join(parentPathName, 'injectedJs'),
  IMAGES_PATHNAME:                      path.join(parentPathName, 'images'),
  WAIT_PAGE_LOADING_REPEAT_DELAY:       50,
  WAIT_PAGE_LOADING_MAXIMUM_ITERATIONS: 300,

  getImagePath: (imageName) => {
    return path.join(module.exports.IMAGES_PATHNAME, imageName);
  },
  getJsPath:    (jsName) => {
    return path.join(module.exports.JS_PATHNAME, jsName);
  },
  getInjectedJsPath:    (jsName) => {
    return path.join(module.exports.INJECTED_JS_PATHNAME, jsName);
  }
};
