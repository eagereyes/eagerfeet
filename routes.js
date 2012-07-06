
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'eagerfeet 2', login: false, user: req.session.user || 'nobody' })
};

exports.index_login = function(req, res){
  res.render('index', { title: 'eagerfeet 2', login: true, user: req.session.user || 'nobody' })
};