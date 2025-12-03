const fs = require('fs');

// Try to find Chrome binary on macOS
function findChromeBinary() {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    process.env.CHROME_PATH
  ];

  for (const chromePath of possiblePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return undefined;
}

module.exports = {
  // Source directory
  sourceDir: './dist',

  // Ignore patterns
  ignoreFiles: [
    '*.map',
    '.DS_Store',
    'node_modules'
  ],

  // Build settings
  build: {
    overwriteDest: true,
  },

  // Run settings
  run: {
    // Firefox settings
    firefox: 'firefoxdeveloperedition',
    browserConsole: false,
    startUrl: ['about:debugging#/runtime/this-firefox'],

    // Chrome settings
    chromiumBinary: findChromeBinary(),
    // Don't specify chromiumProfile - let web-ext create a temporary one
  },
};
