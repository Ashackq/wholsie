"use client";
import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../hooks/useAdminAuth";

type Settings = {
    autoShipmentEnabled: boolean;
    defaultPickupLocation?: string;
};

export default function AdminSettingsPage() {
    const { isAdmin, loading: authLoading, error: authError } = useAdminAuth();
    const [settings, setSettings] = useState<Settings>({
        autoShipmentEnabled: false,
        defaultPickupLocation: ""
    });
    const [pickupLocations, setPickupLocations] = useState<Array<{ name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        if (!isAdmin || authLoading) return;
        loadSettings();
        loadPickupLocations();
    }, [isAdmin, authLoading]);

    const loadPickupLocations = async () => {
        try {
            const res = await fetch(`${API}/delhivery/pickup-locations`, {
                credentials: "include",
            });
            if (res.ok) {
                const json = await res.json();
                setPickupLocations(json.data || []);
            }
        } catch (e: any) {
            console.error("Failed to load pickup locations:", e);
        }
    };

    const loadSettings = async () => {
        try {
            const res = await fetch(`${API}/admin/settings`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch settings");
            const json = await res.json();
            setSettings(json.data || { autoShipmentEnabled: false });
            setLoading(false);
        } catch (e: any) {
            setError(e?.message || "Failed to load settings");
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`${API}/admin/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(settings),
            });

            if (!res.ok) throw new Error("Failed to save settings");

            setSuccess("Settings saved successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (e: any) {
            setError(e?.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="admin-page-header">
                <h1>Loading...</h1>
            </div>
        );
    }

    if (authError || !isAdmin) {
        return (
            <div className="admin-page-header">
                <h1>Access Denied</h1>
                <p style={{ color: "red" }}>{authError || "You do not have admin privileges"}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-page-header">
                <h1>Loading...</h1>
            </div>
        );
    }

    return (
        <div>
            <div className="admin-page-header">
                <h1>Settings</h1>
                <p>Manage system configuration</p>
            </div>

            {error && (
                <div style={{ background: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 6, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{ background: "#dcfce7", color: "#166534", padding: 16, borderRadius: 8, marginBottom: 20 }}>
                    {success}
                </div>
            )}

            <div style={{ background: "var(--bg-2)", padding: 30, borderRadius: 8, maxWidth: 800 }}>
                <h3 style={{ marginBottom: 25, fontSize: 18, fontWeight: 600 }}>
                    <i className="fas fa-shipping-fast" style={{ marginRight: 10 }}></i>
                    Shipment Settings
                </h3>

                <div style={{
                    padding: 20,
                    background: "var(--bg-1)",
                    borderRadius: 8,
                    border: "1px solid var(--text-3)",
                    marginBottom: 20
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                                Automatic Shipment Creation
                            </h4>
                            <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14, lineHeight: 1.5 }}>
                                When enabled, shipments will be automatically created with Delhivery after successful payment.
                                When disabled, you must manually create shipments from the Orders page.
                            </p>
                        </div>
                        <label style={{
                            position: "relative",
                            display: "inline-block",
                            width: 60,
                            height: 34,
                            marginLeft: 20
                        }}>
                            <input
                                type="checkbox"
                                checked={settings.autoShipmentEnabled}
                                onChange={(e) => setSettings({ ...settings, autoShipmentEnabled: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: "absolute",
                                cursor: "pointer",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.autoShipmentEnabled ? "#059669" : "#ccc",
                                transition: ".4s",
                                borderRadius: 34,
                            }}>
                                <span style={{
                                    position: "absolute",
                                    content: "",
                                    height: 26,
                                    width: 26,
                                    left: settings.autoShipmentEnabled ? 30 : 4,
                                    bottom: 4,
                                    backgroundColor: "white",
                                    transition: ".4s",
                                    borderRadius: "50%",
                                }}></span>
                            </span>
                        </label>
                    </div>

                    <div style={{
                        marginTop: 15,
                        padding: 12,
                        background: settings.autoShipmentEnabled ? "#dcfce7" : "#fef3c7",
                        borderRadius: 6,
                        fontSize: 13
                    }}>
                        <i className={`fas fa-${settings.autoShipmentEnabled ? "check-circle" : "exclamation-triangle"}`} style={{ marginRight: 8 }}></i>
                        {settings.autoShipmentEnabled ? (
                            <span style={{ color: "#166534" }}>
                                <strong>Automatic mode:</strong> Shipments will be created automatically when payment is confirmed
                            </span>
                        ) : (
                            <span style={{ color: "#92400e" }}>
                                <strong>Manual mode:</strong> You need to manually create shipments from the Orders page
                            </span>
                        )}
                    </div>
                </div>

                <div style={{
                    padding: 20,
                    background: "var(--bg-1)",
                    borderRadius: 8,
                    border: "1px solid var(--text-3)",
                    marginBottom: 20
                }}>
                    <div>
                        <h4 style={{ marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                            Default Pickup Location
                        </h4>
                        <p style={{ margin: "0 0 15px 0", color: "var(--text-2)", fontSize: 14, lineHeight: 1.5 }}>
                            Select the warehouse/pickup location to use for shipments. Make sure this location is registered in your Delhivery account.
                        </p>
                        {pickupLocations.length > 0 ? (
                            <select
                                value={settings.defaultPickupLocation || ""}
                                onChange={(e) => setSettings({ ...settings, defaultPickupLocation: e.target.value })}
                                style={{
                                    padding: 10,
                                    border: "1px solid var(--text-3)",
                                    borderRadius: 6,
                                    width: "100%",
                                    fontSize: 14
                                }}
                            >
                                <option value="">Select pickup location...</option>
                                {pickupLocations.map((loc) => (
                                    <option key={loc.name} value={loc.name}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div style={{
                                padding: 12,
                                background: "#fef3c7",
                                color: "#92400e",
                                borderRadius: 6,
                                fontSize: 13
                            }}>
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>
                                No pickup locations found. Please register a warehouse in your Delhivery account.
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "12px 24px",
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: saving ? "not-allowed" : "pointer",
                        fontSize: 16,
                        fontWeight: 600,
                        opacity: saving ? 0.6 : 1,
                    }}
                >
                    {saving ? (
                        <>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                            Saving...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save" style={{ marginRight: 8 }}></i>
                            Save Settings
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
