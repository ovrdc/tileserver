ovrdc-tileserver
==============

This is fork of Tobin Bradley's mbtiles-server which is a fork of Christopher Helm's [mbtiles-server](https://github.com/chelm/mbtiles-server) - see below for Tobin Bradley's description. 

These results using ```loadtest``` are from the second smallest Digital Ocean droplet requesting one pbf file from an mbtiles file, proxied with NGINX. An average map takes around 30-70 requests to render. Is this good? Seems like it, especially for smaller municipal government apps, which is our domain.

```
 INFO Max time (s):        10
 INFO Concurrency level:   100
 INFO Agent:               keepalive
 INFO 
 INFO Completed requests:  10120
 INFO Total errors:        0
 INFO Total time:          10.000816574 s
 INFO Requests per second: 1012
 INFO Mean latency:        96.9 ms
 INFO 
 INFO Percentage of the requests served within a certain time
 INFO   50%      82 ms
 INFO   90%      123 ms
 INFO   95%      133 ms
 INFO   99%      480 ms
 INFO  100%      3220 ms (longest request)

```

This fork also uses some code from tilehut, another great implementation of an mbtiles server.

mbtiles-server original readme
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
