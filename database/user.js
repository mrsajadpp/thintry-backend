let db = require('./config.js')
const ObjectId = require('mongodb').ObjectID;
var bcrypt = require('bcrypt');
const schedule = require('node-schedule');
var Filter = require('bad-words');
var badFilter = new Filter({ placeHolder: '*', replaceRegex: /[A-Za-z0-9가-힣_]/g, regex: /\*|\.|$/gi });
var profanity = require("profanity-hindi");
const saltRounds = 10;
var nodemailer = require('nodemailer');

let COLLECTIONS = {
    USERS: 'users',
    POSTS: 'posts'
}

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'noreply.thintry@gmail.com',
        pass: process.env.PASS
    }
});

let sendMail = (data) => {
    setTimeout(() => {
        transporter.sendMail({
            from: '"Thintry" noreply.thintry@gmail.com',
            to: data.email,
            subject: data.subject,
            text: data.text,
            html: data.content
        });
    }, 10);
    return;
}

const delUn = () => {
    setTimeout(async () => {
        let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray().catch(error => console.log(error));
        users.map(user => {
            db.get().collection(COLLECTIONS.USERS).deleteOne({ _id: user._id }).catch(error => console.log(error));;
        });
    }, 1000);
}

const updateOtp = () => {
    setTimeout(async () => {
        let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray().catch(error => console.log(error));;
        users.map(async user => {
            let verification_code = await Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            db.get().collection(COLLECTIONS.USERS).findOneAndUpdate({ _id: user._id }, { $set: { verification_code: verification_code, encrypted_verification_code: bcrypt.hash(verification_code, saltRounds) } }).catch(error => console.log(error));
        });
    }, 1000);
}

schedule.scheduleJob('*/7 * * * *', () => {
    try {
        delUn();
    } catch (error) {
        console.log(error)
    }
});

schedule.scheduleJob('*/7 * * * *', function () {
    try {
        updateOtp();
    } catch (error) {
        console.log(error)
    }
});

