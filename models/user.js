const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  followers: {
    type: Number,
    default: 0,
  },
  following: {
    type: Number,
    default: 0,
  },
  profilePicture: {
    url: String,
    filename: String,
  },
  posts: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    default: [],
  },
  token: {
    type: String,
    default: "",
  },
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);
