import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controlles.js";


const router=Router();
 

router.route("/getChannelStats/:channelId").get(verifyJWT,getChannelStats);
router.route("/getChannelVideos/:channelId").get(verifyJWT,getChannelVideos);


export default router;
