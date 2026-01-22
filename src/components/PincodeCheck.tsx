'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface PincodeCheckProps {
    onServiceabilityCheck?: (serviceable: boolean, details?: any) => void;
}

export function PincodeCheck({ onServiceabilityCheck }: PincodeCheckProps) {
    const [pincode, setPincode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleCheck = async () => {
        if (!/^\d{6}$/.test(pincode)) {
            setError('Please enter a valid 6-digit pincode');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await api.checkPincodeServiceability(pincode);
            const data = response.data;

            if (data) {
                setResult(data);
                onServiceabilityCheck?.(data.serviceable, data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to check pincode');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pincode-check">
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter Pincode"
                    className="flex-1 px-4 py-2 border rounded-md"
                    maxLength={6}
                />
                <button
                    onClick={handleCheck}
                    disabled={loading || pincode.length !== 6}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Checking...' : 'Check'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <div className={`p-4 rounded-md border ${result.serviceable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {result.serviceable ? (
                        <>
                            <h3 className="font-semibold text-green-800 mb-2">✓ Delivery Available</h3>
                            <p className="text-green-700">
                                We deliver to {result.city}, {result.state}
                            </p>
                            <div className="mt-2 space-y-1 text-sm text-green-600">
                                <p>• Prepaid: {result.isPrepaid ? 'Available' : 'Not Available'}</p>
                                <p>• Cash on Delivery: {result.isCOD ? 'Available' : 'Not Available'}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="font-semibold text-red-800 mb-2">✗ Delivery Not Available</h3>
                            <p className="text-red-700">
                                {result.remark?.toLowerCase().includes('embargo')
                                    ? 'This area is temporarily under embargo. Delivery is currently not available.'
                                    : "Sorry, we don't deliver to this pincode yet."}
                            </p>
                            {result.city && result.state && (
                                <p className="text-sm text-red-600 mt-2">
                                    Location: {result.city}, {result.state}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
