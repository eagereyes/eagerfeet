
/*
 * GET home page.
 */

exports.index = function(req, res){
	if (req.session.userID != undefined) {
		res.render('redirect', { title: 'Redirecting ...', redirectURL: '/export'})
	} else {
		res.render('index', { title: 'eagerfeet'})
	}
};

exports.redirectLogin = function(req, res) {
	res.render('redirect', { title: 'Login successful!', redirectURL: 'http://eagerfeet.org/export'})
}