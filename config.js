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
