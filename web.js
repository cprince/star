var express = require("express");
var request = require("request");
var app = express();
app.use(express.logger());


var exec = require('child_process').exec,
    child;


var checkAndSend = function () {
    console.log("in sendMail");
    child = exec('echo "This will" | mail -s "Hello nodejs" col@colinprince.com',
      function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
          console.log('exec error: ' + error);
        }
    });
}

var timeoutId = setInterval(checkAndSend, 10*60*1000);

app.get('/rain/:lat,:lng', function(req, response) {
    console.log('lat',req.param('lat'));
    console.log('lng',req.param('lng'));
    // response.send(getForecast(response));
    getForecast(response, lat, lng);
});

app.get('/', function(req, response) {
    response.send('<p>Welcome to the rain predictor</p><p>example:</p><p><a href="/rain/47,-23">/rain/:lat,:lng</a></p>');
});

var getForecast = function (response) {
    var forecastbase = "https://api.forecast.io/forecast/";
    var key = "91ac025a6fe778dbe3a41cf7748b55d1";
    // Windsorish 41.919012,-83.387947
    // var opts = "/43.654,-79.423,1370495580?units=ca";
    // var opts = "/43.654,-79.423?units=ca";
    var opts = "/41.919012,-83.387947,1372708360?units=ca";

    var requrl = forecastbase + key + opts;

    console.log("requrl",requrl);

    request(requrl, function (error, responseRR, body) {
      if (!error && responseRR.statusCode == 200) {
        var details = JSON.parse(body);
        console.log("in f request", details.latitude);
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

