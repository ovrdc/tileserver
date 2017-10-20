var express = require("express"),
  app = express(),
  MBTiles = require('@mapbox/mbtiles'),
  p = require("path"),
  fs = require('fs'),
  path = require('path'),
  diskspace = require('diskspace'),
  pusage = require('pidusage'),
  config = require('./config'); /* thanks tilehut*/

require('prototypes');

var tilesDir = config.TILES_DIR;

console.log(tilesDir);

app.use('/preview', express.static(config.PREVIEW_DIR));

/*create a tiles object that has all mbtiles in it and a metadata objec that has all tile metadata in it*/
var tiles, metadata;
var tileIndex = "";

function getTileData(e, callback) {

  tiles = [];
  metadata = [];

  fs.readdir(tilesDir, function(err, files) {
    if (err) throw err;

    //console.log("Serving following areas:");
    files.forEach(function(file) {
      console.log('files: ' + file);
      if (file.endsWith('.mbtiles')) {
        var tilePath = tilesDir + file;
        //get metadata from mbtiles to show on an indexpage and to create the preview map
        new MBTiles(tilePath, function(err, mbtiles) {
          if (err) throw err;
          mbtiles.getInfo(function(err, meta) {
            metadata.push(meta);
            tileIndex += ((meta.basename).substringUpTo('.mbtiles'));
          });
        });
        var ext0 = path.extname(file);
        var ext = ext0.substring(1);
        var filename = file.substringUpTo('.mbtiles');
        console.log(filename);
        var tileLocation = tilesDir + file;
        console.log(tileLocation);
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
  });
}

getTileData();


/* Set return header*/
function getContentType(t) {
  var header = {};

  /* CORS*/
  header["Access-Control-Allow-Origin"] = "*";
  header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";

  /* Cache*/

  if (t === "json") {
    header["Content-Type"] = "application/json";
    header["Cache-Control"] = "no-cache, no-store, must-revalidate";
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
    header["Content-Type"] = "application/x-protobuf";
    header["Content-Encoding"] = "gzip";
    header["Cache-Control"] = "public, max-age=604800";
  }

  return header;
}

/* tile cannon adapted from mbtiles-server */
app.get('/:s/:z/:x/:y.:t', function(req, res) {
  /*console.log(req.params);*/
  var mbtilesFile = tilesDir + req.params.s + '.mbtiles';
  /*prevent app from creating empty mbtiles file if the file is requested but does not exist*/
  if (tileIndex.indexOf(mbtilesFile)) {
    /*console.log(mbtilesFile);*/
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
          /*added for when there are no tiles at this location but the mbtiles file does exist*/
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

/*metadata for each tile thanks tilehut*/
app.get('/:s/meta.json', function(req, res) {
  var mbtilesFile = tilesDir + req.params.s + '.mbtiles';
  //prevent app from creating empty mbtiles file if the file is requested but does not exist
  if (fs.existsSync(mbtilesFile)) {
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
  if (fs.existsSync(mbtilesFile)) {
    //get metadata from mbtiles to show on an indexpage and to create the preview map
    new MBTiles(mbtilesFile, function(err, mbtiles) {
      if (err) return done(err);
      mbtiles.getInfo(function(err, info) {
        //if (err) return done(new Error('cannot get metadata'));
        if (err) return res.status(404).send(err.message);

        /* should change the tiles urls to a config setting*/
        var tilejson = {
          "tilejson": "1.0.0",
          "name": info.name,
          "description": info.description,
          "version": "1.0.0",
          "attribution": info.attribution,
          "scheme": info.scheme,
          "tiles": [
              "https://a.tiles.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format,
              "https://b.tiles.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format,
              "https://c.tiles.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format,
              "https://tiles.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format
          ],
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

/*set request options for index, json and loader files*/

app.get('/', function(req, res) {
  if (req.url == '/' || req.url == "/index.html") {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    fs.createReadStream('index.html').pipe(res);
  }
});

app.get('/loaderio-e9020011b3d721afa9b9a497fc6d24a3.html', function(req, res) {
  console.log('loader');
  fs.createReadStream('loaderio-e9020011b3d721afa9b9a497fc6d24a3.html').pipe(res);
});

app.get('/index.html', function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  fs.createReadStream('index.html').pipe(res);
});

app.get('/space.json', function(req, res) {

  var mem = 0;
  var space = [];
  var cpu = 0;

  diskspace.check('/', function(err, total, free, status) {
    var f = (free / 1073741824).toFixed(2);
    var t = (total / 1073741824).toFixed(2);
    space.push({
      freespace: f,
      totalspace: t,
      memory: mem,
      cpu: cpu
    });
    console.log(free, total);
  });

  pusage.stat(process.pid, function(err, stat) {
    mem = stat.memory / 1048576;
    space[0].memory = mem;
    space[0].cpu = stat.cpu;
    console.log('Pcpu: %s', stat.cpu)
    console.log('Mem: %s', stat.memory / 1048576) /*those are bytes*/
    pushRequest()
  })

  /* Unmonitor process*/
  pusage.unmonitor(process.pid);

  function pushRequest() {
    res.set(getContentType("json"));
    res.send(space);
  }
});

app.get('/tiles.json', function(req, res) {

  getTileData();

  //console.log('getting json file');
  res.set(getContentType("json"));
  res.send(tiles);
});

app.get('/metadata.json', function(req, res) {
  //getTileData(null, sendMetadata());
  sendMetadata();
  function sendMetadata() {
    //console.log('getting json file');
    res.set(getContentType("json"));
    res.json(metadata);
  }
});

/*end stats and static files*/

/*start up the server*/
console.log('Listening on port: ' + config.PORT);
app.listen(config.PORT);