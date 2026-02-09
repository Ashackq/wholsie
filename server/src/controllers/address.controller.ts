import { Request, Response, NextFunction } from 'express';
import { Address } from '../models/Address.js';
import { User } from '../models/User.js';

/**
 * Helper to update user profile when adding/updating address with name and email
 * Only updates if the current values are dummy/temp values
 */
async function syncUserProfile(userId: string, name?: string, email?: string) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        const updateData: any = { updatedAt: new Date() };

        // Update name if provided and different from current
        if (name && name.trim()) {
            const currentName = (user as any).name || `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim();
            if (name.trim() !== currentName.trim()) {
                const nameParts = name.trim().split(/\s+/);
                updateData.firstName = nameParts[0] || "";
                updateData.lastName = nameParts.slice(1).join(" ") || "";
                updateData.name = name;
            }
        }

        // Update email if provided and current email is temp ({phone}@temp.com pattern)
        if (email && email.trim()) {
            const currentEmail = (user as any).email;
            const isTempEmail = currentEmail && (
                currentEmail.includes('@temp.com') ||
                currentEmail.includes('phonenumber@') ||
                currentEmail === 'N/A'
            );

            if (isTempEmail) {
                // Check if email is already used by another user
                const existingUser = await User.findOne({
                    email: email.toLowerCase(),
                    _id: { $ne: userId }
                });

                if (!existingUser) {
                    updateData.email = email.toLowerCase();
                }
            }
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 1) {
            await User.findByIdAndUpdate(userId, { $set: updateData });
        }
    } catch (error) {
        console.error('Error syncing user profile:', error);
        // Don't throw - this is a silent helper
    }
}

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
        // Handle field mapping: street -> address, postalCode -> pincode
        const {
            name, phone, email, // Personal info that may also update user profile
            address, street,
            addressLine2, address2,
            city,
            state,
            pincode, postalCode,
            landmark,
            latitude,
            longitude,
            isDefault
        } = req.body;

        const streetAddress = address || street;
        const zipCode = pincode || postalCode;

        if (!streetAddress || !zipCode) {
            return res.status(400).json({ error: "Address (street) and Pincode (postalCode) are required" });
        }

        // If setting as default, unset others
        if (isDefault) {
            await Address.updateMany(
                { userId },
                { $set: { isDefault: false } }
            );
        }

        const newAddress = new Address({
            userId,
            name: name || "",
            phone: phone || "",
            address: streetAddress,
            address2: address2 || addressLine2 || "",
            city,
            state,
            pincode: zipCode,
            landmark,
            latitude,
            longitude,
            isDefault: !!isDefault
        });

        await newAddress.save();

        // Sync user profile with name and email from address if they are dummy values
        await syncUserProfile(userId, name, email);

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
        const {
            isDefault,
            // Handle field mapping: street -> address, postalCode -> pincode
            address, street,
            address2, addressLine2,
            city,
            state,
            pincode, postalCode,
            landmark,
            name,
            phone,
            email, // For syncing with user profile
            latitude,
            longitude
        } = req.body;

        // If setting as default, unset others
        if (isDefault) {
            await Address.updateMany(
                { userId, _id: { $ne: addressId } },
                { $set: { isDefault: false } }
            );
        }

        // Build update object with field mapping
        const updateFields: any = {
            isDefault: !!isDefault,
            updatedAt: new Date()
        };

        if (address || street) updateFields.address = address || street;
        if (address2 !== undefined || addressLine2 !== undefined) updateFields.address2 = address2 || addressLine2 || "";
        if (city) updateFields.city = city;
        if (state) updateFields.state = state;
        if (pincode || postalCode) updateFields.pincode = pincode || postalCode;
        if (landmark !== undefined) updateFields.landmark = landmark;
        if (name !== undefined) updateFields.name = name;
        if (phone !== undefined) updateFields.phone = phone;
        if (latitude !== undefined) updateFields.latitude = latitude;
        if (longitude !== undefined) updateFields.longitude = longitude;

        const updatedAddress = await Address.findOneAndUpdate(
            { _id: addressId, userId },
            updateFields,
            { new: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Sync user profile with name and email from address if they are dummy values
        await syncUserProfile(userId, name, email);

        res.json({
            success: true,
            message: 'Address updated',
            data: updatedAddress
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

