
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'eagerfeet 2', login: false, userID: req.session.userID || 'nobody' })
};

exports.index_login = function(req, res){
  res.render('index', { title: 'eagerfeet 2', login: true, userID: req.session.userID || 'nobody' })
};

exports.redirectLogin = function(req, res) {
  res.render('login-redirect', { title: 'Login successful', redirectURL: 'http://eagerfeet.org/index-login' })
}