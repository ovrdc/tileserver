var express = require("express"),
  app = express(),
  MBTiles = require('@mapbox/mbtiles'),
  p = require("path"),
  fs = require('fs'),
  path = require('path'),
  diskspace = require('diskspace'),
  pusage = require('pidusage'),
  cors = require('cors');
  config = require('./config'); /* thanks tilehut*/

require('prototypes');

app.use(cors());

/*
* Should switch these static folders to being handled by NGINX but this will work for now
*/

/* Preview directory for map preview may change to map preview or something more readable*/
app.use('/preview', express.static(config.PREVIEW_DIR));

/*
* Directory for the metadata, dataindex and tilejson files
* Files in this directory are created each time the app is reloaded, so beware if you have hundreds of vector tile files in the tiles directory, may want to switch to not overwiting files if they are the same
*/
app.use('/meta', express.static(config.META_DIR));
app.use('/static', express.static(config.STATIC_DIR));


/*
* Directory for openmaptile styles is handled directly by the NGINX server, not this node server
*/

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
var tiles, metadata, fileNumber, newFileNumber, tileindex;
var dataindex = [];
var requests = 0;

/*
* build metadata and tilejson for all tiles and each tile in the tiles directory and write to
* meta/metadata.json, meta/tilename-metadata.json and meta/tilename-tilejson.json
* THe metadata is used to create the data portal
* this could take a while depending on how many tiles are in the directory
*/
function getTileData(e, callback) {

  tiles = [];
  metadata = [];

  fs.readdir(tilesDir, function(err, files) {
    if (err) throw err;
    fileNumber = files.length;
    console.log(fileNumber);
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
            if (err) throw err;
            metadata.push(info)
            var tilename = file.slice(0, -8);
            /*write tile metadata*/
            fs.writeFile("meta/"+ tilename +"-metadata.json", JSON.stringify(info), function(err) {
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
                  return config.URL_PREFIX + s + config.URL + tilename + "/{z}/{x}/{y}." + info.format
                }else{
                  return config.URL_PREFIX + s + '.' + config.URL + tilename + "/{z}/{x}/{y}." + info.format
                }

              });
              //console.log(tilesources)
            }else{
              var tilesources = [config.URL_PREFIX + config.URL + tilename + "/{z}/{x}/{y}." + info.format];
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
            fs.writeFile("meta/"+ filename +"-tilejson.json", JSON.stringify(tilejson), function(err) {
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
    console.log('metadata complete');
  });
}

getTileData();

function buildDataIndex(e) {
  fs.readdir(e, function(err, files) {
    if (err) throw err;
    files.forEach(function(file) {
      //console.log('files: ' + file);
      if (file.endsWith('.geojson') || file.endsWith('.json') || file.endsWith('.topojson')) {
        dataindex.push(file);
      }
    });
    fs.writeFile("meta/dataindex.json", dataindex, function(err) {
      if (err) {
        return console.log(err)
      }
    });
  })
};

buildDataIndex(dataDir);

/*
* build simple index to test against when requesting tiles, waiting for metadata to finish - switch to callback at the end of metadata for each loop
*/

function buildIndex() {
  if (metadata.length > 0 && dataindex.length > 0) {
    tileindex = metadata.reduce(function(sum, val, index) {
      var x = (val.basename).substringUpTo('.mbtiles');
      return sum + x;
    }, "");
    fs.writeFile("meta/tileindex.json", tileindex, function(err) {
      if (err) {
        return console.log(err)
      }
    });
    fs.writeFile("meta/metadata.json", JSON.stringify(metadata), function(err) {
      if (err) {
        return console.log(err)
      }
    });
    /*console.log(tileindex);*/
  }else {
    setTimeout(function() {
      buildIndex()
    }, 1000)
  }
}

buildIndex();

/* tile cannon adapted from mbtiles-server */
app.get('/:s/:z/:x/:y.:t', function(req, res) {
  requests = requests + 1;
  /*console.log(req.params);*/
  var mbtilesFile = tilesDir + req.params.s + '.mbtiles';
  /*prevent app from creating empty mbtiles file if the file is requested but does not exist*/
  if (tileindex.indexOf(req.params.s) >= 0) {
    //console.log('exists');
    new MBTiles(p.join(tilesDir, req.params.s + '.mbtiles'), function(err, mbtiles) {
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
          /*added for when there are no tiles at this location but the mbtiles file does exist and there are tiles elsewhere, avoiding console log errors*/
          res.status(204).send('Tile rendering error: ' + err + '\n');
        } else {
          res.set(getContentType(req.params.t));
          res.send(tile);
        }
      });
      if (err) console.log("error opening database");
    });
  }
});


/*
* this is now handled by a static file, so this is deprecated
*/

app.get('/metadata.json', function(req, res) {
  fs.readdir(tilesDir, function(err, files) {
    if (err) throw err;
    newFileNumber = files.length;
  });

  //getTileData(null, sendMetadata());
  sendMetadata();
  function sendMetadata() {
    //console.log('getting json file');
    res.set(getContentType("json"));
    res.send(metadata);
  }
});

