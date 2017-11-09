var express = require("express"),
  app = express(),
  MBTiles = require('@mapbox/mbtiles'),
  p = require("path"),
  fs = require('fs'),
  path = require('path'),
  diskspace = require('diskspace'),
  pusage = require('pidusage'),
  cors = require('cors'),
  compression = require('compression'),
  chokidar = require('chokidar'),
  config = require('./config'); /* thanks tilehut*/

require('prototypes');

app.use(cors());
app.use(compression({level: 1}))

/*
* use express to serve static files in development, will have to navigate to /public folder
* in production use nginx to serve static files - could also seve pbf via cache this way
* the directory for openmaptile styles is also handled directly by the NGINX server, could add to the public folder
*/

if (config.ENV === 'dev') {

  app.use('/public', express.static(config.PREVIEW_DIR));

}

/* Set return header*/
function getContentType(t) {
  var header = {};

  /* CORS*/
  header["Access-Control-Allow-Origin"] = "*";
  header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";

  /* Cache*/

  if (t === "json") {
    header["Content-Type"] = "application/json";
    header["Cache-Control"] = "public, max-age=3600";
  }

  /* request specific headers*/
  if (t === "png") {
    header["Content-Type"] = "image/png";
    header["Cache-Control"] = "public, max-age=604800";
  }
  if (t === "jpg") {
    header["Content-Type"] = "image/jpeg";
    header["Cache-Control"] = "public, max-age=604800";
  }
  if (t === "pbf") {
    header["Content-Type"] = "application/octet-stream";
    header["Content-Encoding"] = "gzip";
    header["Cache-Control"] = "public, max-age=604800";
  }

  return header;
}

/*
* tiles  and data directory
*/
var tilesDir = config.TILES_DIR;
var dataDir = config.DATA_DIR;

/*
* Create global variables for use later
*/
var tiles,
metadata,
tilesNumber,
tilesNumberCheck,
dataNumber,
dataNumberCheck,
tileindex,
tilesTotalSize = 0,
dataTotalSize = 0,
dataNewTotalSize = 0,
tilesNewTotalSize = 0,
dataindex = [],
requests = 10;

/*
* build metadata and tilejson for all tiles and each tile in the tiles directory and write to
* meta/metadata.json, meta/tilename-metadata.json and meta/tilename-tilejson.json
* THe metadata is used to create the data portal
* this could take a while depending on how many tiles are in the directory
*/

function getSize(file) {
  var stats = fs.statSync(file)
  return stats.size;
}

var attempts = 0;

