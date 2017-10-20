<<<<<<< HEAD
"use strict";

var path = require('path');

var config = {
  PORT: 3000,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/'),
  META_DIR: path.join(__dirname, '/meta/'),
  URL: "tileserver.ovrdc.org/",
  SUBDOMAINS: ['a','b','c']
}

module.exports = config;
=======
"use strict";

var path = require('path');

var config = {
  SYSTEM: 'win',
  PORT: 80,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/'),
  STATIC_DIR: path.join(__dirname, '/static/'),
  URL: "localhost/",
  URL_PREFIX: "http://",
  META_DIR: path.join(__dirname, '/meta/'),
  /*
  * For subdmains, use a blank "" as the first subdmain to serve tiles from the url as well
  */
  SUBDOMAINS: [],
  MONIT: true
}

module.exports = config;
>>>>>>> 520f68dd3ba6cd33fee6d2af4af83218ea385365
