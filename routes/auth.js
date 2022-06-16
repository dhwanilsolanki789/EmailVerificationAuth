import express from "express";
import authControl from "../controllers/authcontroller.js"
const router = express.Router();

router.get('/register', (req,res) => {
    res.render('register.ejs');
})

router.get('/login', (req,res) => {
    res.render('login.ejs');
})

router.get('/activate/:token', authControl.activateHandle);

router.get('/forgot', (req,res) => {
    res.render('forgot.ejs')
})

router.get('/forgot/:token', authControl.gotoReset);

router.get('/reset/:id', (req,res) => {
    const { id } = req.params;
    res.render('reset.ejs',{ id });
})

router.post('/register', authControl.registerLogic);

router.post('/forgot', authControl.forgotPassword);

router.post('/reset/:id', authControl.resetPassword)

router.post('/login', authControl.loginHandle);

router.post('/logout', authControl.logoutHandle);

export default router;