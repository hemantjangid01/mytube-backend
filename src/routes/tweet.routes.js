import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, deleteTweet, getAllTweets, getUserTweets, updateTweet } from "../controllers/tweet.controllers.js";

const router=Router();


router.route("/createtweet").post(verifyJWT,createTweet);
router.route("/updatetweet/:tweetid").patch(verifyJWT,updateTweet);
router.route("/getusertweets").get(verifyJWT,getUserTweets);
router.route("/deletetweet/:tweetid").delete(verifyJWT,deleteTweet);
router.route("/getalltweets").get(verifyJWT, getAllTweets);

export default router
