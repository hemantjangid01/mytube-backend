import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getAllVideos, getChannelVideos, getMyVideos, getVideoById,
     publishVideo, searchVideos, togglePublishedStatus, updateVideo } from "../controllers/video.controllers.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router=Router();
const videoReadLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 60,
  keyPrefix: "video-read",
});

const videoSearchLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 20,
  keyPrefix: "video-search",
});

router.route("/publishVideo").post(verifyJWT,upload.fields([{
    name:"videoFile",
    maxCount:1
},
{
    name:"thumbnail",
    maxCount:1
}

])
,publishVideo)

router
    .route("/my-videos")
    .get(verifyJWT, getMyVideos);
router.route("/search").get(videoSearchLimiter,searchVideos);
router.route("/:videoId").get(videoReadLimiter,getVideoById);
router.route("/:videoId").patch(verifyJWT,upload.fields([{
    name:"thumbnail",
    maxCount:1
}]),updateVideo)
router.route("/:videoId").delete(verifyJWT,deleteVideo);
router.route("/:videoId/toggle/publish").patch(verifyJWT,togglePublishedStatus);
router.route("/").get(videoReadLimiter,getAllVideos);



 router
    .route("/channel/:username")
    .get(videoReadLimiter,getChannelVideos);

export default router
