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

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    try {
        const existing = await db.userOps.findByUsername(username);
        if (existing) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.userOps.create(username, passwordHash);

        // Set session
        req.session.userId = result.lastInsertRowid;
        req.session.username = username;

        res.json({
            success: true,
            user: { id: result.lastInsertRowid, username }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}
