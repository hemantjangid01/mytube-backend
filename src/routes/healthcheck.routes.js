import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { healthcheck } from "../controllers/healthCheck.controllers.js";


const router=Router();
 

router.route("/healthCheck").get(healthcheck);


export default router
