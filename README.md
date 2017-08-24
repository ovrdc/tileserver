ovrdc-tileserver
==============

This is fork of Tobin Bradley's mbtiles-server - see below for his description. These results are from the smallest Digital Ocean droplet requesting one pbf file from an mbtiles file. An average map takes around 30-70 requests to render.

```
 INFO Max time (s):        10
 INFO Concurrency level:   100
 INFO Agent:               keepalive
 INFO 
 INFO Completed requests:  5942
 INFO Total errors:        0
 INFO Total time:          10.00227345 s
 INFO Requests per second: 594
 INFO Mean latency:        166.3 ms
 INFO 
 INFO Percentage of the requests served within a certain time
 INFO   50%      140 ms
 INFO   90%      180 ms
 INFO   95%      210 ms
 INFO   99%      897 ms
 INFO  100%      3278 ms (longest request)

```

mbtiles-server
==============

This is a fork of Christopher Helm's awesome [mbtiles-server](https://github.com/chelm/mbtiles-server). All credit should be flung at him. The changes in this fork are:

* The first path argument is the mbtiles file, so multiple mbtiles tile sets can be served with the same service.
* Vector tiles are supported.
* Some niceties on the return header (CORS, expiration, etc.).

To get it cranking, drop a mbtiles file in the server folder and:

``` bash
npm install
node server.js
```

Requests look like this:

``` text
http://localhost:3000/<mbtiles-name>/3/1/2.png.
```
