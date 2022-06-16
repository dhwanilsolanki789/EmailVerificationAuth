import express from "express";
import mongoose from "mongoose";
import ejsMate from "ejs-mate";
import session  from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import flash from "connect-flash";
import path from "path";
import authRoutes from "./routes/auth.js";
import User from "./models/user.js";
import midware from "./config/middleware.js";

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

mongoose
    .connect("mongodb://localhost:27017/authMail")
    .then(() => {
        console.log("Mongo Connection open:");
    })
    .catch((err) => {
        console.log("Lmao mongo noob!!");
        console.log(err);
    });

const app = express();
app.engine('ejs',ejsMate);
app.set("views",path.join(__dirname,"/views"));
app.set("view engine","ejs");
app.use("/assets", express.static('./assets'));
app.use(cookieParser());
app.use(express.urlencoded({extended:true}));

const sessionConfigs = {
    secret: "auth",
    resave: false,
    saveUninitialized: true
}
app.use(session(sessionConfigs));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

app.use(flash());

app.use((req,res,next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.use('/',authRoutes);

app.get('/', (req,res) => {
    res.render('home.ejs');
})

app.get("/dashboard", midware.isLoggedIn ,(req,res) => {
    res.render('welcome.ejs', { name:req.user.username });
})


app.listen(3000,() => {
    console.log("Listeining on port 3000:");
})