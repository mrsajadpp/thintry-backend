require('dotenv').config();
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
const path = require('path');
const fs = require('fs');
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


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/profile/:imagename', (req, res) => {
    const imagename = req.params.imagename;
    const imagePath = path.join(__dirname, 'uploads', 'profiles', imagename);

    // Check if the image file exists
    if (fs.existsSync(imagePath)) {
        // Send the image as a response
        res.sendFile(imagePath);
    } else {
        // Handle the case where the image doesn't exist
        res.status(404).send('Image not found');
    }
});

app.get('/audio/:audioname', (req, res) => {
    const audioname = req.params.audioname;
    const audioPath = path.join(__dirname, 'uploads', 'audios', audioname);

    // Check if the image file exists
    if (fs.existsSync(audioPath)) {
        // Send the image as a response
        res.sendFile(audioPath);
    } else {
        // Handle the case where the image doesn't exist
        res.status(404).send('Image not found');
    }
});

app.get('/image/:imagename', (req, res) => {
    const imagename = req.params.imagename;
    const imagePath = path.join(__dirname, 'uploads', 'images', imagename);

    // Check if the image file exists
    if (fs.existsSync(imagePath)) {
        // Send the image as a response
        res.sendFile(imagePath);
    } else {
        // Handle the case where the image doesn't exist
        res.status(404).send('Image not found');
    }
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

app.post('/user/update', async (req, res) => {
    try {
        let profilePicture = false;
        if (req.files) {
            profilePicture = await req.files.profilePicture;
        }
        const userId = req.body.uid;

        // Ensure the uploads directory exists
        if (profilePicture) {
            const uploadDir = path.join(__dirname, 'uploads/profiles');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Move the uploaded profile picture to the appropriate location
            const profilePicturePath = path.join(uploadDir, `${userId}.jpeg`);
            profilePicture.mv(profilePicturePath);
        }

        // Assuming 'updateUser' is an async function for updating user data
        const updatedUser = await userData.updateUser(req.body);

        if (updatedUser.status) {
            res.json({ status: true, user: updatedUser.user });
        } else {
            res.json({ status: false, message: 'User update failed', error: updatedUser.error }); // Include error details here
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while updating the user', error: error.message });
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

app.post('/tag/new', async (req, res, next) => {
    try {
        const sanitizedContent = await sanitizeHtml(req.query.content, {
            allowedTags: ['b'], // Remove all HTML tags
            allowedAttributes: {} // No attributes allowed
        });
        req.query.content = await sanitizedContent;
        let tags = await userData.newTag(req.body);
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

app.post('/tag/reply/new', async (req, res, next) => {
    try {
        const sanitizedContent = await sanitizeHtml(req.query.reply, {
            allowedTags: ['b'], // Remove all HTML tags
            allowedAttributes: {} // No attributes allowed
        });
        req.query.reply = await sanitizedContent;
        let tag = await userData.newTagReply(req.body);
        if (tag.status) {
            res.json({ status: true });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while new tag' });
    }
})

app.get('/fetch/user/tags/all', async (req, res, next) => {
    try {
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

app.get('/tag/reply/delete', async (req, res, next) => {
    try {
        let response = await userData.delTagReply(req.query);
        if (response.status) {
            res.json({ status: true });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
})

app.post('/tag/upvote', async (req, res, next) => {
    try {
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

app.post('/tag/reply/upvote', async (req, res, next) => {
    try {
        // let response = await userData.upVote(req.body);
        // if (response.status) {
        //     res.json({ status: true, tags: response.tags });
        // } else {
        //     res.json({ status: false });
        // }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.post('/tag/downvote', async (req, res, next) => {
    try {
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

app.post('/tag/reply/downvote', async (req, res, next) => {
    try {
        // let response = await userData.downVote(req.body);
        // if (response.status) {
        //     res.json({ status: true, tags: response.tags });
        // } else {
        //     res.json({ status: false });
        // }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.get('/fetch/tag', async (req, res, next) => {
    try {
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

app.get('/fetch/tag/replies', async (req, res, next) => {
    try {
        let response = await userData.findReplies(req.query);
        if (response.status) {
            res.json({ status: true, replies: response.replies });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while deleting tag' });
    }
});

app.post('/user/followers', async (req, res, next) => {
    try {
        let response = await userData.findFollowers(req.body.username);
        if (response.status) {
            res.json({ status: true, followers: response.followers });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching followers!' });
    }
})

app.post('/user/followings', async (req, res, next) => {
    try {
        let response = await userData.findFollowings(req.body.username);
        if (response.status) {
            res.json({ status: true, followings: response.followings });
        } else {
            res.json({ status: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching followings!' });
    }
})

app.post('/user/isfollowing', async (req, res, next) => {
    try {
        console.log(req.body)
        let response = await userData.ifFollowing(req.body.follower_id, req.body.following_id);
        console.log(response);
        if (response.status) {
            res.json({ status: true, following: true });
        } else {
            res.json({ status: false, following: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching is following!' });
    }
});

app.post('/user/isfollowingback', async (req, res, next) => {
    try {
        let response = await userData.isFollowingBack(req.body.follower_id, req.body.following_id);
        if (response.status) {
            res.json({ status: true, followingBack: true });
        } else {
            res.json({ status: false, followingBack: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'An error occurred while fetching is following back!' });
    }
});

app.get('*', (req, res, next) => {
    res.json({ status: false, message: 'Api not found!' })
});

app.post('*', (req, res, next) => {
    res.json({ status: false, message: 'Api not found!' })
});

app.listen(port, () => {
    console.log("Server started : " + port)
});