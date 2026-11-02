
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import { user } from "../models/user.model.js";

export const verifyJWT = asynchandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const currentUser = await user
      .findById(decodedToken?._id)
      .select("-password -refreshToken");

    if (!currentUser) {
      throw new ApiError(401, "Invalid access token");
    }

    // Reject tokens issued before the user's tokenVersion changed.
    if (
      decodedToken.tokenVersion !==
      (currentUser.tokenVersion ?? 0)
    ) {
      throw new ApiError(
        401,
        "Session expired. Please login again."
      );
    }

    req.user = currentUser;
    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "Invalid access token"
    );
  }
});
