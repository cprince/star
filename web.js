var express = require("express");
var request = require("request");
var q = require("q");
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var app = express();
app.use(express.bodyParser());
app.use(express.logger());
var email   = require("emailjs/email");
var mailserver  = email.server.connect({
    user:    "col@colinprince.com",
    password:"Tpnz47Uc9KS6ExqF9cIfJQ",
    host:    "smtp.mandrillapp.com",
    ssl:     true
});
var moment = require("moment-timezone");
var uuid = require('node-uuid');
var twilio = require('twilio');
var client = new twilio.RestClient('AC41caac4d1dbae887c881215f4b2e8c13', 'b702ec1d72212e8d9ab0a755e14100ca');

var api = require("./modules/api.js");

api.start();

/* =================================================================================================== */

var sendSms = function (dest, message, timeformatted) {
  var bodymsg = message+' ['+timeformatted+']';
  client.sms.messages.create({
      to: dest,
      from: '+12048134333',
      body: bodymsg
  }, function(error, message) {
      if (!error) {
          console.log('Success! The SID for this SMS message is:', message.sid);
          console.log('Message:', bodymsg);
          console.log('Message sent:', message.dateCreated, 'to:', dest);
      } else {
          console.log('Oops! There was an error.');
      }
  });
};

var sendEmail = function (insideuser, timeformatted) {
    var uuidstring = uuid.v4();
    var subject = '[wpush] Rain is on the way ' + timeformatted + ' ' + value.summary;
    var body = JSON.stringify(value);
    mailserver.send({
       text:    body,
       from:    "Wpush Service <col@colinprince.com>",
       to:      insideuser.email,
       subject: subject,
       attachment: [
            { data: '<html><h1>Wpush Service</h1><p>Rain is on the way soon. '+value.longSummary+'.</p><p><a href="http://wpush.colinprince.com/notification/'+uuidstring+'/confirm">[Accurate]</a> <a href="http://wpush.colinprince.com/notification/'+uuidstring+'/reject">[NOT accurate]</a></p><p>'+JSON.stringify(value)+'</p></html>', alternative: true }
      ]
    }, function(err, message) {
            console.log(err || message);
            api.addNotification( { "date": new Date(), "uuidstring": uuidstring, "message-id": message.header['message-id'], "email": insideuser.email, "context": body } );
        });
};

var Twit = require('twit')
var T = new Twit({
        consumer_key:         'FjGvJFP1vIB3TBzDMlbTDvm8Q'
      , consumer_secret:      'mx7Tx9zVcigmpbgM6p5kxDH8xgoymPFLwgYhMlxySoDGQr9wVf'
      , access_token:         '2764572067-Kvkupk8rrLAJd4vZMNwu5HI71aWam4o85DyOF1a'
      , access_token_secret:  'Fomsauz1VZJQu3qNdz505h11P1ANDbAneFSJAGBwp1gg8'
})

var sendTweet = function (message,timeformatted) {
  var bodymsg = message+' ['+timeformatted+']';
  T.post('statuses/update', { status: bodymsg, trim_user: true }, function(err, data, response) {
    if (err) console.log(err);
    if (data) console.log(data);
  })
}

/* =================================================================================================== */

/* ===== global var ? ===== */
var twitUser = {
  lastNotification: -1,
  lat: 43.656486,
  lng: -79.43237
};

/* =================================================================================================== */

var checkAndSend = function () {
    var epochTime = Math.floor(new Date().getTime()/1000);
    var timeformatted = new Date().toLocaleTimeString();

console.log("twitter user Dufferin Rain",timeformatted);
    if ( epochTime - twitUser.lastNotification > 2*60*60 ) { // check if over 2 hours
      checkRain(twitUser.lat,twitUser.lng,1).then(function(value) {
        if ( value.willrain ) {
            sendTweet(value.longSummary,timeformatted);
            twitUser.lastNotification = value.time;
        }
      });
    }

    api.getUsers().then(function(users){
        var i=0;
        for(i=0;i<users.length; i++){
            var user = users[i];
            if ( !user.enabled ) continue;

            var now = moment();
console.log("check user",user.name,now.format());
            var isWhiteTime = false;
            var lowerLimit = moment().hour(user.whitelist[0].begin.hour).minute(user.whitelist[0].begin.minute).second(0);
            var upperLimit = moment().hour(user.whitelist[0].end.hour).minute(user.whitelist[0].end.minute).second(0);
            if ( now.isBefore(upperLimit) && now.isAfter(lowerLimit) ) {
              isWhiteTime = true;
            }

            if ( isWhiteTime ) {
              if ( epochTime - user.lastNotification > 4*60*60 ) { // notify if over 4 hours
                checkRain(user.lat,user.lng,i).then(function(value){
                  var insideuser = users[value.iu];

                  if ( value.willrain ) {
                      if ( insideuser.sms ) {
                        sendSms(insideuser.smsnumber, value.longSummary, timeformatted);
                        api.updateUserLastNotification(insideuser.email,value.time);
                      }
                    if ( 1==0 ) { // disable for now
                      sendEmail(insideuser,timeformatted);
                    }
                  }
                }); // end checkRain call
              } // end if over 4 hours
            } // end is white time
        }
    });
};

setTimeout(checkAndSend, 3000);
var timeoutId = setInterval(checkAndSend, 3*60*1000);

/* =================================================================================================== */

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

var checkRain = function (lat, lng, iu) {
    var deferred = q.defer();
    oneRequest(lat,lng).then(function(details){
        var willrain = false;
        if (willRain(details,1)) {
            willrain = true;
        }
        deferred.resolve({
                        iu: iu,
                        precipIntensity: details.currently.precipIntensity,
                        precipProbability: details.currently.precipProbability,
                        willrain: willrain,
                        summary: details.currently.summary,
                        longSummary: details.minutely.summary,
                        latitude: details.latitude,
                        longitude: details.longitude,
                        timezone: details.timezone,
                        time: details.currently.time,
                        minutely: details.minutely
                      });
        // addWeather(details);
    });
    return deferred.promise;
};

/* =================================================================================================== */