app.get('/tileindex.json', function(req, res) {
  res.set(getContentType('json'));
  res.send(tileindex)
});

/*mbtile raw metadata for each tile thansk @joeyklee*/
app.get('/:s/meta.json', function(req, res) {
  var mbtilesFile = tilesDir + req.params.s + '.mbtiles';
  //prevent app from creating empty mbtiles file if the file is requested but does not exist
  if (tileindex.indexOf(req.params.s) >= 0) {
    //get metadata from mbtiles to show on an indexpage and to create the preview map
    new MBTiles(mbtilesFile, function(err, mbtiles) {
      if (err) return done(err);
      mbtiles.getInfo(function(err, info) {
        //if (err) return done(new Error('cannot get metadata'));
        if (err) return res.status(404).send(err.message);
        res.json(info);
      });
    });
  }
});

/*tilejson spec for each tile for use in mapbox gl js*/
app.get('/:s/tile.json', function(req, res) {
  var mbtilesFile = tilesDir + req.params.s + '.mbtiles';
  //prevent app from creating empty mbtiles file if the file is requested but does not exist
  if (tileindex.indexOf(req.params.s) >= 0) {
    //get metadata from mbtiles to show on an indexpage and to create the preview map
    new MBTiles(mbtilesFile, function(err, mbtiles) {
      if (err) return done(err);
      mbtiles.getInfo(function(err, info) {
        //if (err) return done(new Error('cannot get metadata'));
        if (err) return res.status(404).send(err.message);
        if (info["vector_layers"]){
          var vl = info["vector_layers"]
        }else{
          vl = []
        }
        /* should change the tiles urls to a config setting*/
        if (config.SUBDOMAINS.length > 0) {
          var tilesources = config.SUBDOMAINS.map(function(s, i) {
            if (i === 0) {
              return config.URL_PREFIX + s + config.URL + req.params.s + "/{z}/{x}/{y}." + info.format
            }else{
              return config.URL_PREFIX + s + '.' + config.URL + req.params.s + "/{z}/{x}/{y}." + info.format
            }

          });
        }else{
          var tilesources = config.URL_PREFIX + config.URL + tilename + "/{z}/{x}/{y}." + info.format
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

        res.set(getContentType("json"));
        res.send(tilejson);
      });
    });
  }
});

/*set request options for index, json and loader-test files*/

app.get('/', function(req, res) {
  if (req.url == '/' || req.url == "/index.html") {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    fs.createReadStream('index.html').pipe(res);
  }
});

app.get('/index.html', function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  fs.createReadStream('index.html').pipe(res);
});

app.get('/data/:d.:t', function(req, res) {
  //console.log(req.params.d);
  var reqfile = req.params.d + "." + req.params.t;
  //console.log(reqfile);
  if (req.params.d == "dataindex") {
    res.set(getContentType("json"));
    res.send(dataindex);
    return false;
  }
  if (dataindex.indexOf(reqfile) >= 0) {
    fs.readFile((dataDir + reqfile), function(err, data) {
      if (err) {
        res.status(404).send('Could not find any data 2.');
      }
      res.set(getContentType("json"));
      res.send(data)
    })
  }else{
    return res.status(404).send('Could not find any data.');
  }
});

function checkServer() {
  var mem = 0;
  var space = [];
  var cpu = 0;
  if (config.SYSTEM === 'win') {
    var drive = "C:"
  }else{
    dirve = "/"
  }
  diskspace.check(drive, function(err, server) {
    if (err) throw err;
    //console.log(server);
    var f = (server.free / 1073741824).toFixed(2);
    var t = (server.total / 1073741824).toFixed(2);
    space.push({
      freespace: f,
      totalspace: t,
      memory: mem,
      cpu: cpu
    });
    //console.log(free, total);
    checkUsage()
  });

  function checkUsage() {
      pusage.stat(process.pid, function(err, stat) {
      if (err) throw err;
      //console.log(stat);
      mem = (stat.memory / 1048576);
      space[0].memory = mem;
      space[0].cpu = stat.cpu;
      space[0].requests = requests;
      //console.log('Pcpu: %s', stat.cpu);
      //console.log('Mem: %s', stat.memory / 1048576);
      writeSpace();
    });
  }

  // Unmonitor process
  pusage.unmonitor(process.pid);

  function writeSpace() {
    //console.log(space[0]);
    fs.writeFile("meta/space.json", JSON.stringify(space), function(err) {
      if (err) {
        return console.log(err)
      }
    });
  }
}
checkServer()

if (config.MONIT && config.MONIT === true) {
  console.log('monitoring space and memory every minute')
  setInterval(checkServer, 60*1000)
}

/*end stats and static files*/

/*start up the server*/
console.log('Listening on port: ' + config.PORT);
app.listen(config.PORT);
