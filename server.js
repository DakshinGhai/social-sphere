if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync");
const ExpressError = require("./utils/ExpressError");
const { postSchema, commentSchema } = require("./schema");
const User = require("./models/user");
const Comment = require("./models/comments"); // Correct import for Comments model
const Post = require("./models/post");
const { log, info } = require("console");
const { saveRedirectUrl, isLoggedIn, isOwner } = require("./middleware.js");
const moment = require("moment");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const config = require("./config.js");
const MongoStore = require("connect-mongo");

const app = express();

// const MONGO_URL = "mongodb://127.0.0.1:27017/SocialSphere";
const dbUrl = process.env.ATLASDB_URL;

mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", () => {
  console.log("Error in Mongo Session Store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

const sendResetPasswordMail = async (name, email, token) => {
  try {
    if (!email) {
      throw new Error("Email is required to send reset password mail");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: config.emailUser,
        pass: config.emailPassword,
      },
    });

    const mailOptions = {
      from: config.emailUser,
      to: email,
      subject: "Reset Password",
      html: `<p>Hi ${name},</p>
             <p>Please click the link below to reset your password:</p>
             <a href="https://social-sphere-okgn.onrender.com/reset-password?token=${token}">Reset your password</a>`,
    };

    console.log("Sending email to:", email);
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Mail has been sent: ", info.response);
      }
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
app.use(session(sessionOptions));
app.use(flash());

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});
app.use(express.json()); // Add this to parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

const validatePost = (req, res, next) => {
  const { error } = postSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

const validateComment = (req, res, next) => {
  const { error } = commentSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};
const parseTags = (req, res, next) => {
  if (req.body.post && req.body.post.tags) {
    req.body.post.tags = JSON.parse(req.body.post.tags); // Parse the JSON string back to an array
  }
  next();
};

app.get("/posts", wrapAsync(async (req, res) => {
    try {
        console.log("Fetching posts...");
        const allPosts = await Post.find({}).populate("owner");
        console.log("Posts fetched:", allPosts.length);
        allPosts.forEach(post => {
            post.formattedCreatedAt = moment(post.createdAt).fromNow();
        });
        res.render("posts/index", { allPosts });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).render("posts/error", { message: 'Internal Server Error', error: error.message });
    }
}));
app.post(
  "/posts",
  isLoggedIn,
  upload.single("post[image]"),
  parseTags, // Parse tags before validation
  validatePost,
  wrapAsync(async (req, res, next) => {
    const { path: url, filename } = req.file;
    const { post } = req.body;

    const newPost = new Post(post);
    newPost.owner = req.user._id;
    newPost.image = { url, filename };

    await newPost.save();
    console.log(newPost);
    const user = await User.findById(req.user._id);
    if (!Array.isArray(user.posts)) {
      user.posts = [];
    }

    user.posts.push(newPost._id);
    await user.save();

    res.redirect("/posts");
  })
);
// app.post(
//   "/posts",
//   isLoggedIn,
//   upload.single("post[image]"),
//   validatePost,
//   wrapAsync(async (req, res, next) => {
//     let url = req.file.path;
//     let filename = req.file.filename;
//     const { post } = req.body;
//     if (post.tags) {
//       post.tags = JSON.parse(post.tags); // Parse the JSON string back to an array
//     }
//     const newPost = new Post(post);
//     newPost.owner = req.user._id;
//     newPost.image = { url, filename };
//     await newPost.save();
//     const user = await User.findById(req.user._id);
//     if (!Array.isArray(user.posts)) {
//       user.posts = [];
//     }
//     user.posts.push(newPost._id);
//     await user.save();
//     res.redirect("/posts");
//   })
// );

app.get(
  "/posts/new",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    res.render("posts/new");
  })
);

app.post(
  "/posts/:id/like",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const postId = req.params.id;
    const { isLiked } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      throw new ExpressError(404, "Post not found");
    }
    if (isLiked) {
      post.likes += 1;
    } else {
      post.likes -= 1;
    }
    await post.save();
    res.json({ success: true });
  })
);

app.get(
  "/posts/:id",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    const post = await Post.findById(id)
      .populate({
        path: "comments",
        populate: {
          path: "author",
        },
      })
      .populate("owner");
    post.formattedCreatedAt = moment(post.createdAt).fromNow();
    res.render("posts/show.ejs", { post });
  })
);

app.delete(
  "/posts/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Post.findByIdAndDelete(id);
    res.redirect(`/posts`);
  })
);

