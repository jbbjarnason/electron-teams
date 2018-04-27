const {remote, webFrame} = require('electron');

let TeamsPreload = {
  count: 0
};

const WAIT_FOR_MAXIMIZE_REPEAT_DELAY       = 50;
const WAIT_FOR_MAXIMIZE_MAXIMUM_ITERATIONS = 300;

window.addEventListener('DOMContentLoaded', function() {
  // wait for window to be loaded
  TeamsPreload.waitForMaximize(remote.getCurrentWindow());
}, false);

TeamsPreload.waitForMaximize = function(win) {
  const initialized = document.querySelector('.initialized.loadingscreendone');
  if (initialized) {
    TeamsPreload.inject(win);

    return win.maximize();
  }

  setTimeout(() => {
    const isLoginPage = document.querySelector('#background_branding_container');

    if (!isLoginPage && TeamsPreload.count === WAIT_FOR_MAXIMIZE_MAXIMUM_ITERATIONS) {
      TeamsPreload.count = 0;
      win.webContents.session.clearCache(() => {
        win.reload();
      });

      return;
    }

    if (isLoginPage) {
      TeamsPreload.count = 0;
    }

    TeamsPreload.count++;
    TeamsPreload.waitForMaximize(win);
  }, WAIT_FOR_MAXIMIZE_REPEAT_DELAY);
};

TeamsPreload.inject = function(window) {
  let jsFilePath = `file://${__dirname}/notifications.js`;

  webFrame.registerURLSchemeAsBypassingCSP('file');

  let script = `
    var s = document.createElement('script');
    s.src = "${jsFilePath}";
    s.onload = function() {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(s)
  `;

  window.webContents.executeJavaScript(script);
};
