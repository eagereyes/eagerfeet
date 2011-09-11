
/*
 * node-runkeeper - Node.js Client for Runkeeper Health Graph API
 *
 * runkeeper.js:  Defines the HealthGraph class
 *
 * author: Mark Soper (masoper@gmail.com)
 */


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
