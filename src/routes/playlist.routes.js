import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controllers.js";


const router=Router();

router.route("/createPlaylist").post(verifyJWT,createPlaylist);
router.route("/getUserPlaylists").get(verifyJWT,getUserPlaylists);
router.route("/getPlaylistById/:playlistId").get(verifyJWT,getPlaylistById);
router.route("/addVideoToPlaylist/:playlistId/:videoId").post(verifyJWT, addVideoToPlaylist);
router.route("/updatePlaylist/:playlistId").patch(verifyJWT,updatePlaylist);
router.route("/removeVideoFromPlaylist/:playlistId/:videoId").delete(verifyJWT,removeVideoFromPlaylist);
router.route("/deletePlaylist/:playlistId").delete(verifyJWT,deletePlaylist);








export default router;