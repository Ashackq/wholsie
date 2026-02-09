"use client";

import { useState } from "react";

interface Address {
    id?: string;
    _id?: string;
    name?: string;
    phone?: string;
    email?: string;
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
    onAddressCreated?: () => void;
}

export default function AddressModals({
    showListModal,
    setShowListModal,
    addresses,
    selectedAddress,
    onSelectAddress,
    onAddressCreated,
}: AddressModalsProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        isDefault: true,
    });

    const resetForm = () => {
        setFormData({
            name: "",
            phone: "",
            email: "",
            street: "",
            city: "",
            state: "",
            postalCode: "",
            isDefault: true,
        });
        setFormError("");
    };

    const handleCreateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
            const res = await fetch(`${API_URL}/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                resetForm();
                setShowCreateForm(false);
                // Refresh user data in localStorage
                const userRes = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData?.data) {
                        localStorage.setItem("user", JSON.stringify(userData.data));
                    }
                }
                if (onAddressCreated) {
                    onAddressCreated();
                }
            } else {
                setFormError(data.error || "Failed to add address");
            }
        } catch (err) {
            console.error("Error adding address:", err);
            setFormError("Failed to add address. Please try again.");
        } finally {
            setFormLoading(false);
        }
    };

    const formatAddress = (addr: Address) => {
        const parts = [];
        if (addr.name) parts.push(addr.name);
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
                            <h3 className="text-lg font-semibold">
                                {showCreateForm ? "Add New Address" : "Select Delivery Address"}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowListModal(false);
                                    setShowCreateForm(false);
                                    resetForm();
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {showCreateForm ? (
                                /* Create Address Form */
                                <form onSubmit={handleCreateAddress}>
                                    {formError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                            {formError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                            <input
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="10-digit mobile number"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="Your email address"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">This will also update your account email</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.street}
                                                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="House no., Building, Street, Area"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="State"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.postalCode}
                                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                placeholder="6-digit pincode"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCreateForm(false);
                                                resetForm();
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="flex-1 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                        >
                                            {formLoading ? "Saving..." : "Save Address"}
                                        </button>
                                    </div>
                                </form>
                            ) : addresses.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 mx-auto text-gray-300 mb-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                    </svg>
                                    <p className="text-gray-600 mb-2">No saved addresses found</p>
                                    <p className="text-sm text-gray-500 mb-4">Add your delivery address to continue</p>
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
                                    >
                                        + Add New Address
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="w-full mb-4 px-4 py-3 border-2 border-dashed border-orange-300 text-orange-600 font-medium rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add New Address
                                    </button>
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
                                                        {addr.phone && (
                                                            <p className="text-xs text-gray-500 mt-1 ml-7">Phone: {addr.phone}</p>
                                                        )}
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
                                </>
                            )}
                        </div>

                        {!showCreateForm && addresses.length > 0 && (
                            <div className="flex items-center justify-end p-4 border-t gap-3">
                                <button
                                    onClick={() => setShowListModal(false)}
                                    className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
