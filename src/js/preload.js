'use strict';

const {remote, webFrame} = require('electron');
const {Menu, Tray} = remote;
const constants = require('./constants');

class TeamsPreload {
  constructor() {

    /** @type {Electron.BrowserWindow} */
    this.remoteWindow = null;

    /** @type {Electron.Tray} */
    this.tray = null;
  }

  initialize() {
    this.remoteWindow = remote.getCurrentWindow();
    this.tray = this.createTray();

    // authorize electron app to load local file inside teams app
    webFrame.registerURLSchemeAsBypassingCSP('file');

    // wait for window to be loaded
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        return this.waitPageLoading();
      },
      false
    );
  }

  /**
   * @private
   * @return {Electron.Tray}
   */
  createTray() {
    let tray = new Tray(constants.getImagePath('favicon-32x32.png'));
    tray.on('right-click', TeamsPreload.toggleWindow);
    tray.on('double-click', TeamsPreload.toggleWindow);
    tray.on('click', (event) => {
      TeamsPreload.toggleWindow(this.remoteWindow);

      // Show devTools when command clicked
      if (window.isVisible() && process.defaultApp && event.metaKey) {
        window.openDevTools({mode: 'detach'});
      }
    });

    return tray;
  }

  /**
   * @private
   * @param {Electron.BrowserWindow} window
   */
  static toggleWindow(window) {
    if (window.isVisible()) {
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  }

  /**
   * @private
   * once teams page is loaded
   * loads necessary javascript files
   */
  load() {
    let jsFilePath = constants.getInjectedJsPath('notifications.js');
    let jsFileUrl = `file://${jsFilePath}`;

    let script = `
      var s = document.createElement('script');
      s.src = "${jsFileUrl}";
      s.onload = function() {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(s)
    `;

    this.remoteWindow.webContents.executeJavaScript(script);
  }

  /**
   * we are waiting for teams page to be loaded
   * if login page, reset session cache on regular interval
   */
  waitPageLoading() {
    let timer = null;
    let count = 0;
    let that = this;

    let checkIfPageIsLoaded = () => {
      if (document.querySelector('.initialized.loadingscreendone')) {
        // teams page is loaded
        clearTimeout(timer);
        that.load();
      } else if (document.querySelector('#background_branding_container')) {
        // on login page reset counter to 0
        count = 0;
      } else if (count === constants.WAIT_PAGE_LOADING_MAXIMUM_ITERATIONS) {
        // weird case, ensure session cache is empty
        that.remoteWindow.webContents.session.clearCache(() => {
          that.remoteWindow.reload();
        });

        // reset counter to 0
        count = 0;
      } else {
        count++;
      }
    };

    timer = setInterval(checkIfPageIsLoaded, constants.WAIT_PAGE_LOADING_REPEAT_DELAY);
  }
}

let teamsPreload = new TeamsPreload();
teamsPreload.initialize();
