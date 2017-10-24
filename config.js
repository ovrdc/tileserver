"use strict";

var path = require('path');

var config = {
  SYSTEM: 'win',
  PORT: 80,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/'),
  STATIC_DIR: path.join(__dirname, '/static/'),
  //url with trailing slash
  URL: "127.0.0.1/",
  //http or https
  URL_PREFIX: "http://",
  META_DIR: path.join(__dirname, '/meta/'),
  /*
  * For subdmains, use a blank "" as the first subdmain to serve tiles from the url as well
  *   SUBDOMAINS: ['', 'a', 'b', 'c'],
  */
  SUBDOMAINS: [''],
  MONIT: true
}

module.exports = config;
