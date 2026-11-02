import { Router } from "express";
import { addToWatchHistory, changePassword, clearWatchHistory, forgotPassword, getCurrentuser, getUserChannelProfile,
     getWatchHistory, loginUser, logOutUser, refreshAccessToken,
      registerUser, resetPassword, updateAccountdetails, updateUserAvatar, 
      updateUserCoverImage } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { rateLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

  const authLimiter = rateLimiter({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  keyPrefix: "auth",
});

const otpLimiter = rateLimiter({
  windowSeconds: 15 * 60,
  maxRequests: 5,
  keyPrefix: "otp",
});

    
router.route("/register").post(
    authLimiter,

    upload.fields([

        {
            name: "avatar",
            maxCount: 1


        },
        {
            name: "coverimage",
            maxCount: 1
        }


    ]),
    registerUser)

router.route("/login").post(authLimiter,loginUser)
router.route("/logout").post(verifyJWT, logOutUser)
router.route("/refresh_token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/current-user").get(verifyJWT, getCurrentuser);
router.route("/update-account").patch(verifyJWT, updateAccountdetails);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(verifyJWT, upload.single("coverimage"), updateUserCoverImage);
router.route("/history").get(verifyJWT, getWatchHistory);
router.route("/addToWatchHistory/:videoId").post(verifyJWT,addToWatchHistory);
router.route("/clearWatchHistory").delete(verifyJWT,clearWatchHistory);
router.route("/getWatchHistory").get(verifyJWT,getWatchHistory);
router.route("/:username").get(verifyJWT, getUserChannelProfile);
router.route("/forgot-password").post(otpLimiter,forgotPassword);
router.route("/reset-password").post(otpLimiter,resetPassword);


    


export default router