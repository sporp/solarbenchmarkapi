import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    user_id: Number,
    username: String,
    api_key: String
});

export const User = mongoose.model("User", userSchema);