"use strict";

var path = require('path');

var config = {
  PORT: 3000,
  TILES_DIR: path.join(__dirname, '/tiles/'),
  PREVIEW_DIR: path.join(__dirname, '/preview/'),
  DATA_DIR: path.join(__dirname, '/data/'),
  URL_DIR: "http://127.0.0.1"
}

module.exports = config;


/*"use strict";

var path = require('path');

var config = {
  PORT: 3000,
  IPADDRESS: '127.0.0.1',
  TILES_DIR: path.join(__dirname, '/data/'),
  PREVIEW_DIR: path.join(__dirname + '/preview/'),
  SUBDMAINS: true,
  HOSTNAME: 'tiles.ovrdc.org'
}
module.exports = config;*/
