var express = require("express");
var request = require("request");
var q = require("q");
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var app = express();
app.use(express.bodyParser());
app.use(express.logger());
var email   = require("emailjs/email");
var mailserver  = email.server.connect();


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

var addWeather = function(weather) {
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('weathers');
        collection.insert(weather, function(err, docs) {
            console.log(docs);
            // Let's close the db
            db.close();
        });
    });
};

var getWeather = function(response) {
    var deferred = q.defer();
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('weathers');
        collection.find().toArray(function(err, docs) {
            deferred.resolve(docs);
            // Let's close the db
            db.close();
        });
    });
    return deferred.promise;
};

var checkAndSend = function () {
    getUsers().then(function(users){
        for(var i=0;i<users.length; i++){
            var user = users[i];
            checkRain(user.lat,user.lng).then(function(value){
            var rainstate = '----';
            if (value.willrain) rainstate = '[WILLRAIN]';
            var subject = '[wpush] ' + rainstate + ' ' + value.summary;
            var body = JSON.stringify(value);
            console.log(body);
            mailserver.send({
               text:    body,
               from:    "Wpush Service <col@colinprince.com>",
               to:      user.email,
               subject: subject
            }, function(err, message) { console.log(err || message); });
        });
        }
    });
};

var timeoutId = setInterval(checkAndSend, 10*60*1000);

/* ==================================================================== */

var willRain = function (candidate, level) {
    if (typeof level === "undefined") level = 1;
    switch ( level ) {
        case 1:
            var willrain = false;
            var minutelyData = candidate.minutely.data;
            for ( var i = 0; i < 20; i++ ) {
                console.log(minutelyData[i].precipProbability);
                if ( minutelyData[i].precipProbability > 0.1 ) {
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
    // Windsorish 41.919012,-83.387947
    //  var opts = "/43.654,-79.423,1370495580?units=ca";
    var opts = "/" + lat + "," + lng + "?units=ca";
    var requrl = forecastbase + key + opts;
    console.log(requrl);
    request(requrl, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var details = JSON.parse(body);
        deferred.resolve(details);
      } else {
        deferred.reject( { statusMessage: "oops something didn't work", statusCode: response.statusCode } );
      }
    })
    return deferred.promise;
};

var checkRain = function (lat, lng) {
    var deferred = q.defer();
    oneRequest(lat,lng).then(function(details){
        var willrain = false;
        if (willRain(details)) {
            willrain = true;
        }
        deferred.resolve({
                        precipIntensity: details.currently.precipIntensity,
                        precipProbability: details.currently.precipProbability,
                        willrain: willrain,
                        summary: details.currently.summary,
                        latitude: details.latitude,
                        longitude: details.longitude
                      });
        addWeather(details);
    });
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

app.get('/weathers', function( req, response) {
    getWeather().then(function(value){
        response.json(value);
    });
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

