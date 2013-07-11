var express = require("express");
var request = require("request");
var q = require("q");
var app = express();
app.use(express.logger());
var exec = require('child_process').exec,
    child;

var checkAndSend = function () {
    checkRain(43.654,-79.423).then(function(value){
        var rainstate = '--';
        if (value.raining) rainstate = 'RAINING';
        var subject = '"[wpush] ' + rainstate + ' ' + value.summary + '"';
        var body = JSON.stringify(value);
        console.log(body);
        child = exec('echo ' + body + ' | mail -s ' + subject + ' -aFrom:col@colinprince.com col@colinprince.com',
          function (error, stdout, stderr) {
            console.log('mail stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
        });
    });
}

var timeoutId = setInterval(checkAndSend, 10*60*1000);

/* ==================================================================== */

var checkRain = function (lat, lng) {
    var deferred = q.defer();
    var forecastbase = "https://api.forecast.io/forecast/";
    var key = "91ac025a6fe778dbe3a41cf7748b55d1";
    // Windsorish 41.919012,-83.387947
    //  var opts = "/43.654,-79.423,1370495580?units=ca";
    var opts = "/" + lat + "," + lng + "?units=ca";
    var requrl = forecastbase + key + opts;
    console.log(requrl);
    request(requrl, function (error, responseRR, body) {
      if (!error && responseRR.statusCode == 200) {
        var details = JSON.parse(body);
        var raining = false;
        if (details.currently.precipIntensity > 0) {
            raining = true;
        }
        deferred.resolve({
                        precipIntensity: details.currently.precipIntensity,
                        precipProbability: details.currently.precipProbability,
                        raining: raining,
                        summary: details.currently.summary,
                        latitude: details.latitude,
                        longitude: details.longitude
                      });
      } else {
        deferred.reject("oops something didn't work");
      }
    })
    return deferred.promise;
};

/* ==================================================================== */

app.get('/rain/:lat,:lng', function(req, response) {
    var lat = req.param('lat'),
        lng = req.param('lng');
    checkRain(lat,lng).then(function(value){
        response.json(value);
    });
});

app.get('/', function(req, response) {
    response.send('<h1>Welcome to the rain predictor</h1><p>example:</p><p><a href="/rain/44,-78">/rain/:lat,:lng</a></p>');
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
    console.log("Listening on " + port);
});