function getTileData(e, callback) {
  tiles = [];
  metadata = [];
  fs.readdir(tilesDir, function(err, files) {
    if (err) throw err;
    tilesNumber = files.length;
    //console.log(tilesNumber);
    //console.log("Serving following areas:");
    files.forEach(function(file) {
      //console.log('files: ' + file);
      if (file.endsWith('.mbtiles')) {
        var tilePath = tilesDir + file;
        //console.log(tilePath);
        //get metadata from mbtiles to show on an indexpage and to create the preview map
        new MBTiles(tilePath, function(err, mbtiles) {
          if (err) throw err;
          mbtiles.getInfo(function(err, info) {
            if (err) {
              console.log(err);
              /* try for one minute to read the tile data, after that point exit this function */
              if (attempts < 6) {
                console.log('attempting to read tile info from new mbtiles')
                setTimeout(getTileData, 10000);
                return false
              }else{
                console.log('FAILED: attempting to read tile info from new mbtiles')
                return false
              }
              attempts = attempts + 1;
            };
            metadata.push(info)
            var tilename = file.slice(0, -8);
            /*write metadata for each tile*/
            fs.writeFile("public/meta/"+ tilename +"-metadata.json", JSON.stringify(info), function(err) {
              if (err) {
                return console.log(err)
              }
            });
            /*build tilejson*/
            if (info["vector_layers"]){
              var vl = info["vector_layers"]
            }else{
              vl = []
            }
            if (config.SUBDOMAINS.length > 0) {
              var tilesources = config.SUBDOMAINS.map(function(s, i) {
                if (i === 0 && s === "") {
                  return config.URL_PREFIX + s + config.URL + "tiles/" + tilename + "/{z}/{x}/{y}." + info.format
                }else{
                  return config.URL_PREFIX + s + '.' + config.URL + "tiles/" + tilename + "/{z}/{x}/{y}." + info.format
                }

              });
              //console.log(tilesources)
            }else{
              var tilesources = [config.URL_PREFIX + config.URL + "tiles/" + tilename + "/{z}/{x}/{y}." + info.format];
              //console.log(tilesources)
            }
            var tilejson = {
              "tilejson": "1.0.0",
              "name": info.name,
              "description": info.description,
              "version": "1.0.0",
              "attribution": info.attribution,
              "scheme": info.scheme,
              "tiles": tilesources,
              "vector_layers": vl,
              "minzoom": info.minzoom,
              "maxzoom": info.maxzoom,
              "bounds": info.bounds
            };
            //console.log(tilejson);
            /*write tilejson*/
            fs.writeFile("public/meta/"+ filename +"-tilejson.json", JSON.stringify(tilejson), function(err) {
              if (err) {
                return console.log(err)
              }
            });
          });
        });
        var ext0 = path.extname(file);
        var ext = ext0.substring(1);
        var filename = file.substringUpTo('.mbtiles');
        //console.log(filename);
        var tileLocation = tilesDir + file;
        //console.log(tileLocation);
        var stats = fs.statSync(tileLocation);
        var fileSizeInBytes = stats["size"];
        //Convert the file size to megabytes (optional)
        tiles.push({
          name: filename,
          filesize: fileSizeInBytes,
          type: ext
        });
      }
    });
    attempts = 0;
    console.log('tile metadata and tilejson complete');
    buildDataIndex();
  });
}

getTileData();

function buildDataIndex() {
  var e = dataDir;
  fs.readdir(e, function(err, files) {
    if (err) throw err;
    dataNumber = files.length;
    files.forEach(function(file) {
      //totalDataSize = totalDataSize + getSize(file);
      //console.log('files: ' + file);
      if (file.endsWith('.geojson') || file.endsWith('.json') || file.endsWith('.topojson')) {
        dataindex.push(file);
      }
    });
    fs.writeFile("public/meta/dataindex.json", dataindex, function(err) {
      if (err) {
        return console.log(err)
      }
    });
    buildIndex();
  })
}

/*
* build simple index to test against when requesting tiles, waiting for metadata to finish - switch to callback at the end of metadata for each loop
*/

function buildIndex() {
  if (metadata.length > 0 && dataindex.length > 0) {
    tileindex = metadata.reduce(function(sum, val, index) {
      var x = (val.basename).substringUpTo('.mbtiles');
      return sum + x;
    }, "");
    fs.writeFile("public/meta/tileindex.json", tileindex, function(err) {
      if (err) {
        return console.log(err)
      }
    });
    fs.writeFile("public/meta/metadata.json", 0, function (err) {
      if (err) {
        return console.log(err)
      }
    });
    fs.writeFile("public/meta/metadata.json", JSON.stringify(metadata), function(err) {
      if (err) {
        return console.log(err)
      }
    });
  }else {
    setTimeout(function() {
      buildIndex()
    }, 1000)
  }
}

/* watch tiles and data folder for changes, then rewrite the static metadata files */
/* cannot seem to get this to work, going to just update the metadata every minute if the file list is changed */
/*var watchTiles, watchData;

function watchFiles(watcher, folder, action) {
  watcher = chokidar.watch(folder, {
    persistent    : true,
    ignoreInitial : true,
    awaitWriteFinish: true
  });
  watcher
    .on('add', function(path) {
      console.log('File' +  path + 'has been added');
      action
    })
    .on('change', function(path) {
      console.log('File' +  path + 'has been changed')
      action
    })
    .on('unlink', function(path) {
      console.log('File' +  path + 'has been deleted');
      action
    });
}

watchFiles(watchTiles, './tiles', getTileData());
watchFiles(watchData, './public/data', buildDataIndex(dataDir));*/

