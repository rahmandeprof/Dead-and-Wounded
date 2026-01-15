export default function handler(req, res) {
    req.session.destroy();
    res.json({ success: true });
}
