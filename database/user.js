let db = require('./config.js')
const ObjectId = require('mongodb').ObjectID;
var bcrypt = require('bcrypt');
const schedule = require('node-schedule');
const Filter = require('bad-words');
const filter = new Filter({ placeHolder: 'x' });
const saltRounds = 10;
var nodemailer = require('nodemailer');
const today = new Date();
today.setHours(0, 0, 0, 0);

let COLLECTIONS = {
    USERS: 'users',
    POSTS: 'posts',
    REPLIES: 'replies'
}

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: 'noreply.thintry@gmail.com',
        pass: process.env.SMTP_PASS
    }
});

let sendMail = (data) => {
    setTimeout(() => {
        transporter.sendMail({
            from: '"Thintry" noreply.thintry@gmail.com',
            to: data.email,
            subject: data.subject,
            text: data.text,
            html: filter.clean(data.content)
        });
    }, 10);
    return;
}

const delUn = () => {
    setTimeout(async () => {
        try {
            let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray();
            for (const user of users) {
                await db.get().collection(COLLECTIONS.USERS).deleteOne({ _id: user._id });
            }
        } catch (error) {
            console.error("Error in delUn:", error);
        }
    }, 1000);
}

const delPostNoUser = () => {
    setTimeout(async () => {
        try {
            let posts = await db.get().collection(COLLECTIONS.POSTS).find().toArray();
            for (const post of posts) {
                let user = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(post.user) });
                if (!user) {
                    await db.get().collection(COLLECTIONS.POSTS).deleteMany({ _id: post._id });
                }
            }
        } catch (error) {
            console.error("Error in delUn:", error);
        }
    }, 1000);
}

const updateOtp = () => {
    setTimeout(async () => {
        try {
            let users = await db.get().collection(COLLECTIONS.USERS).find({ status: false }).toArray();
            for (const user of users) {
                let verification_code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate(
                    { _id: user._id },
                    { $set: { verification_code: verification_code, encrypted_verification_code: await bcrypt.hash(verification_code, saltRounds) } }
                );
            }
        } catch (error) {
            console.error("Error in updateOtp:", error);
        }
    }, 1000);
}

schedule.scheduleJob('*/7 * * * *', () => {
    delUn();
});

schedule.scheduleJob('*/7 * * * *', () => {
    updateOtp();
});

function findUniqueValues(arr) {
    const uniqueValues = [];
    const seenValues = {};

    for (const value of arr) {
        if (!seenValues[value]) {
            uniqueValues.push(value);
            seenValues[value] = true;
        }
    }

    return uniqueValues;
}

const removeDuplicateFollowersAndFollowings = async () => {
    try {
        const users = await db.get().collection(COLLECTIONS.USERS).find({}).toArray();

        for (const user of users) {
            const uniqueFollowers = await findUniqueValues(user.followers);
            const uniqueFollowings = await findUniqueValues(user.followings);

            await db.get().collection(COLLECTIONS.USERS).updateOne(
                { _id: user._id },
                { $set: { followers: uniqueFollowers, followings: uniqueFollowings } }
            );
        }

        console.log("Duplicate followers and followings removed successfully.");
    } catch (error) {
        console.error("Error removing duplicate followers and followings:", error);
    }
};

schedule.scheduleJob('*/7 * * * *', () => {
    removeDuplicateFollowersAndFollowings();
});

