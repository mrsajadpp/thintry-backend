const { ObjectId } = require('mongodb');
const bcrypt = require("bcrypt");
const express = require("express");
var cookieSession = require('cookie-session');
let bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const cors = require('cors');
const axios = require('axios');
const userData = require('./database/user')
const app = express();
const port = process.env.PORT || 3001;

app.use(cookieSession({
    name: 'session',
    keys: ["@thtycbskt@#]$"],
    maxAge: 24 * 60 * 60 * 1000
}));
app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/api/auth/check', (req, res, next) => {
    try {
        const isLogged = req.session.logged ? true : false;
        res.json({ isLogged });
    } catch (error) {
        console.error('Error in /api/auth/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while checking authentication status' });
    }
});

app.get('/api/username/check', async (req, res, next) => {
    try {
        const usernameExist = await userData.checkUsername(req.query.username);
        res.json({ usernameExist });
    } catch (error) {
        console.error('Error in /api/username/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while checking username availability' });
    }
});

app.get('/api/auth/signup', async (req, res, next) => {
    try {
        const ipAddress = req.header('x-forwarded-for') || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.connection.remoteAddress || requestIP.getClientIp(req);

        const ipInfoResponse = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
        const locationData = ipInfoResponse.data;

        const user = await userData.createUser(req.query, locationData);

        res.json({ status: true, user });
    } catch (error) {
        console.error('Error in /api/auth/signup:', error);
        res.status(500).json({ status: false, message: 'An error occurred while signing up' });
    }
});

app.get('/api/auth/login', async (req, res, next) => {
    try {
        let response = await userData.login(req.query);
        if (response.status) {
            response.user.password = null;
            res.json({ status: true, user: response.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: false, message: 'An error occurred while signing up' });
    }
});

app.get('/api/auth/verify/check', async (req, res, next) => {
    try {
        console.log(req.query)
        let response = await userData.verifyUser(req.query);

        if (response.status) {
            response.user.password = null;
            res.json({ status: true, user: response.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error('Error in /api/auth/verify/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while verifying the user' });
    }
});

app.get('/api/fetch/user', async (req, res, next) => {
    try {
        let response = await userData.fetchUser(req.query);

        if (response.status) {
            response.user.password = null;
            res.json({ status: true, user: response.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching the user' });
    }
});

app.get('/api/fetch/user/posts', async (req, res, next) => {
    try {
        console.log(req.query)
        let response = await userData.fetchPosts(req.query);

        if (response.status) {
            res.json({ status: true, posts: response.posts });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching the user' });
    }
})

app.listen(port, () => {
    console.log("Server started : " + port)
});