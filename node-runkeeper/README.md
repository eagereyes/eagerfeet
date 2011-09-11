

node-runkeeper - Node.js Client for Runkeeper Health Graph API
==============================================================
<br>

## Author: [Mark Soper](masoper@gmail.com)

A client/wrapper for the Runkeeper Health Graph API:
http://developer.runkeeper.com/healthgraph

## Installation

- node-runkeeper isn't on NPM yet, so for now the best way is cloning the respository from Github and making it available to your code

```bash
$ git clone git@github.com:/marksoper/node-runkeeper support/runkeeper/
```
```javascript
// in your code
require.paths.unshift('support/runkeeper/lib');
```

## Creating a client

Register your application with Runkeeper to get the credentials needed below:
http://runkeeper.com/partner/applications


```javascript

var options = exports.options = {

    // Client ID: 
    // This value is the OAuth 2.0 client ID for your application.  
    client_id : "< client id >",

    // Client Secret:  
    // This value is the OAuth 2.0 shared secret for your application.   
    client_secret : "< client secret >",
    
    // Authorization URL:   
    // This is the URL to which your application should redirect the user in order to authorize access to his or her RunKeeper account.   
    auth_url : "https://runkeeper.com/apps/authorize",

    // Access Token URL:    
    // This is the URL at which your application can convert an authorization code to an access token. 
    access_token_url : "https://runkeeper.com/apps/token",

    // Redirect URI:   
    // This is the URL that RK sends user to after successful auth  
    // URI naming based on Runkeeper convention 
    redirect_uri : "< redirect uri >"

};

var runkeeper = require('support/runkeeper/lib/runkeeper');

var client = new runkeeper.HealthGraph(options);

```

## Using the client

Get user profile information

```javascript
client.profile( function(data) {
  // data returned in JSON with format depending on type of call
  var obj = JSON.parse(data);
});
```


## Extending the client

Only a few of basic API calls are currently supported.  Adding support for new calls should be easy - just add entries into this dictionary in api.js

```javascript
// this is from api.js
//
var API = exports.API = {
    "user": {"media_type": "application/vnd.com.runkeeper.User+json",
             "uri": "/user"},
    "profile": {"media_type": "application/vnd.com.runkeeper.Profile+json",
                "uri": "/profile"},
    "settings": {"media_type": "application/vnd.com.runkeeper.Settings+json",
                "uri": "/settings"},
    "fitnessActivityFeed": {"media_type": "application/vnd.com.runkeeper.FitnessActivityFeed+json",
                "uri": "/fitnessActivities"},
    "fitnessActivities": {"media_type": "application/vnd.com.runkeeper.FitnessActivity+json",
                "uri": "/fitnessActivities"},
};
```






