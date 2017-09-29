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

/*Preview directory may change to map preview or something more readable*/
app.use('/preview', express.static(config.PREVIEW_DIR));

/*tiles directory, this will change to a config file in the new version, and will likely change to something like mbtiles-data, since there will probably be a geojson directory and maybe a shapefile directory*/
var tilesDir = config.TILES_DIR;
var dataDir = config.DATA_DIR;

/*create a tiles object that has all mbtiles in it and a metadata objec that has all tile metadata in it*/
var tiles, metadata, fileNumber, newFileNumber, tileindex;
var dataindex = [];;

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
          mbtiles.getInfo(function(err, meta) {
            if (err) throw err;
            metadata.push(meta)
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
  });
}

getTileData();

function buildDataIndex(e) {
  fs.readdir(e, function(err, files) {
    if (err) throw err;
    files.forEach(function(file) {
      //console.log('files: ' + file);
      if (file.endsWith('.geojson') || file.endsWith('.json') || file.endsWith('topojson')) {
        dataindex.push(file);
      }
    });
  })
};



buildDataIndex(dataDir);

function buildIndex() {
  if (metadata.length > 0 && dataindex.length >0) {
    tileindex = metadata.reduce(function(sum, val, index) {
      var x = (val.basename).substringUpTo('.mbtiles');
      return sum + x;
    }, "");
  }else {
    setTimeout(function() {
      buildIndex()
    }, 1000)
  }
}

buildIndex();

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

/* tile cannon adapted from mbtiles-server */
app.get('/:s/:z/:x/:y.:t', function(req, res) {
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

        /* should change the tiles urls to a config setting*/
        var tilejson = {
          "tilejson": "1.0.0",
          "name": info.name,
          "description": info.description,
          "version": "1.0.0",
          "attribution": info.attribution,
          "scheme": info.scheme,
          "tiles": [
              "https://127.0.0.1:3000" + req.params.s + "/{z}/{x}/{y}." + info.format
              /*"https://b.tileserver.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format,
              "https://c.tileserver.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format,
              "https://tileserver.ovrdc.org/" + req.params.s + "/{z}/{x}/{y}." + info.format*/
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

/*app.get('/space.json', function(req, res) {

  var mem = 0;
  var space = [];
  var cpu = 0;

  diskspace.check('/', function(err, total, free, status) {
    if (err) throw err;
    var f = (free / 1073741824).toFixed(2);
    var t = (total / 1073741824).toFixed(2);
    space.push({
      freespace: f,
      totalspace: t,
      memory: mem,
      cpu: cpu
    });
    //console.log(free, total);
  });

  pusage.stat(process.pid, function(err, stat) {
    if (err) throw err;
    mem = stat.memory / 1048576;
    space[0].memory = mem;
    space[0].cpu = stat.cpu;
    console.log('Pcpu: %s', stat.cpu);
    console.log('Mem: %s', stat.memory / 1048576);
    pushRequest()
  });

  // Unmonitor process
  pusage.unmonitor(process.pid);

  function pushRequest() {
    res.set(getContentType("json"));
    res.send(space);
  }
});*/

/*app.get('/tileserver.json', function(req, res) {

  fs.readdir(tilesDir, function(err, files) {
    if (err) throw err;
    newFileNumber = files.length;
  });

  if (newFileNumber != fileNumber) {
    getTileData();
  }

  //console.log('getting json file');
  res.set(getContentType("json"));
  res.send(tiles);
});*/

/*end stats and static files*/

/*start up the server*/
console.log('Listening on port: ' + config.PORT);
app.listen(config.PORT);
