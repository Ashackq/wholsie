'use client';

import { useState, useEffect } from 'react';
import { api, type TrackingStatus } from '@/lib/api';

interface OrderTrackingProps {
    orderId: string;
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
    const [tracking, setTracking] = useState<TrackingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadTracking();
    }, [orderId]);

    const loadTracking = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.trackOrderShipment(orderId);
            if (response.data) {
                setTracking(response.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load tracking information');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading tracking information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
            </div>
        );
    }

    if (!tracking?.ShipmentData?.[0]) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                Tracking information not available yet. Your order will be shipped soon!
            </div>
        );
    }

    const shipment = tracking.ShipmentData[0].Shipment;
    const status = shipment.Status;
    const scans = shipment.ScanDetail?.Scan || [];

    const getStatusColor = (statusType: string) => {
        switch (statusType) {
            case 'DLV':
            case 'UD':
                return 'green';
            case 'RP':
            case 'IT':
                return 'blue';
            case 'CN':
                return 'red';
            default:
                return 'yellow';
        }
    };

    const statusColor = getStatusColor(status.StatusType);

    return (
        <div className="space-y-6">
            {/* Current Status */}
            <div className={`p-6 bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={`text-2xl font-bold text-${statusColor}-800 mb-2`}>
                            {status.Status}
                        </h3>
                        <p className={`text-${statusColor}-700 mb-1`}>
                            {status.StatusLocation}
                        </p>
                        <p className={`text-sm text-${statusColor}-600`}>
                            {new Date(status.StatusDateTime).toLocaleString()}
                        </p>
                        {status.Instructions && (
                            <p className={`mt-2 text-sm text-${statusColor}-600`}>
                                {status.Instructions}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Shipment Details */}
            <div className="bg-white border rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Shipment Details</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-600">Tracking Number</dt>
                        <dd className="font-mono font-semibold text-gray-900">{shipment.AWB}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">Order Number</dt>
                        <dd className="font-semibold text-gray-900">{shipment.OrderNo}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">From</dt>
                        <dd className="font-semibold text-gray-900">{shipment.Origin}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-600">To</dt>
                        <dd className="font-semibold text-gray-900">{shipment.Destination}</dd>
                    </div>
                </dl>
            </div>

            {/* Delivery Address */}
            <div className="bg-white border rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Delivery Address</h4>
                <div className="text-sm text-gray-700">
                    <p className="font-medium">{shipment.Consignee.Name}</p>
                    <p>{shipment.Consignee.Address}</p>
                    <p>
                        {shipment.Consignee.City}, {shipment.Consignee.State} - {shipment.Consignee.Pincode}
                    </p>
                </div>
            </div>

            {/* Tracking History */}
            {scans.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Tracking History</h4>
                    <div className="space-y-4">
                        {scans.map((scan, index) => (
                            <div key={index} className="flex items-start border-l-2 border-gray-300 pl-4 pb-4 last:pb-0">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{scan.Scan}</p>
                                    <p className="text-sm text-gray-600">{scan.ScannedLocation}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(scan.ScanDateTime).toLocaleString()}
                                    </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded bg-gray-100 text-gray-700`}>
                                    {scan.ScanType}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
