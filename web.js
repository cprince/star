var express = require("express");
var request = require("request");
var q = require("q");
var app = express();
app.use(express.logger());
var exec = require('child_process').exec,
    child;

var checkAndSend = function () {
    console.log("in sendMail");
    checkrain(43.654,-79.423).then(function(value){
        child = exec('echo "This will be an alert" | mail -s "Hello nodejs" col@colinprince.com',
          function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
        });
    });
}

var timeoutId = setInterval(checkAndSend, 10*60*1000);

/* =============================================== */

app.get('/rain/:lat,:lng', function(req, response) {
    var lat = req.param('lat'),
        lng = req.param('lng');

    console.log('lat',lat);
    console.log('lng',lng);
    getForecast(response, lat, lng);
});

app.get('/', function(req, response) {
    response.send('<p>Welcome to the rain predictor</p><p>example:</p><p><a href="/rain/44,-78">/rain/:lat,:lng</a></p>');
});

var checkrain = function (lat, lng) {
    var deferred = q.defer();
    var forecastbase = "https://api.forecast.io/forecast/";
    var key = "91ac025a6fe778dbe3a41cf7748b55d1";
    var opts = "/" + lat + "," + lng + "?units=ca";

    var requrl = forecastbase + key + opts;
    request(requrl, function (error, responseRR, body) {
      if (!error && responseRR.statusCode == 200) {
        var details = JSON.parse(body);
        var raining = false;
        if (details.currently.precipIntensity > 0) {
            raining = true;
        }
        deferred.resolve({
                        latitude: details.latitude,
                        longitude: details.longitude,
                        raining: raining
                      });
      } else {
        deferred.reject("oops something didn't work");
      }
    })
    return deferred.promise;
};

checkrain(43.654,-79.423).then(function(value){
                                    console.log("woo",value);
                                });

console.log("between");

checkrain(0,0).then(function(value){
    console.log("woo",value);
});


var getForecast = function (response, lat, lng) {
    var forecastbase = "https://api.forecast.io/forecast/";
    var key = "91ac025a6fe778dbe3a41cf7748b55d1";
    // Windsorish 41.919012,-83.387947
    // var opts = "/43.654,-79.423,1370495580?units=ca";
    // var opts = "/43.654,-79.423?units=ca";
    // var opts = "/41.919012,-83.387947,1372708360?units=ca";
    var opts = "/" + lat + "," + lng + ",1372708360?units=ca";

    var requrl = forecastbase + key + opts;

    console.log("requrl",requrl);

    request(requrl, function (error, responseRR, body) {
      if (!error && responseRR.statusCode == 200) {
        var details = JSON.parse(body);
        console.log("currently.precipIntensity", details.currently.precipIntensity);
        var raining = false;
        if (details.currently.precipIntensity > 0) {
            raining = true;
        }
        response.json({
                        latitude: details.latitude,
                        longitude: details.longitude,
                        raining: raining
                      });
      }
    })
};

var port = process.env.PORT || 5000;

app.listen(port, function() {
    console.log("Listening on " + port);
});

