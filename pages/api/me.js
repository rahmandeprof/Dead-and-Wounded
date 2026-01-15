import db from '../../lib/database';

export default async function handler(req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await db.userOps.findById(req.session.userId);
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
}
