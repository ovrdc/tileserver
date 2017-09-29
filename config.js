"use strict";

var path = require('path');

var config = {
  PORT: 3000,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/')
}

module.exports = config;
