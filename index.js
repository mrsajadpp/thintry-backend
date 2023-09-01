const { ObjectId } = require('mongodb');
const bcrypt = require("bcrypt");
const express = require("express");
var cookieSession = require('cookie-session');
let bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const compression = require('compression');
const sanitizeHtml = require('sanitize-html');
const cors = require('cors');
const axios = require('axios');
const userData = require('./database/user')
const app = express();
const port = process.env.PORT || 3002;

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

app.get('/auth/check', (req, res, next) => {
    try {
        const isLogged = req.session.logged ? true : false;
        res.json({ isLogged });
    } catch (error) {
        console.error('Error in /auth/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while checking authentication status' });
    }
});

app.get('/username/check', async (req, res, next) => {
    try {
        const usernameExist = await userData.checkUsername(req.query.username);
        res.json({ usernameExist });
    } catch (error) {
        console.error('Error in /username/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while checking username availability' });
    }
});

app.get('/auth/signup', async (req, res, next) => {
    try {
        const ipAddress = req.header('x-forwarded-for') || req.headers['x-real-ip'] || req.headers['cf-connecting-ip'] || req.connection.remoteAddress || requestIP.getClientIp(req);

        const ipInfoResponse = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
        const locationData = ipInfoResponse.data;

        const user = await userData.createUser(req.query, locationData);

        res.json({ status: true, user });
    } catch (error) {
        console.error('Error in /auth/signup:', error);
        res.status(500).json({ status: false, message: 'An error occurred while signing up' });
    }
});

app.get('/auth/login', async (req, res, next) => {
    try {
        let response = await userData.login(req.query);
        if (response.status) {
            response.user.password = null;
            res.json({ status: true, user: response.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: 'An error occurred while signing up' });
    }
});

app.get('/auth/verify/check', async (req, res, next) => {
    try {
        let response = await userData.verifyUser(req.query);

        if (response.status) {
            response.user.password = null;
            res.json({ status: true, user: response.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error('Error in /auth/verify/check:', error);
        res.status(500).json({ status: false, message: 'An error occurred while verifying the user' });
    }
});

app.get('/fetch/user', async (req, res, next) => {
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

app.get('/fetch/user/posts', async (req, res, next) => {
    try {
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
});

app.get('/user/update', async (req, res, next) => {
    try {
        let updatedUser = await userData.updateUser(req.query);
        if (updatedUser.status) {
            res.json({ status: true, user: updatedUser.user });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while updating the user' });
    }
});

app.get('/fetch/user/tags', async (req, res, next) => {
    try {
        let tags = await userData.fetchTags(req.query);
        if (tags.status) {
            res.json({ status: true, tags: tags.tag });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching the user tags' });
    }
});

app.get('/tag/new', async (req, res, next) => {
    try {
        const sanitizedContent = await sanitizeHtml(req.query.content, {
            allowedTags: [], // Remove all HTML tags
            allowedAttributes: {} // No attributes allowed
        });
        req.query.content = await sanitizedContent;
        let tags = await userData.newTag(req.query);
        if (tags.status) {
            res.json({ status: true, tag: tags.tag });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while new tag' });
    }
});

app.post('/fetch/user/tags/all', async (req, res, next) => {
    try {
        console.log('hi')
        let response = await userData.findAllTags();
        if (response.status) {
            res.json({ status: true, tags: response.tags });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while new tag' });
    }
});

app.get('/tag/delete', async (req, res, next) => {
    try {
        console.log(req.query)
        let response = await userData.delTag(req.query);
        if (response.status) {
            res.json({ status: true });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.post('/tag/upvote', async (req, res, next) => {
    try {
        console.log(req.body);
        let response = await userData.upVote(req.body);
        if (response.status) {
            res.json({ status: true, tags: response.tags });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.post('/tag/downvote', async (req, res, next) => {
    try {
        console.log(req.body);
        let response = await userData.downVote(req.body);
        if (response.status) {
            res.json({ status: true, tags: response.tags });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.get('/fetch/tag', async (req, res, next) => {
    try {
        console.log(req.query);
        let response = await userData.findTag(req.query);
        if (response.status) {
            res.json({ status: true, tag: response.tag });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
})

app.get('/fetch/tag/replies', async (req, res, next) => {})

app.listen(port, () => {
    console.log("Server started : " + port)
});