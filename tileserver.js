var express = require("express"),
  app = express(),
  MBTiles = require('@mapbox/mbtiles'),
  p = require("path"),
  fs = require('fs'),
  path = require('path'),
  diskspace = require('diskspace');
require('prototypes');
var pusage = require('pidusage');

app.use('/preview', express.static(__dirname + '/preview'));

var tilesDir = "data/";

/*function getUsage() {
	mem = "";
	space = [];
	//usage and diskspace monitoring
	pusage.stat(process.pid, function(err, stat) {

	  mem = stat.memory/1048576;
	  space.push({memory: mem});
		console.log('Pcpu: %s', stat.cpu)
		console.log('Mem: %s', stat.memory/1048576) //those are bytes

	})

	// Unmonitor process
	pusage.unmonitor(process.pid);

	diskspace.check('/', function(err, total, free, status) {
	  var f = (free/1073741824).toFixed(2);
	  var t = (total/1073741824).toFixed(2);
	  space.push({freespace: f, totalspace: t, memory: mem});
	  console.log(free, total);
	});
}

getUsage();*/

//attempt to read tilesource URI using MBTiles.list
/*MBTiles.list(tilesDir, function(err, uriList) {
  if (err) {console.log(err)}
  console.log(uriList)
});*/

/*create a tiles object that has all mbtiles in it and a metadata objec that has all tile metadata in it*/
var tiles, metadata;

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
            metadata.push(meta)
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
  var fileCheck = tilesDir + req.params.s + '.mbtiles';
  if (fs.existsSync(fileCheck)) {
    /*console.log(fileCheck);*/
    new MBTiles(p.join(tilesDir, req.params.s + '.mbtiles'), function(err, mbtiles) {
      //console.log(req.params);
      mbtiles.getTile(req.params.z, req.params.x, req.params.y, function(err, tile, headers) {
        /*added for when there are no tiles at this location but the mbtiles file does exist*/
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

/*set request options for index, json and loader files*/

//Need help here with getting any json I create in this app to send - just have individual ones right now
/*app.get("/:d.:f", function(req, res) {
  if (req.params.f == 'json') {
  res.set(getContentType("json"));
  console.log(this[req.params.d].value);
  res.send(window[name].value);
  }
});*/

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
  getTileData(null, sendMetadata());

  function sendMetadata() {
    //console.log('getting json file');
    res.set(getContentType("json"));
    res.send(metadata);
  }
});

/*end stats and static files*/

/*start up the server*/
console.log('Listening on port: ' + 3000);
app.listen(3000);
