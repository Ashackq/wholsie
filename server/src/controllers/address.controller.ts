import { Request, Response, NextFunction } from 'express';
import { Address } from '../models/Address.js';

/**
 * Get all user addresses
 */
export async function getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;

        const addresses = await Address
            .find({ userId })
            .sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: addresses
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add new address
 */
export async function addAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { address, address2, city, state, pincode, landmark, latitude, longitude, isDefault } = req.body;

        // If setting as default, unset others
        if (isDefault) {
            await Address.updateMany(
                { userId },
                { $set: { isDefault: false } }
            );
        }

        const newAddress = new Address({
            userId,
            address,
            address2,
            city,
            state,
            pincode,
            landmark,
            latitude,
            longitude,
            isDefault: !!isDefault
        });

        await newAddress.save();

        res.status(201).json({
            success: true,
            message: 'Address added',
            data: { addressId: newAddress._id }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update address
 */
export async function updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { addressId } = req.params;
        const { isDefault, ...updateData } = req.body;

        // If setting as default, unset others
        if (isDefault) {
            await Address.updateMany(
                { userId, _id: { $ne: addressId } },
                { $set: { isDefault: false } }
            );
        }

        const address = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            { ...updateData, isDefault: !!isDefault, updatedAt: new Date() },
            { new: true }
        );

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        res.json({
            success: true,
            message: 'Address updated',
            data: address
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete address
 */
export async function deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.userId!;
        const { addressId } = req.params;

        const address = await Address.findOneAndDelete({
            _id: addressId,
            userId
        });

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        res.json({
            success: true,
            message: 'Address deleted'
        });
    } catch (error) {
        next(error);
    }
}

