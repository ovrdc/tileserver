"use strict";

var path = require('path');

var config = {
  SYSTEM: 'nix',
  PORT: 3000,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/'),
  STATIC_DIR: path.join(__dirname, '/static/'),
  URL: "tileserver.ovrdc.org/",
  URL_PREFIX: "https://",
  META_DIR: path.join(__dirname, '/meta/'),
  /*
  * For subdmains, use a blank "" as the first subdmain to serve tiles from the url as well
  *
  */
  SUBDOMAINS: ['', 'a', 'b', 'c'],
  MONIT: true
}

module.exports = config;
