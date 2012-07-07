
var users = {};

var maxUserID = 1000;

exports.loadUsers = function(dbClient) {
	dbClient.query('select * from Users', function(err, results, fields) {
		if (err) {
			console.log(err);
		} else {
			results.forEach(function(user) {
				users[user.userID] = user;
				if (user.userID > maxUserID)
					maxUserID = user.userID;
			});
		}
	});
}

exports.newUser = function(dbClient, userID, nikeUID, nikeOAuthToken, nikeAccessToken) {
	if (userID < 0) {
		userID = maxUserID;
		maxUserID += 1;
	}
	var user = {userID: userID};
	dbClient.query('replace into Users values (?,?,?,?);', [user.userID, nikeUID, nikeOAuthToken, nikeAccessToken]);
	users[userID] = user;
	return user;
}

