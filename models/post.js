const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Comment = require("./comments.js");
const moment = require("moment");

const postSchema = new Schema({
  caption: {
    type: String,
  },
  image: {
    url: String,
    filename: String,
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  totalComments: {
    type: Number,
    default: 0,
  },
  tags: [String],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

postSchema.virtual("formattedCreatedAt").get(function () {
  return moment(this.createdAt).fromNow();
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

postSchema.post("findOneAndDelete", async (post) => {
  if (post) {
    await Comment.deleteMany({ _id: { $in: post.comments } });
  }
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
