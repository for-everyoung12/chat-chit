import bcrypt from 'bcrypt';

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
            displayName: `${firstName} ${lastName}`,
        });

        //return
        return res.sendStatus(204);

    } catch (error) {
        console.error('signUp error', error);
        return res.status(500).json({ message: "Internal server error" });

    }
}