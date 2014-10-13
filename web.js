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

var client = new twilio.RestClient(twilioconfig.accountid, twilioconfig.authtoken);

api.start();

/* =================================================================================================== */

var sendSms = function (dest, message, timeformatted) {
  var bodymsg = message+' ['+timeformatted+']';
  client.sms.messages.create({
      to: dest,
      from: twilioconfig.number,
      body: bodymsg
  }, function(error, message) {
      if (!error) {
          console.log('SMS Message:', bodymsg);
          console.log('SMS Message sent:', message.dateCreated, 'to:', dest);
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
    weather.checkRain(twitUser.lat,twitUser.lng,1).then(function(value) {
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
          weather.checkRain(user.lat,user.lng,i).then(function(value){
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
  }); // end getUsers()
};

setTimeout(checkAndSend, 3000);
var timeoutId = setInterval(checkAndSend, 3*60*1000);

