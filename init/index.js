const mongoose = require("mongoose");
const initData = require("./data.js");
const Post = require("../models/post.js");

const SocialSphere_URL = "mongodb://127.0.0.1:27017/SocialSphere";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });
async function main() {
  await mongoose.connect(SocialSphere_URL);
}

const initDB = async () => {
  await Post.deleteMany({});
  // initData.data = initData.data.map((obj) => ({
  //   ...obj,
  //   owner: "65f3d9e31fc89e0efd7bdcaa",
  // }));
  console.log(initData.data);
  await Post.insertMany(initData.data);
  console.log("data was initialized");
};
initDB();
