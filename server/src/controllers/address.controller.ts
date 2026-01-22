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
        // Handle field mapping: street -> address, postalCode -> pincode
        const { 
            name, phone, // Added from payload but might not be in schema yet?
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

