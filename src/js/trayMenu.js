'use strict';

const electron = require('electron');
const Tray = electron.Tray;
const remote = electron.remote;
const constants = require('./constants');

module.exports = {

  toggleWindow: function() {
    let window = remote.getCurrentWindow();
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  },

  /**
   * @private
   * @return {Electron.Tray}
   */
  createTray: function() {
    let trayMenu = new Tray(constants.getImagePath('favicon-32x32.png'));
    trayMenu.on('right-click', this.toggleWindow);
    trayMenu.on('double-click', this.toggleWindow);
    trayMenu.on('click', (event) => {

      this.toggleWindow();

      // Show devTools when command clicked
      if (process.defaultApp && event.metaKey) {
        let window = remote.getCurrentWindow();

        if (window.isVisible()) {
          window.openDevTools({mode: 'detach'});
        }
      }
    });

    return trayMenu;
  }
};

