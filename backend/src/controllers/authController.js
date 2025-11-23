import bcrypt from 'bcrypt';
import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

const ACCESS_TOKEN_TTL = '30m'; // 15 minutes
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;

        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        //check if user exists
        const duplicate = await User.findOne({ username });

        if (duplicate) {
            return res.status(409).json({ message: "Username already exists" });
        }

        //hash password
        const hashPassword = await bcrypt.hash(password, 10); // salt = 10

        //create new user
        await User.create({
            username,
            hashPassword,
            email,
            displayName: `${lastName} ${firstName}`,
        });

        //return
        return res.sendStatus(204);

    } catch (error) {
        console.error('signUp error', error);
        return res.status(500).json({ message: "Internal server error" });

    }
}

export const signIn = async (req, res) => {
    try {
        //get data from req body
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        //get hash password from db
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: "username or password is incorrect" });
        }

        const passwordCorrect = await bcrypt.compare(password, user.hashPassword);

        if (!passwordCorrect) {
            return res.status(401).json({ message: "username or password is incorrect" });
        }

        //create a jwt token
        const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

        //refresh token 
        const requestToken = crypto.randomBytes(64).toString('hex');

        //create new session to save refresh token
        await Session.create({
            userId: user._id,
            refreshToken: requestToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        //return refresh token in cookie
        res.cookie('refreshToken', requestToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL,
        });

        //return jwt token in response body
        return res.status(200).json({ message: `User ${user.displayName} signed in successfully`, accessToken });
    } catch (error) {
        console.error('signIn error', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const signOut = async (req, res) => {
    try {
        //get refresh token from cookie
        const token = req.cookies?.refreshToken;

        //remove refresh token in Session
        if (token) {
            await Session.deleteOne({ refreshToken: token });
            //clear cookie
            res.clearCookie('refreshToken');
        }
        return res.sendStatus(204);
    } catch (error) {
        console.error('signOut error', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

//create access token using refresh token
export const refreshToken = async (req, res) => {
    try {
        //get refresh token from cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Token is not available" });
        }
        //compare refresh token in db
        const session = await Session.findOne({ refreshToken: token });

        if (!session) {
            return res.status(403).json({ message: "Invalid token or expire" })
        }

        //check expires
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Token has expired" })
        }
        //create new access token
        const accessToken = jwt.sign({
            userId: session.userId
        }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

        //return
        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error("refreshToken error", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}