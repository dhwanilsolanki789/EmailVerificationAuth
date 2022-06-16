import nodemailer from "nodemailer";
import  passport  from "passport";
import LocalStrategy from "passport-local";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.js";

const JWT_KEY = "jwtauthdemo";

passport.use(new LocalStrategy({ usernameField: 'username' }, (username, password, done) => {
    // Match user
    User.findOne({ username }).then(user => {
        if (!user) {
            return done(null, false, { message: 'You are not registered!' });
        }

        // Match password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Password incorrect! Please try again.' });
            }
        });
    });
}));

const registerLogic = function(req,res) {
    const { username, email, password, password2 } = req.body;
    if(password !== password2){
        req.flash('error',"Passwords dont match");
        return res.redirect("/register");
    }
    User.findOne({email:email}).then(user => {
        if(user) {
            req.flash('error',"Email id is already registered");
            return res.redirect("/register");
        } else {
            const token = jwt.sign({username,email,password}, JWT_KEY, {expiresIn: "30m"});
            const CLIENT_URL ="http://" + req.headers.host;

            const output = `
            <h2>Please click on below link to activate your account</h2>
            <p>${CLIENT_URL}/activate/${token}</p>
            <p><b>NOTE:</b> Above link expires in 30 minutes </p>
            `;

            const transporter = nodemailer.createTransport({
                service:"gmail",
                auth: {
                    user: "dummymailauth@gmail.com",
                    pass: "Authmailsend2022"
                }
            });

            const mailOptions = {
                from: '"Auth Admin" <nodejsauth@gmail.com>',
                to: email,
                subject: "Account Verification: NodeJS Auth ✔", 
                html: output, 
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);
                    req.flash('error',"Email couldn't be sent");
                    return res.redirect("/register");
                }
                else {
                    console.log('Mail sent : %s', info.response);
                    req.flash('success',"Activation mail sent");
                    res.redirect("/login");
                }
            })
        }
    })
}

const activateHandle = function(req,res) {
    const { token } = req.params;
    if(token) {
        jwt.verify(token, JWT_KEY, (err, decodedToken) => {
            if(err){
                req.flash('error',"Expired link, try again!");
                return res.redirect("/register");
            } else {
                const { username, email, password } = decodedToken;
                User.findOne({email:email}).then(user => {
                    if(user) { 
                        req.flash('error',"Email already in use");
                        return res.redirect("/login");
                    } else {
                        const newUser = new User({ username, email, password});
                        bcrypt.hash(newUser.password, 10, function(err, hash) {
                            if(err){
                                res.send(err);
                            } else {
                                newUser.password = hash;
                                newUser.verified = true;
                                newUser.save().then(user => {
                                    req.flash('success',"Account activated");
                                    res.redirect("/login");
                                }).catch(e => res.send(err));
                            }
                        });
                    }
                })
            }
        })
    } else {
        res.send("Activation failed");
    }
};

const forgotPassword = (req,res) => {
    const { email } = req.body;
    User.findOne({email}).then(theUser => {
        if(!theUser){
            req.flash('error',"User with email id doesn't exist");
            return res.redirect("/forgot");
        } else {
            const token = jwt.sign({_id: theUser._id}, JWT_KEY, {expiresIn:"30m"});
            const CLIENT_URL = 'http://' + req.headers.host;
            const output = `
            <h2>Please click on the below link to reset your account password</h2>
            <p>${CLIENT_URL}/forgot/${token}</p>
            <p><b>NOTE:</b> The reset link expires in 30 minutes.</p>
            `;

            theUser.resetLink = token;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: "dummymailauth@gmail.com",
                    pass: "Authmailsend2022"
                }
            });

            const mailOptions = {
                from: '"Auth Admin" <dummymailauth@gmail.com>',
                to: email,
                subject: "Account Password Reset: NodeJS Auth ✔",
                html: output
            };

            transporter.sendMail(mailOptions, (err,info) => {
                if(err){
                    req.flash('error',"Error sending reset mail");
                    return res.redirect("/forgot");
                } else {
                    console.log("Mail sent: %s", info.response);
                    req.flash('success',"Reset password mail sent!");
                    res.redirect("/login");
                }
            })
        }
    })
}

const gotoReset = function(req,res) {
    const { token } = req.params;
    if(token) {
        jwt.verify(token, JWT_KEY, (err,decodedToken) => {
            if(err) {
                req.flash('error',"Expired link, try again!");
                return res.redirect("/forgot");
            } else {
                const { _id } = decodedToken;
                User.findById(_id, (err,theUser) => {
                    if(err){
                        req.flash('error',"User id with email doesnt exist");
                        return res.redirect("/forgot");
                    } else {
                        res.redirect(`/reset/${_id}`);
                    }
                })
            }
        })
    } else {
        res.send("Reset password failed");
    }

}

const resetPassword = function(req,res) {
    const { id } = req.params;
    var { password, password2 } = req.body;

    if(password !== password2){
        req.flash('error',"Passwords dont match");
        return res.redirect(`/reset/${id}`);
    }

    if(password) {
        bcrypt.hash(password, 10, (err,hash) => {
            if(err){
                res.send(err);
            } else {
                password = hash;
                User.findByIdAndUpdate({_id: id}, { password }, (err,resp) => {
                    if(err){
                        req.flash('error',"Error updating password!");
                        return res.redirect("/forgot");
                    } else {
                        req.flash('success',"Password reset successfully");
                        res.redirect("/login");                    }
                })
            }
        })
    } else {
        res.send("You must enter the password first");
    }

}

const loginHandle = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true
    })(req, res, next);
}

const logoutHandle = (req,res) => {
    req.logout(err => {
        if(err){
            req.flash('error',"Something went wrong!");
            return res.redirect("/dashboard");
        }
        req.flash('success',"Successfully logged you out");
        res.redirect("/login");
    });
}

export default { registerLogic, activateHandle, forgotPassword, gotoReset, resetPassword, loginHandle, logoutHandle };