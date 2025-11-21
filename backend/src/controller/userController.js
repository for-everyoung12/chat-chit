
export const authMe = async (req, res) => {
    try {
        const user = req.user; //get from authMiddleware

        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error when calling authMe.', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}