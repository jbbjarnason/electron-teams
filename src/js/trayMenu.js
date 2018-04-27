'use strict';

const electron = require('electron');
const Tray = electron.Tray;
const Menu = electron.Menu;
const constants = require('./constants');

let toggleWindow = function(window) {
  if (window.isVisible()) {
    window.hide();
  } else {
    window.show();
    window.focus();
  }
};

let toggleDevTools = function(window) {
  window.toggleDevTools();
};

module.exports = {

  /**
   * @private
   * @return {Electron.Tray}
   */
  createTray: (window) => {
    let trayMenu = new Tray(constants.getImagePath('favicon-32x32.png'));
    let contextMenu = Menu.buildFromTemplate([
      {
        label:       'Toggle DevTools',
        accelerator: 'Alt+Command+I',
        click:       (item, focusedWindow) => {
          window.show();
          toggleDevTools(window);
        }
      },
      {
        label:       'Quit',
        accelerator: 'Command+Q',
        selector:    'terminate:',
        click:       (item, focusedWindow) => {
          window.close();
        }
      }
    ]);
    trayMenu.setToolTip(constants.TITLE);
    trayMenu.setContextMenu(contextMenu);

    trayMenu.on('right-click', toggleWindow);
    trayMenu.on('double-click', toggleWindow);
    trayMenu.on('click', (event) => {

      toggleWindow(window);

      // Show devTools when command clicked
      if (process.defaultApp && event.metaKey) {
        toggleDevTools(window);
      }
    });

    return trayMenu;
  }
};