module.exports = {
    checkUsername: (username) => {
        return db.get().collection(COLLECTIONS.USERS).findOne({ username: username.toLowerCase(), status: true })
            .then((user) => {
                if (!user) {
                    return false;
                } else {
                    return true;
                }
            })
            .catch((err) => {
                return err;
            });
    },
    createUser: async (userData, locationData) => {
        try {
            let user = await db.get().collection(COLLECTIONS.USERS).findOne({ username: userData.username });
            if (!user) {
                let verification_code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                let encrypted_verification_code = await bcrypt.hash(verification_code, saltRounds);
                let hash_pass = await bcrypt.hash(userData.password, saltRounds);

                let newUserData = await {
                    username: userData.username.toLowerCase(),
                    firstname: userData.firstname,
                    lastname: userData.lastname,
                    email: userData.email,
                    about: 'I am a Thintry user!',
                    password: hash_pass,
                    verified: false,
                    official: false,
                    status: false,
                    bot: false,
                    profile: 'https://i.postimg.cc/6qBY4CDQ/unknown.jpg',
                    created: {
                        timestamp: new Date(),
                        location: {
                            region: locationData.region || 'Kerala',
                            country: locationData.country || 'IN',
                        },
                    },
                    dob: null,
                    followers: [],
                    followings: [],
                    followersCount: 0,
                    followingsCount: 0,
                    verification_code: verification_code,
                    encrypted_verification_code: encrypted_verification_code
                };

                let insertedUser = await db.get().collection(COLLECTIONS.USERS).insertOne(newUserData);
                let user = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: insertedUser.insertedId });

                sendMail({
                    email: newUserData.email,
                    subject: "Your Verification Code",
                    text: "Your Verification Code is " + newUserData.verification_code,
                    content: `
                    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                        style="font-family: 'Open Sans', sans-serif;">
                        <tr>
                            <td>
                                <table style="background-color: #f2f3f8; max-width:670px; margin:0 auto;" width="100%" border="0"
                                    align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <a href="https://thintry.com/" title="logo" target="_blank">
                                                <img width="200" src="https://i.postimg.cc/SsgJL0SN/thintry-logo.png"
                                                    title="logo" alt="logo">
                                            </a>
                                            <br>
                                            <h1 style="color:#1e1e2d; font-weight:500; margin:0; font-size:22px; font-family:'Rubik',sans-serif; margin-top: 30px;">
                                                Your Verification Code is Ready</h1>
                                            <span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                            <p style="color:#455056; font-size:15px; line-height:24px; margin:0;">
                                                Thank you for choosing Thintry. Your verification code is valid for 7 minutes. Please do not share it with anyone.
                                            </p>
                                            <a href="javascript:void(0);"
                                                style="background:#6fbf7e; text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff; text-transform:uppercase; font-size:14px; padding:10px 24px; display:inline-block; border-radius:50px;">
                                                CODE : ${newUserData.verification_code}</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>`
                });

                return user;
            } else {
                if (user.status) {
                    throw { message: 'User already exists!', status: 403 };
                } else {
                    sendMail({
                        email: user.email,
                        subject: "Your Verification Code!",
                        text: "Your Verification Code is " + user.verification_code,
                        content: `<table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                        style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
                        <tr>
                            <td>
                                <table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0"
                                    align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                    
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                                style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 35px;"> 
                                                        <a href="https://thintry.com/" title="logo" target="_blank">
                                                            <img width="200" src="https://i.postimg.cc/SsgJL0SN/thintry-logo.png"
                                                                title="logo" alt="logo">
                                                        </a>
                                                        <br>
                                                        <h1
                                                            style="color:#1e1e2d; font-weight:500; margin:0;font-size:22px;font-family:'Rubik',sans-serif; margin-top: 30px;">
                                                            Your verification code is Ready</h1>
                                                        <span
                                                            style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                        <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                            Thank you for choosing Thintry, Your verification code is valid for 7 minutes, Don't share with anyone.
                                                        </p>
                                                        <a href="javascript:void(0);"
                                                            style="background:#6fbf7e;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">CODE : ${user.verification_code}</a>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                            </table>
                                        </td>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <p
                                                style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">
                                                <strong>https://thintry.com/</strong></p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>`
                    });
                    return user;
                }
            }
        } catch (error) {
            throw error;
        }
    },
    verifyUser: async (data) => {
        try {
            const user = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(data.uid) });

            if (!user) {
                return { status: false, message: 'User not found' };
            }

            const isCodeValid = await bcrypt.compare(data.otp, user.encrypted_verification_code);

            if (isCodeValid) {
                const result = await db.get().collection(COLLECTIONS.USERS).updateOne(
                    { _id: ObjectId(data.uid) },
                    { $set: { status: true, verification_code: null, encrypted_verification_code: null } }
                );

                if (result.modifiedCount === 1) {
                    let upUser = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: user._id, status: true });
                    return { status: true, message: 'User verified successfully', user: upUser };
                } else {
                    return { status: false, message: 'Verification update failed' };
                }
            } else {
                return { status: false, message: 'Invalid verification code' };
            }
        } catch (error) {
            console.error('Error in verifyUser:', error);
            throw { status: false, message: 'An error occurred while verifying the user' };
        }
    },
    login: async (data) => {
        try {
            let user = await db.get().collection(COLLECTIONS.USERS).findOne({ username: data.username.toLowerCase(), status: true });
            const isPassValid = await bcrypt.compare(data.password, user.password);
            if (user && isPassValid) {
                return { status: true, user }
            } else {
                return { status: false }
            }
        } catch (error) {
            throw { status: false, message: 'An error occurred while login the user' };
        }
    },
    fetchUser: async (data) => {
        try {
            let user = await db.get().collection(COLLECTIONS.USERS).findOne({ username: data.username.toLowerCase(), status: true });
            if (user) {
                return { status: true, user }
            } else {
                return { status: false }
            }
        } catch (error) {
            throw { status: false, message: 'An error occurred while fetching the user' };
        }
    },
    fetchPosts: async (data) => {
        try {
            let posts = await db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $match: {
                        user: ObjectId(data.uid)
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                }
            ]).toArray();

            if (posts) {
                return { status: true, posts }
            } else {
                return { status: false }
            }
        } catch (error) {
            throw { status: false, message: 'An error occurred while fetching posts' };
        }
    },
    updateUser: async (userData) => {
        try {
            let upUser = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate({ _id: ObjectId(userData._id) }, { $set: { username: userData.username.toLowerCase, firstname: userData.firstname, lastname: userData.lastname || '', about: userData.about } }).catch(error => console.log(error));
            let newData = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: upUser.value._id });
            if (newData) {
                return { status: true, user: newData };
            } else {
                return { status: false };
            }
        } catch (error) {
            throw { status: false, message: 'An error occurred while updating user' };
        }
    },
    fetchTags: async (data) => {
        try {
            if (data.uid) {
                let tags = await db.get().collection(COLLECTIONS.POSTS).find({ user: ObjectId(data.uid) }).toArray();

                if (tags) {
                    // Sort tags based on timestamp in descending order
                    tags.sort((a, b) => b.timestamp - a.timestamp);

                    return { status: true, tag: tags };
                } else {
                    return { status: false };
                }
            } else {
                return { status: false };
            }
        } catch (error) {
            throw { status: false, message: 'An error occurred while finding tags' };
        }
    },
    newTag: async (data) => {
        try {
            const timestamp = new Date(); // Get the current timestamp
            const postData = {
                user: ObjectId(data._id), // Assuming userId is the ID of the user creating the post
                content: profanity.maskBadWords(badFilter.clean(data.content)),
                timestamp: timestamp,
                upvote: [],
                downvote: []
            };
            let tag = await db.get().collection(COLLECTIONS.POSTS).insertOne(postData);
            const regex = /@([a-zA-Z0-9_]+)/g;
            const usernames = data.content.match(regex);
            setTimeout(() => {
                if (data.content.match(regex)) {
                    db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(data._id) }).then((client) => {
                        usernames.forEach(username => {
                            db.get().collection(COLLECTIONS.USERS).findOne({ username: username.toLowerCase().replace(/@/g, '') }).then((user) => {
                                if (user) {
                                    sendMail({
                                        email: user.email,
                                        subject: `${client.firstname} ${client.lastname} mentioned you!`,
                                        text: `Hello ${user.firstname}, ${client.firstname} ${client.lastname} mentioned you!`,
                                        content: `${profanity.maskBadWords(badFilter.clean(data.content))}\n\n - <a href="https://thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                                    });
                                }
                            }).catch((error) => {
                                reject(error);
                            });
                        });
                    }).catch((error) => {
                        reject(error);
                    });
                }
            }, 100);

            setTimeout(() => {
                db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(data._id) }).then((client) => {
                    if (data.content.toLowerCase().includes("@everyone") && client.official) {
                        setTimeout(async () => {
                            let users = await db.get().collection(COLLECTIONS.USERS).find().toArray();
                            users.forEach(user => {
                                sendMail({
                                    email: user.email,
                                    subject: "Something important!",
                                    text: `Hello ${user.firstname}, important post by `,
                                    content: `${profanity.maskBadWords(badFilter.clean(data.content))}\n\n - <a href="https://thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                                });
                            });
                        }, 1000);
                    }
                }).catch((error) => {
                    reject(error);
                });
            }, 100);

            let newTag = await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: tag.insertedId });
            if (newTag) {
                return { status: true, tag: newTag };
            } else {
                return { status: false };
            }
        } catch (error) {
            console.log(error)
            throw { status: false, message: 'An error occurred while uploading tag' };
        }
    }
};