schedule.scheduleJob('*/7 * * * *', () => {
    delPostNoUser();
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
                                            <a href="http://api.thintry.com/" title="logo" target="_blank">
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
                                                        <a href="http://api.thintry.com/" title="logo" target="_blank">
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
                                                <strong>http://api.thintry.com/</strong></p>
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
            let upUser = await db.get().collection(COLLECTIONS.USERS).findOneAndUpdate({ _id: ObjectId(userData.uid) }, { $set: { username: userData.username.toLowerCase, firstname: userData.firstname, lastname: userData.lastname || '', about: userData.about, profile: `/profile/${userData.uid}.jpeg`, dob: { day: userData.day, month: userData.month, year: userData.year } } }).catch(error => console.log(error));
            let newData = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: upUser.value._id });
            if (newData) {
                return { status: true, user: newData };
            } else {
                return { status: false };
            }
        } catch (error) {
            console.log(error)
            throw { status: false, message: 'An error occurred while updating user' };
        }
    },
    fetchTags: async (data) => {
        try {
            if (data.uid) {
                let tags = await db.get().collection(COLLECTIONS.POSTS).aggregate([
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

                if (tags) {
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
    findAllTags: async () => {
        try {
            const tags = await db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $project: {
                        user: { $arrayElemAt: ["$user", 0] },
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1,
                        replies: 1,
                        audio: 1
                    }
                }
            ]).toArray();

            if (tags.length) {
                return { status: true, tags };
            } else {
                return { status: false, tags: [] }; // Return an empty array when there are no tags
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
                content: filter.clean(data.content),
                timestamp: timestamp,
                upvote: [],
                downvote: [],
                replies: [],
            };
            const tag = await db.get().collection(COLLECTIONS.POSTS).insertOne(postData);
            const regex = /@([a-zA-Z0-9_]+)/g;
            const usernames = data.content.match(regex);
            setTimeout(() => {
                db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(data._id) }).then((client) => {
                    usernames.forEach(username => {
                        db.get().collection(COLLECTIONS.USERS).findOne({ username: username.toLowerCase().replace(/@/g, '') }).then((user) => {
                            if (user) {
                                sendMail({
                                    email: user.email,
                                    subject: `${client.firstname} ${client.lastname} mentioned you!`,
                                    text: `Hello ${user.firstname}, ${client.firstname} ${client.lastname} mentioned you!`,
                                    content: `${filter.clean(data.content)}\n\n - <a href="http://api.thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                                });
                            }
                        }).catch((error) => {
                            reject(error);
                        });
                    });
                }).catch((error) => {
                    reject(error);
                });
            }, 100);

            setTimeout(() => {
                db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(data._id) }).then((client) => {
                    if (filter.clean(data.content).toLowerCase().includes("@everyone") && client.official) {
                        setTimeout(async () => {
                            let users = await db.get().collection(COLLECTIONS.USERS).find().toArray();
                            users.forEach(user => {
                                sendMail({
                                    email: user.email,
                                    subject: "Something important!",
                                    text: `Hello ${user.firstname}, important post by `,
                                    content: `${filter.clean(data.content)}\n\n - <a href="http://api.thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
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
    },
    delTag: async ({ uid, tagId }) => {
        try {
            let res = await db.get().collection(COLLECTIONS.POSTS).deleteOne({ _id: ObjectId(tagId), user: ObjectId(uid) });
            if (res) {
                return { status: true };
            } else {
                return { status: false };
            }
        } catch (error) {
            console.log(error)
            throw { status: false, message: 'An error occurred while deleting tag' };
        }
    },
    upVote: async ({ tagId, uid }) => {
        try {
            // Find the tag by ID and check if it exists
            const tag = await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
            if (!tag) {
                return { status: false, message: 'Tag not found', tags: null };
            }

            // Check if the user has already upvoted this tag
            const hasDownvoted = tag.downvote.includes(uid);

            if (hasDownvoted) {
                // Remove the user's UID from the upvote array and add it to the downvote array
                await db.get().collection(COLLECTIONS.POSTS).updateOne(
                    { _id: ObjectId(tagId) },
                    { $pull: { downvote: uid }, $push: { upvote: uid } }
                );
            } else {

                // Check if the user has already upvoted this tag
                const hasUpvoted = tag.upvote.includes(uid);

                if (!hasUpvoted) {
                    // Add the user's UID to the upvote array
                    await db.get().collection(COLLECTIONS.POSTS).updateOne(
                        { _id: ObjectId(tagId) },
                        { $push: { upvote: uid } }
                    );

                    // Retrieve the updated tag after upvoting
                    await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
                } else {
                    // Remove the user's UID from the upvote array
                    await db.get().collection(COLLECTIONS.POSTS).updateOne(
                        { _id: ObjectId(tagId) },
                        { $pull: { upvote: uid } }
                    );

                    // Retrieve the updated tag after removing the upvote
                    await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
                }
            }
            const tags = await db.get().collection(COLLECTIONS.POSTS).aggregate([
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $project: {
                        user: { $arrayElemAt: ["$user", 0] },
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1,
                        replies: 1,
                    }
                }
            ]).toArray();

            return { status: true, tags };
        } catch (error) {
            console.error('Error in upvoteTag:', error);
            throw { status: false, message: 'An error occurred while upvoting the tag', tags: null };
        }
    },
    downVote: async ({ tagId, uid }) => {
        try {
            try {
                // Find the tag by ID and check if it exists
                const tag = await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
                if (!tag) {
                    return { status: false, message: 'Tag not found', tags: null };
                }

                // Check if the user has already upvoted this tag
                const hasUpvoted = tag.upvote.includes(uid);

                if (hasUpvoted) {
                    // Remove the user's UID from the upvote array and add it to the downvote array
                    await db.get().collection(COLLECTIONS.POSTS).updateOne(
                        { _id: ObjectId(tagId) },
                        { $pull: { upvote: uid }, $push: { downvote: uid } }
                    );
                } else {

                    // Check if the user has already downvoted this tag
                    const hasDownvoted = tag.downvote.includes(uid);

                    if (!hasDownvoted) {
                        // Add the user's UID to the downvote array
                        await db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: ObjectId(tagId) },
                            { $push: { downvote: uid } }
                        );

                        // Retrieve the updated tag after downvoting
                        await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
                    } else {
                        // Remove the user's UID from the downvote array
                        await db.get().collection(COLLECTIONS.POSTS).updateOne(
                            { _id: ObjectId(tagId) },
                            { $pull: { downvote: uid } }
                        );

                        // Retrieve the updated tag after removing the downvote
                        await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tagId) });
                    }
                }
                const tags = await db.get().collection(COLLECTIONS.POSTS).aggregate([
                    {
                        $sort: {
                            timestamp: -1
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user"
                        }
                    },
                    {
                        $project: {
                            user: { $arrayElemAt: ["$user", 0] },
                            content: 1,
                            timestamp: 1,
                            upvote: 1,
                            downvote: 1,
                            replies: 1,
                        }
                    }
                ]).toArray();
                return { status: true, tags };
            } catch (error) {
                console.error('Error in downvoteTag:', error);
                throw { status: false, message: 'An error occurred while downvoting the tag', tags: null };
            }
        } catch (error) {
            console.error('Error in upvoteTag:', error);
            throw { status: false, message: 'An error occurred while upvoting the tag', tags: null };
        }
    },
    findTag: async ({ tagId }) => {
        try {
            const aggregationPipeline = [
                {
                    $match: {
                        _id: ObjectId(tagId)
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $project: {
                        user: { $arrayElemAt: ["$user", 0] },
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1,
                        replies: 1,
                        audio: 1
                    }
                }
            ];

            const tag = await db.get().collection(COLLECTIONS.POSTS).aggregate(aggregationPipeline).next();

            if (tag) {
                return { status: true, tag };
            } else {
                return { status: false, message: 'Tag not found', tag: null };
            }
        } catch (error) {
            console.error('Error in findTag:', error);
            throw { status: false, message: 'An error occurred while finding the tag', tag: null };
        }
    },
    findReplies: async ({ tagId }) => {
        try {
            const aggregationPipeline = [
                {
                    $match: {
                        post_id: ObjectId(tagId)
                    }
                },
                {
                    $sort: {
                        timestamp: -1
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    $project: {
                        user: { $arrayElemAt: ["$user", 0] },
                        content: 1,
                        timestamp: 1,
                        upvote: 1,
                        downvote: 1,
                        replies: 1,
                    }
                }
            ];

            const replies = await db.get().collection(COLLECTIONS.REPLIES).aggregate(aggregationPipeline).toArray();
            if (replies) {
                return { status: true, replies };
            } else {
                return { status: false };
            }
        } catch (error) {
            console.error('Error in findTag replies:', error);
            throw { status: false, message: 'An error occurred while finding the tag replies', tag: null };
        }
    },
    newTagReply: async ({ reply, tag_id, user_id }) => {
        try {
            let replyData = await {
                post_id: ObjectId(tag_id),
                user_id: ObjectId(user_id),
                content: filter.clean(reply),
                timestamp: new Date()
            }

            let tag = await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tag_id) });
            await tag.replies.push(ObjectId(user_id));
            console.log(...tag.replies)

            await db.get().collection(COLLECTIONS.POSTS).updateOne({ _id: ObjectId(tag_id) }, { replies: [...tag.replies] })

            setTimeout(async () => {
                let tagData = await db.get().collection(COLLECTIONS.POSTS).findOne({ _id: ObjectId(tag_id) });
                let user = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: tagData.user });
                let client = await db.get().collection(COLLECTIONS.USERS).findOne({ _id: ObjectId(user_id) });
                sendMail({
                    email: user.email,
                    subject: "New reply!",
                    text: `Hello ${user.firstname}, ${client.username} replied your tag`,
                    content: `New reply to your <a href='https://web.thintry.com/tag/${tag_id}'>tag</a> : ${filter.clean(reply)}\n\n - <a href="http://api.thintry.com/user/${client.username}">${client.firstname} ${client.lastname}</a>`
                });
            }, 1000);

            await db.get().collection(COLLECTIONS.REPLIES).insertOne(replyData);
            return { status: true }
        } catch (error) {
            console.error('Error in findTag replies:', error);
            throw { status: false, message: 'An error occurred while finding the tag replies', tag: null };
        }
    }
};
