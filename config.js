"use strict";

var path = require('path');

var config = {
  PORT: 3000,
  TILES_DIR: path.join(__dirname, '/data/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  URL: "http://127.0.0.1"
}

module.exports = config;
