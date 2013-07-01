var express = require("express");
var request = require("request");
var app = express();
app.use(express.logger());

app.get('/', function(req, res) {
  res.send('Hello World!');
  res.send(getForecast());
});

var getForecast = function () {
	var forecastbase = "https://api.forecast.io/forecast/";
	var key = "91ac025a6fe778dbe3a41cf7748b55d1";
	// var opts = "/43.654,-79.423,1370495580?units=ca";
	var opts = "/43.654,-79.423?units=ca";

	var requrl = forecastbase + key + opts;

    console.log("requrl",requrl);

	return request(requrl, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	  	var details = JSON.parse(body);
	    console.log(details.longitude);
	  }
	})
};

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

