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

var updateUserLastNotification = function(useremail, time) {
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;
        var collection = db.collection('users');
        collection.update({"email":useremail},{$set:{"lastNotification":time}},{"safe":1}, function(err, docs) {
            console.log(docs);
        });
        db.close();
    });
};

var updateNotification = function(uuidstring,verdict) {
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;
        var collection = db.collection('notifications');
        collection.update({"uuidstring":uuidstring},{$set:{"verdict":verdict}},{"safe":1}, function(err, docs) {
            console.log(docs);
        });
        db.close();
    });
};

var addNotification = function(json) {
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;
        var collection = db.collection('notifications');
        collection.insert(json, function(err, docs) {
            console.log(docs);
        });
        db.close();
    });
};

var getNotificationStats = function() {
    var deferred = q.defer();
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;
        var collection = db.collection('notifications');
        //collection.aggregate( { $group: { _id: { year: { $year: "$date" } } } }, function(err, items) {
        //collection.aggregate( { $group: { _id: { month: { $month: "$date" }, dayOfMonth: { $dayOfMonth: "$date" }, year: { $year: "$date" } }, count: { $sum : 1 } } } , function(err, items) {
        collection.aggregate( [ { $match : { date : { $gte : new Date(2013, 1, 1) } } }, { $group: { _id: { month: { $month: "$date" }, dayOfMonth: { $dayOfMonth: "$date" }, year: { $year: "$date" } }, count: { $sum : 1 } } }, { $sort: { "_id.year":1,"_id.month":1,"_id.dayOfMonth":1 } } ] , function(err, items) {
            deferred.resolve(items);
            db.close();
        });
    });
    return deferred.promise;
};

var getNotifications = function(email) {
    var deferred = q.defer();
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;
        var collection = db.collection('notifications');
        collection.find({email: email},{"verdict":1}).toArray(function(err, items) {
            deferred.resolve(items);
            db.close();
        });
    });
    return deferred.promise;
};

var addUser = function(json) {
    // connect mongo db using mongo client
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('users');
        collection.insert(json, function(err, docs) {
            console.log(docs);
        });
        db.close();
    });
};

var getUser = function(username) {
    var deferred = q.defer();
    // connect mongo db using mongo client
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('users');
        collection.find({name: username}).toArray(function(err, items) {
            deferred.resolve(items);
            // Let's close the db
            db.close();
        });
    });
    return deferred.promise;
};

var getUsers = function() {
    var deferred = q.defer();
    // connect mongo db using mongo client
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('users');
        collection.find().toArray(function(err, items) {
            deferred.resolve(items);
            // Let's close the db
            db.close();
        });
    });
    return deferred.promise;
};

var sendSms = function (dest, message, timeformatted) {
  var bodymsg = 'Rain is coming. '+message+' '+timeformatted
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
}


var Twit = require('twit')
var T = new Twit({
        consumer_key:         'FjGvJFP1vIB3TBzDMlbTDvm8Q'
      , consumer_secret:      'mx7Tx9zVcigmpbgM6p5kxDH8xgoymPFLwgYhMlxySoDGQr9wVf'
      , access_token:         '2764572067-Kvkupk8rrLAJd4vZMNwu5HI71aWam4o85DyOF1a'
      , access_token_secret:  'Fomsauz1VZJQu3qNdz505h11P1ANDbAneFSJAGBwp1gg8'
})

var sendTweet = function (message,timeformatted) {
  var bodymsg = 'Rain in the park '+timeformatted+' '+message;
  T.post('statuses/update', { status: bodymsg }, function(err, data, response) {
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

console.log("twitter user",timeformatted);
    if ( epochTime - twitUser.lastNotification > 2*60*60 ) { // check if over 2 hours
      checkRain(twitUser.lat,twitUser.lng,1).then(function(value) {
        if ( value.willrain ) {
            sendTweet(value.longSummary,timeformatted);
            twitUser.lastNotification = value.time;
        }
      });
    }
    getUsers().then(function(users){
        var i=0;
        for(i=0;i<users.length; i++){
            var user = users[i];
            if ( !user.enabled ) continue;

            checkRain(user.lat,user.lng,i).then(function(value){
                var insideuser = users[value.iu];

                var isBlackout = true;
                var now = moment();
                var lowerLimit = moment().hour(insideuser.whitelist[0].begin.hour).minute(insideuser.whitelist[0].begin.minute).second(0);
                var upperLimit = moment().hour(insideuser.whitelist[0].end.hour).minute(insideuser.whitelist[0].end.minute).second(0);
console.log("check user",insideuser.name,now.format());
                if ( now.isBefore(upperLimit) && now.isAfter(lowerLimit) ) {
                  isBlackout = false;
                }

                var uuidstring = uuid.v4();
                var subject = '[wpush] Rain is on the way ' + timeformatted + ' ' + value.summary;
                var body = JSON.stringify(value);
                var shouldsend = false;
                if ( value.willrain ) {
                  if ( !isBlackout ) {
                    if ( insideuser.sms ) {
                      if ( epochTime - insideuser.lastNotification > 4*60*60 ) { // notify if over 4 hours
                        sendSms(insideuser.smsnumber, value.longSummary, timeformatted);
                        updateUserLastNotification(insideuser.email,value.time);
                      }
                    }
                  }
                  if ( 1==0 ) { // disable for now
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
                          addNotification( { "date": new Date(), "uuidstring": uuidstring, "message-id": message.header['message-id'], "email": insideuser.email, "context": body } );
                      });
                  } // end stop mailsend
                }
            });
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
                // console.log("intensity",intensity);
                // console.log("probability",probability);
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
        if (typeof response.statusCode !== "undefined") code = response.statusCode;
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

app.get('/rain/:lat,:lng', function(req, response) {
    var lat = req.param('lat'),
        lng = req.param('lng');
    checkRain(lat,lng).then(function(value){
        response.json(value);
    });
});

app.get('/', function(req, response) {

    response.sendfile('htdocs/index.html');
});

app.get('/users', function(req, response) {
    getUsers().then(function(value){
        response.json(value);
    });
});

app.get('/users/:username', function(req, response) {
    getUser(req.param('username')).then(function(value){
        response.json(value);
    });
});

app.get('/stats/json', function(req, response) {
    getNotificationStats().then(function(value) {;
        response.json(value);
    });
});

app.get('/stats', function(req, response) {
    response.sendfile('htdocs/stats.html');
});

app.get('/notification/history/:email', function(req, response) {
});

app.get('/notification/:uuidstring/confirm', function(req, response) {
    updateNotification( req.param('uuidstring'), 'confirm' );
    response.send( "Thank you for responding to notification with id: " + req.param( 'uuidstring' ) );
});

app.get('/notification/:uuidstring/reject', function(req, response) {
    updateNotification( req.param('uuidstring'), 'reject' );
    response.send( "Thank you for responding to notification with id: " + req.param( 'uuidstring' ) );
});

app.get('/notification/:notificationid', function(req, response) {
    response.send( "notification id: " + req.param( 'notificationid' ) );
});

app.post('/users', function(req, response){
    if(!req.body.hasOwnProperty('lat') || 
        !req.body.hasOwnProperty('lng') ||
        !req.body.hasOwnProperty('name') ||
        !req.body.hasOwnProperty('email')) {
        response.statusCode = 400;
        return response.send('Error 400: Post syntax incorrect.');
    }

    var newUser = {
        lat : req.body.lat,
        lng : req.body.lng,
        name : req.body.name,
        email : req.body.email
    };

    addUser(newUser);
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
    console.log("Listening on " + port);
});

