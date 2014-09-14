var express = require("express");
var request = require("request");
var q = require("q");
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var app = express();
app.use(express.bodyParser());
app.use(express.logger());
var moment = require("moment-timezone");

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

var addUser = function(json) {
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
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('users');
        collection.find({name: username}).toArray(function(err, items) {
            deferred.resolve(items);
            db.close();
        });
    });
    return deferred.promise;
};

var getUsers = function() {
    var deferred = q.defer();
    mongoClient.connect('mongodb://127.0.0.1:27017/star',function(err, db){
        if(err) throw err;

        var collection = db.collection('users');
        collection.find().toArray(function(err, items) {
            deferred.resolve(items);
            db.close();
        });
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

    // disable addUser until autheticated
    // addUser(newUser);
});

var port = process.env.PORT || 5000;

function start() {
  app.listen(port, function() {
      console.log("Whee Listening on " + port);
  });
}

exports.start = start;
exports.getUsers = getUsers;
exports.updateUserLastNotification = updateUserLastNotification;
exports.addNotification = addNotification;
