var express = require("express");
var request = require("request");
var app = express();
app.use(express.logger());

app.get('/rain/:lat,:long', function(req, response) {
    console.log('lat',req.param('lat'));
    console.log('long',req.param('long'));
    // response.send(getForecast(response));
    getForecast(response);
});

app.get('/', function(req, response) {
    response.send('<p>Welcome to the rain predictor</p><p>example:</p><p><a href="/rain/47,-23">/rain/:lat,:long</a></p>');
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

