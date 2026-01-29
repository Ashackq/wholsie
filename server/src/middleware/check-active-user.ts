import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';

/**
 * Middleware to check if the authenticated user is active
 * Must be used after verifyToken middleware
 */
export async function checkActiveUser(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const user = await User.findById(req.userId).select('status email');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                error: `Your account is ${user.status}. Please contact support.`,
            });
        }

        next();
    } catch (error) {
        console.error('Error checking user status:', error);
        res.status(500).json({
            error: 'Error checking user status',
        });
    }
}
