import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getLikedVideos, getVideoLikeInfo, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/likes.controllers.js";

const router=Router();

router.route("/likeVideo/:videoId").post(verifyJWT,toggleVideoLike);
router.route("/likeComment/:commentId").post(verifyJWT,toggleCommentLike);
router.route("/likeTweet/:tweetId").post(verifyJWT,toggleTweetLike);
router.route("/getlikedVideos").get(verifyJWT,getLikedVideos);
router
  .route("/videoLikeInfo/:videoId")
  .get(verifyJWT, getVideoLikeInfo);

export default router;