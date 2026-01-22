"use client";

import { useState } from "react";

interface Address {
    id?: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    is_delivery?: string;
    isDefault?: boolean;
}

interface AddressModalsProps {
    showListModal: boolean;
    setShowListModal: (show: boolean) => void;
    showCreateModal?: boolean;
    setShowCreateModal?: (show: boolean) => void;
    addresses: Address[];
    selectedAddress: Address | null;
    onSelectAddress: (address: Address) => void;
}

export default function AddressModals({
    showListModal,
    setShowListModal,
    addresses,
    selectedAddress,
    onSelectAddress,
}: AddressModalsProps) {
    const formatAddress = (addr: Address) => {
        const parts = [];
        if (addr.street) parts.push(addr.street);
        if (addr.landmark) parts.push(addr.landmark);
        if (addr.city) parts.push(addr.city);
        if (addr.state) parts.push(addr.state);
        if (addr.pincode) parts.push(addr.pincode);
        return parts.join(", ");
    };

    return (
        <>
            {/* List Address Modal */}
            {showListModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Select Delivery Address</h3>
                            <button
                                onClick={() => setShowListModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {addresses.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">No saved addresses found</p>
                                    <p className="text-sm text-gray-500">Go to your profile to add addresses</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {addresses.map((addr, idx) => {
                                        const addrId = addr.id || (addr as any)._id || `${addr.street}-${addr.pincode}-${idx}`;
                                        const selectedId = selectedAddress?.id || (selectedAddress as any)?._id;
                                        const isDefault = addr.is_delivery === "y" || addr.isDefault;
                                        return (
                                            <label
                                                key={addrId}
                                                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedId === addrId
                                                    ? "border-orange-500 bg-orange-50"
                                                    : "border-gray-200 hover:border-orange-300"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="address"
                                                    checked={selectedId === addrId}
                                                    onChange={() => {
                                                        onSelectAddress(addr);
                                                        setShowListModal(false);
                                                    }}
                                                    className="mt-1 w-4 h-4 text-orange-600 flex-shrink-0"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                                        </svg>
                                                        <p className="text-sm text-gray-700">{formatAddress(addr)}</p>
                                                    </div>
                                                    {isDefault && (
                                                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end p-4 border-t gap-3">
                            <button
                                onClick={() => setShowListModal(false)}
                                className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