//edit route
app.get(
  "/posts/:id/edit",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const post = await Post.findById(id);
    res.render("posts/edit.ejs", { post });
  })
);
//update

app.put(
  "/posts/:id",
  isLoggedIn,
  upload.single("post[image]"),
  parseTags,
  validatePost,
  wrapAsync(async (req, res) => {
    const { id } = req.params;

    // Find the post by ID and update its fields
    let post = await Post.findByIdAndUpdate(id, {
      caption: req.body.post.caption,
      tags: req.body.post.tags,
    });

    if (req.file) {
      const { path: url, filename } = req.file;
      post.image = { url, filename };
      await post.save();
    }

    res.redirect(`/posts/${id}`);
  })
);

//comments
app.get(
  "/posts/:id/comments",
  wrapAsync(async (req, res) => {
    let post = await Post.findById(req.params.id);
    res.redirect(`/Posts/${post._id}`);
  })
);
app.post(
  "/posts/:id/comments",
  validateComment,
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let post = await Post.findById(req.params.id);
    console.log(post);
    let newComment = new Comment(req.body.comments);
    newComment.author = req.user._id;

    post.comments.push(newComment);
    console.log(post);
    if (post) {
      post.totalComments += 1;
    }
    console.log(post);

    await newComment.save();
    await post.save();
    console.log("new comment saved");
    res.redirect(`/Posts/${post._id}`);
  })
);
//delete comment Route
app.delete(
  "/posts/:id/comments/:commentId",
  wrapAsync(async (req, res) => {
    let { id, commentId } = req.params;
    let post = await Post.findById(req.params.id);
    console.log(post);
    if (post) {
      post.totalComments -= 1;
    }
    await post.save();
    await Post.findByIdAndUpdate(id, { $pull: { comment: commentId } });

    await Comment.findByIdAndDelete(commentId);
    res.redirect(`/posts/${id}`);
  })
);

// signup
app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post("/signup", upload.single("profilePicture"), async (req, res, next) => {
  try {
    let { username, email, password } = req.body;
    const newUser = new User({ email, username });
    console.log(req.file);

    if (req.file) {
      const { path: url, filename } = req.file;
      newUser.profilePicture = { url, filename };
    } else {
      newUser.profilePicture = {
        url: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        filename: null,
      };
    }

    console.log(newUser);
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);

    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Welcome to Social Sphere!");
      res.redirect("/posts");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

app.get(
  "/users/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const user = await User.findById(id).populate("posts");
    res.render("users/show.ejs", { user });
  })
);

app.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome Back to Social Sphere!");
    let redirectUrl = res.locals.redirectUrl || "/posts";
    res.redirect(redirectUrl);
  }
);
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out!");
    res.redirect("/posts");
  });
});

app.get("/forget-password", (req, res) => {
  res.render("users/forget.ejs");
});

app.post("/forget-password", async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) {
      res.status(400).send({ success: false, msg: "Email is required" });
      return;
    }

    const userData = await User.findOne({ email: email }); // Added await here
    if (userData) {
      const randomString = randomstring.generate();
      await User.updateOne({ email: email }, { $set: { token: randomString } });
      sendResetPasswordMail(userData.username, userData.email, randomString);
      res.status(200).send({
        success: true,
        msg: "Please check your mail and reset your password",
      });
    } else {
      res.status(200).send({ success: false, msg: "This email doesn't exist" });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});

app.get("/reset-password", async (req, res) => {
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({ token: token });
    if (tokenData) {
      res.render("users/reset", { token });
    } else {
      res.status(400).send({ success: false, msg: "Link has expired." });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenData = await User.findOne({ token: token });
    if (tokenData) {
      await tokenData.setPassword(password);
      tokenData.token = null;
      await tokenData.save();
      res.redirect("/login");
    } else {
      res.status(400).send({ success: false, msg: "Link has expired." });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});
app.get(
  "/users/:id/edit",
  wrapAsync(async (req, res) => {
    let user = await User.findById(req.params.id);
    res.render("users/edit", { user });
  })
);
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "something went wrong" } = err;
  res.render("posts/error.ejs", { message });
});
app.put(
  "/users/:id",
  upload.single("profilePicture"),
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send("User not found");
    }
    console.log(req.file);
    // Assuming user.profilePicture is an object with a 'url' property
    if (req.file) {
      user.profilePicture.url = req.file.path;
    }

    await user.save();
    console.log(user);
    res.redirect(`/users/${id}`);
  })
);
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
