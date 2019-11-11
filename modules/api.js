var express = require("express");
var request = require("request");
var q = require("q");
var app = express();
app.use(express.bodyParser());
app.use(express.logger());
var moment = require("moment-timezone");
var sqlite3 = require('sqlite3').verbose();

var weather = require("./weather");

var updateUserLastNotification = function(useremail, time) {
    var sql = `UPDATE users SET lastNotification=${time} WHERE email=='${useremail}'`;
    var db = new sqlite3.Database('./star.db', sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            console.error(err.message);
            throw err;
        }
        db.run(sql, [], function(err){
            if (err) {
                console.error(err.message);
                throw err;
            }
        });
    });
}

var getUsers = function() {
    var deferred = q.defer();
    var sql = "SELECT * FROM users WHERE enabled==1 ORDER BY id";

    var db = new sqlite3.Database('./star.db', sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(err.message);
            throw err;
        }
        db.all(sql, [], (err, rows) => {
            if (err) {
                throw err;
            }
            deferred.resolve(rows);
        });
    });
    return deferred.promise;
};

/* =================================================================================================== */

app.get('/', function(req, response) {
    response.sendfile('htdocs/index.html');
});

app.get('/sms/reply', function(req, response) {
    response.sendfile('htdocs/smsreply.xml');
});

app.get('/rain/:lat,:lng', function(req, response) {
    var lat = req.param('lat'),
        lng = req.param('lng');
    weather.checkRain(lat,lng).then(function(value){
        response.json(value);
    });
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

app.get('/current', function(req, response) {
    response.sendfile('htdocs/current.html');
});

app.get('/stats', function(req, response) {
    response.sendfile('htdocs/stats.html');
});

var port = process.env.PORT || 5000;

function start() {
  app.listen(port, function() {
      console.log("API listening on port " + port);
  });
}

exports.start = start;
exports.getUsers = getUsers;
exports.updateUserLastNotification = updateUserLastNotification;
