const Post = require("./models/post");
const { postSchema, commentSchema } = require("./schema");
const ExpressError = require("./utils/ExpressError");
const Review = require("./models/comments");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let post = await Post.findById(id);
  if (!post.owner._id.equals(res.locals.currUser._id)) {
    req.flash("error", "you are not the owner of this post");
    return res.redirect(`/posts/${id}`);
  }
  next();
};

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

module.exports.isCommentAuthor = async (req, res, next) => {
  let { id, commentId } = req.params;
  let comment = await Comment.findById(commentId);
  if (!comment.author.equals(res.locals.currUser._id)) {
    req.flash("error", "you are not the Author of this Comment");
    return res.redirect(`/posts/${id}`);
  }
  next();
};