/* tile cannon adapted from mbtiles-server */
app.get('/tiles/:s/:z/:x/:y.:t', function(req, res) {
  requests = requests + 1;
  //console.log(req.params);
  var appTilesDir = tilesDir;
  var mbtilesFile = appTilesDir + req.params.s + '.mbtiles';
  /*prevent app from creating empty mbtiles file if the file is requested but does not exist*/
  if (tileindex.indexOf(req.params.s) >= 0) {
    //console.log('exists');
    new MBTiles(p.join(appTilesDir, req.params.s + '.mbtiles'), function(err, mbtiles) {
      //console.log(req.params);
      mbtiles.getTile(req.params.z, req.params.x, req.params.y, function(err, tile, headers) {
        if (err) {
          res.set({
            "Access-Control-Allow-Origin": "*"
          });
          res.set({
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
          });
          res.set({
            "Content-Type": "text/plain"
          });
          console.log('error getting tile ' + req.params.s);
          /*added for when there are no tiles at this location but the mbtiles file does exist and there are tiles elsewhere, avoiding console log errors*/
          res.status(204).send('Tile rendering error: ' + err + '\n');
        } else {
          res.set(getContentType(req.params.t));
          res.send(tile);
          //console.log('sent');
        }
      });
      if (err) console.log("error opening database");
    });
  }
});

/*
* get space.json to add to old requests
*/

var oldSpace, space = [];
fs.readFile('./public/meta/space.json', 'utf8', function (err, data) {
  if (err) throw err;
  oldSpace = JSON.parse(data);
  requests = oldSpace[0].requests + requests;
  console.log(requests);
  monitorInit();
});

function updateMetadata(dir, name, func) {
  fs.readdir(dir, function(err, files) {
    if (err) throw err;
    checkNumber = files.length;
    console.log(checkNumber, name);
    if (checkNumber != name) {
      console.log('files changed in ' + dir)
      if (attempts === 0) {
        setTimeout(func,5000);
      }
    }
  });
}

function checkUsage() {
    pusage.stat(process.pid, function(err, stat) {
    if (err) throw err;
    //console.log(stat);
    mem = (stat.memory / 1048576);
    space[0].memory = mem.toFixed(2);
    space[0].cpu = stat.cpu;
    space[0].requests = requests;
    //console.log('Pcpu: %s', stat.cpu);
    //console.log('Mem: %s', stat.memory / 1048576);
    console.log(space[0]);
    writeSpace();
    // Unmonitor process
    pusage.unmonitor(process.pid);
  });
}

function writeSpace() {
  //console.log(space[0]);
  fs.writeFile("public/meta/space.json", JSON.stringify(space), function(err) {
    if (err) {
      return console.log(err)
    }
  });
}

function monitorInit() {
  var mem = 0;
  var cpu = 0;
  if (config.SYSTEM === 'win') {
    var drive = "C:"
  }else{
    drive = "/"
  }
  diskspace.check(drive, function(err, server) {
    if (err) throw err;
    //console.log(server);
    space = [];
    var f = (server.free / 1073741824).toFixed(2);
    var t = (server.total / 1073741824).toFixed(2);
    space.push({
      freespace: f,
      totalspace: t,
      memory: mem,
      cpu: cpu,
    });
    //console.log(free, total);
    checkUsage()
  });
  updateMetadata(tilesDir, tilesNumber, getTileData);
  updateMetadata(dataDir, dataNumber, buildDataIndex);
}

if (config.MONIT && config.MONIT === true) {
  console.log('monitoring space and memory every ' + config.MONIT_MIN + ' minutes')
  setInterval(monitorInit, 60000*config.MONIT_MIN)
}

/*end stats and static files*/

/*start up the server*/
console.log('Listening on port: ' + config.PORT);
app.listen(config.PORT);
