
var users = [];

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

