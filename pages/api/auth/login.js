import db from '../../../lib/database';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const user = await db.userOps.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        // Determine wins/losses if not present (backward compatibility)
        const userData = {
            id: user.id,
            username: user.username,
            wins: user.wins || 0,
            losses: user.losses || 0
        };

        res.json({ success: true, user: userData });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}
