const passport = require('passport'); 
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('./../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out! 👏');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // 1. See if a user with that email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash('info', `An email was sent to ${req.body.email}.`);
    return res.redirect('/login');
  }
  // 2. Set reset token and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();
  // 3. Send them the email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    filename: 'password-reset',
    subject: 'Password Reset',
    resetURL
  });
  req.flash('info', `An email was sent to ${req.body.email}. link: <a href=${resetURL}>Go to reset...</a>`);
  // 4. redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // $gt -> great than
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired.');
    return res.redirect('/login');
  }
  // If there is a user, show the password reset form
  res.render('reset', { title: 'Reset Your Password'});
};

exports.passwordConfirm = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) return next();
  req.flash('error', 'Passwords are not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() } // $gt -> great than
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired.');
    return res.redirect('/login');
  }
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', '💃 Nice! Your password has been reset! You are now logged in!');
  res.redirect('/');
};
