const Joi = require("joi");
const comments = require("./models/comments");

module.exports.postSchema = Joi.object({
  post: Joi.object({
    caption: Joi.string(),
    likes: Joi.number().min(0),
    image: Joi.object({
      url: Joi.string().required(),
      filename: Joi.string().required(),
    }),
    tags: Joi.array().items(Joi.string()),
  }),
});

module.exports.commentSchema = Joi.object({
  comments: Joi.object({
    comment: Joi.string().required(),
  }).required(),
});
