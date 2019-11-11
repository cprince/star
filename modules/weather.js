var q = require("q");
var request = require("request");

var willRain = function (candidate, level) {
    if (typeof level === "undefined") level = 1;
    switch ( level ) {
        case 1:
            var willrain = false;
            var minutelyData = candidate.minutely.data;
            for ( var i = 0; i < 25; i++ ) {
                var intensity = minutelyData[i].precipIntensity - minutelyData[i].precipIntensityError;
                var probability = minutelyData[i].precipProbability;
                if ( (intensity > 0.6) && (probability > 0.5) ) {
                    console.log("yes!");
                    willrain = true;
                    break;
                }
            }
            return willrain;
            break;
        case 2:
            if (candidate.currently.precipIntensity > 0.05 && candidate.currently.precipProbability > 0.3 ) {
                return true;
            }
            break;
    }
    return false;
};

var oneRequest = function (lat, lng) {
    var deferred = q.defer();
    var forecastbase = "https://api.forecast.io/forecast/";
    var key = "91ac025a6fe778dbe3a41cf7748b55d1";
    var opts = "/" + lat + "," + lng + "?units=ca";
    var requrl = forecastbase + key + opts;
    console.log(requrl);
    request(requrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var details = JSON.parse(body);
        deferred.resolve(details);
      } else {
        var code = "[Empty]";
        if (typeof response !== "undefined") code = response.statusCode;
        deferred.reject( { statusMessage: "oops something didn't work", statusCode: code } );
      }
    })
    return deferred.promise;
};

var addUpAccumulation = function (details) {
    var ret = 0;
	var precipValue = details.hourly.data[0].precipAccumulation;
	if (typeof precipValue !== "undefined") {
	    var value = parseFloat(precipValue);
	    ret += value;
    }
    ret = ret.toFixed(1);
    return ret;
};

var checkRain = function (lat, lng) {
    var deferred = q.defer();
    oneRequest(lat,lng).then(function(details){
        var willrain = false;
	var precipAccumulation = 0;
        if (willRain(details,1)) {
            willrain = true;
            precipAccumulation = addUpAccumulation(details);
        }
        deferred.resolve({
                        precipIntensity: details.currently.precipIntensity,
                        precipProbability: details.currently.precipProbability,
                        willrain: willrain,
			precipAccumulation: precipAccumulation,
                        summary: details.currently.summary,
                        longSummary: details.minutely.summary,
                        latitude: details.latitude,
                        longitude: details.longitude,
                        timezone: details.timezone,
                        time: details.currently.time,
                        minutely: details.minutely,
                        hourly: details.hourly,
                      });
        // addWeather(details);
    });
    return deferred.promise;
};

exports.willRain = willRain;
exports.oneRequest = oneRequest;
exports.checkRain = checkRain;

