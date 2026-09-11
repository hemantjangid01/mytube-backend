import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, getVideoComments, removeComment, replyComment, updateComment } from "../controllers/comment.controllers.js";



const router=Router();

router.route("/addComment/:videoId").post(verifyJWT, addComment);
router.route("/removeComment/:commentId").delete(verifyJWT,removeComment);
router.route("/getVideoComments/:videoId").get(verifyJWT,getVideoComments);
router.route("/updateComment/:commentId").patch(verifyJWT,updateComment);
router.route("/replyComment/:commentId").post(verifyJWT,replyComment);







export default router;