import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { Address } from '../models/Address.js';

// Get all users (paginated)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const offset = parseInt(req.query.offset as string) || 0;
        const limit = parseInt(req.query.limit as string) || 10;

        const users = await User.find()
            .select('-password')
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        // Normalize name fields: many users are created with a single `name` field
        // (older auth routes). Provide a `displayName` and ensure first/last name
        // fallbacks so the admin UI shows a name.
        const mapped = users.map((u) => {
            const obj: any = typeof u.toObject === 'function' ? u.toObject() : u;
            const hasFirstLast = (obj.firstName && obj.firstName.trim()) || (obj.lastName && obj.lastName.trim());
            if (!hasFirstLast && obj.name && typeof obj.name === 'string') {
                const parts = obj.name.trim().split(/\s+/);
                obj.firstName = parts.slice(0, -1).join(' ') || parts[0] || '';
                obj.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
            }
            obj.displayName = [obj.firstName, obj.lastName].filter(Boolean).join(' ') || obj.name || obj.email || '';
            return obj;
        });

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json({
            success: true,
            data: mapped,
            pagination: {
                offset,
                limit,
                total,
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get single user details
export const getUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const obj: any = typeof (user as any).toObject === 'function' ? (user as any).toObject() : user;
        const hasFirstLast = (obj.firstName && obj.firstName.trim()) || (obj.lastName && obj.lastName.trim());
        if (!hasFirstLast && obj.name && typeof obj.name === 'string') {
            const parts = obj.name.trim().split(/\s+/);
            obj.firstName = parts.slice(0, -1).join(' ') || parts[0] || '';
            obj.lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        }
        obj.displayName = [obj.firstName, obj.lastName].filter(Boolean).join(' ') || obj.name || obj.email || '';

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json({
            success: true,
            data: obj,
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get user's cart
export const getUserCart = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.findOne({ userId }).populate('items.productId');

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        if (!cart) {
            return res.json({
                success: true,
                data: {
                    userId,
                    items: [],
                    subtotal: 0,
                    total: 0,
                },
            });
        }

        res.json({
            success: true,
            data: cart,
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get user's orders
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const orders = await Order.find({ userId })
            .populate('items.productId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: orders,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Get user's addresses
export const getUserAddresses = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: addresses,
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching addresses',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

// Update user status (admin only)
export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        // Validate status value
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: active, inactive, suspended',
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { status, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.json({
            success: true,
            message: `User status updated to ${status}`,
            data: user,
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user status',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
