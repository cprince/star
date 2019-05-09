var q = require("q");
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

var twilioconfig = require('./config/twilioconfig.js');
var weather = require("./modules/weather.js");
var api = require("./modules/api.js");

var client = new twilio(twilioconfig.accountid, twilioconfig.authtoken);

var checkInterval = 3*60*1000;

api.start();

/* =================================================================================================== */

var sendSms = function (dest, message, precipAccumulation, usermsg) {
  var timeformatted = new Date().toLocaleTimeString();
  var accumMessage = (precipAccumulation>0.0) ? ' 60 minute accum '+precipAccumulation+'cm ' : ' ';
  var bodymsg = message+accumMessage+timeformatted;
  client.messages.create({
      to: dest,
      from: twilioconfig.number,
      body: bodymsg
  }, function(error, message) {
      if (!error) {
          console.log('SMS Message:', bodymsg);
          console.log('SMS Message sent:', message.dateCreated, 'to:', dest, usermsg);
      } else {
          console.log('Oops! There was an error.');
      }
  });
};

var Twit = require('twit')
var T = new Twit({
        consumer_key:         'FjGvJFP1vIB3TBzDMlbTDvm8Q'
      , consumer_secret:      'mx7Tx9zVcigmpbgM6p5kxDH8xgoymPFLwgYhMlxySoDGQr9wVf'
      , access_token:         '2764572067-Kvkupk8rrLAJd4vZMNwu5HI71aWam4o85DyOF1a'
      , access_token_secret:  'Fomsauz1VZJQu3qNdz505h11P1ANDbAneFSJAGBwp1gg8'
})

var sendTweet = function (message, precipAccumulation) {
  var timeformatted = new Date().toLocaleTimeString();
  var accumMessage = (precipAccumulation>0.0) ? ' 60 minute accum '+precipAccumulation+'cm ' : ' ';
  var bodymsg = message+accumMessage+timeformatted;
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
    weather.checkRain(twitUser.lat,twitUser.lng).then(function(value) {
      if ( value.willrain ) {
        sendTweet(value.longSummary, value.precipAccumulation);
        twitUser.lastNotification = value.time;
      }
    });
  }

  api.getUsers().then(function(users){
    var numUsers = users.length;
    var variance = Math.floor ( checkInterval / numUsers+1 );
    var offset = [0]; // initialize first time offset at zero
    for ( var j = 0; j < numUsers; j++ ) {
      offset[j+1] = offset[j] + variance;
    }

    var i=0;
    for ( i=0; i<numUsers; i++ ) {
      if ( !users[i].enabled ) continue;
      (function(i) {
        setTimeout(function() {
          var user = users[i];

          var now = moment();
console.log("check user",user.name,now.format());
          var isWhiteTime = false;
          var lowerLimit = moment().hour(user.beginhour).minute(user.beginminute).second(0);
          var upperLimit = moment().hour(user.endhour).minute(user.endminute).second(0);
          if ( now.isBefore(upperLimit) && now.isAfter(lowerLimit) ) {
            isWhiteTime = true;
          }

          if ( isWhiteTime ) {
            if ( epochTime - user.lastNotification > 2*60*60 ) { // notify if over 2 hours
              weather.checkRain(user.lat,user.lng).then(function(value){
                if ( value.willrain ) {
                  if ( user.sms ) {
                    sendSms(user.smsnumber, value.longSummary, value.precipAccumulation, user.name);
                    api.updateUserLastNotification(user.email,value.time);
                  }
                  if ( 1==0 ) { // disable for now
                    sendEmail(user);
                  }
                }
              }); // end checkRain call
            } // end if over 4 hours
          } // end is white time
        }, offset[i]);
      })(i); // immediately-invoked function expression
    } // end for loop
  }); // end getUsers()
};

setTimeout(checkAndSend, 3000);
var timeoutId = setInterval(checkAndSend, checkInterval);

