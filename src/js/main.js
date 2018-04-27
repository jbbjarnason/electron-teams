'use strict';
process.env.ELECTRON_HIDE_INTERNAL_MODULES = 'true';

const electron = require('electron');
const app = electron.app;
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;
const shell = electron.shell;
const constants = require('./constants');
const menus = require('./menus');
const trayMenu = require('./trayMenu');

let mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let startupOpts = {
  useContentSize:        true,
  width:                 800,
  height:                620,
  center:                true,
  resizable:             true,
  alwaysOnTop:           false,
  fullScreen:            true,
  skipTaskbar:           false,
  kiosk:                 false,
  title:                 constants.TITLE,
  icon:                  constants.getImagePath('favicon-256x256.png'),
  show:                  true,
  frame:                 true,
  disableAutoHideCursor: false,
  autoHideMenuBar:       false,
  titleBarStyle:         'default',
  webPreferences:        {
    webSecurity:                    false,
    nodeIntegration:                false,
    allowDisplayingInsecureContent: true,
    allowRunningInsecureContent:    true,
    plugins:                        true,
    preload:                        constants.getJsPath('preload.js')
  }
};

app.on('ready', function() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));

  trayMenu.createTray();

  mainWindow = new BrowserWindow(startupOpts);

  mainWindow.loadURL(constants.DEFAULT_TEAMS_URL, {
    userAgent: constants.DEFAULT_USER_AGENT
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', function(event, url) {
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.show();
});
