"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getOrders, updateProfile } from "@/lib/api";
import ProfileSidebar from "@/components/ProfileSidebar";

interface User {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  phone: string;
  role?: string;
  wallet?: number;
}

interface Order {
  _id: string;
  orderId: string;
  orderNo?: string;
  total?: number;
  netAmount?: number;
  totalPrice?: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  orderDate?: string;
  invoiceUrl?: string;
  invoiceId?: any;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const cacheUser = (u: User | null) => {
    if (!u) return;
    setUser(u);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(u));
    }
  };

  // Check if it's first-time email setup (phone is in email)
  const isFirstEmailSetup = (userEmail: string, userPhone: string) => {
    return userEmail === `${userPhone}@temp.com`;
  };

  useEffect(() => {
    const cachedUserRaw = localStorage.getItem("user");
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw) as User;
        if (cachedUser) {
          cacheUser(cachedUser);
          setName(cachedUser.name || "");
          setEmail(cachedUser.email || "");
        }
      } catch {
        // Ignore invalid cache
      }
    }
    // Check for profile completion message from checkout/cart
    const savedMessage = localStorage.getItem("profileMessage");
    if (savedMessage) {
      setProfileMessage(savedMessage);
      localStorage.removeItem("profileMessage");
      // Auto-enable form editing if needed
      const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (
        !cachedUser.name ||
        cachedUser.name === "N/A" ||
        cachedUser.name.toLowerCase?.().includes("user")
      ) {
        setIsEditingName(true);
      }
      if (!cachedUser.email || cachedUser.email === "N/A") {
        setIsEditingEmail(true);
      }
    }
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      const resolvedUser = (userData.data || userData) as User | null;
      if (resolvedUser) {
        cacheUser(resolvedUser);
        setName(resolvedUser.name || "");
        setEmail(resolvedUser.email || "");
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
      const cachedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");
      if (!cachedUser && !token) {
        router.push("/login");
      }
    }

    try {
      const ordersData = await getOrders();
      const ordersArray = ordersData.data || ordersData || [];
      // Sort orders by date, most recent first
      const sortedOrders = Array.isArray(ordersArray)
        ? ordersArray.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        : [];
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    try {
      setUpdateMessage("");
      await updateProfile({ name });
      const updatedUser = { ...(user as User), name };
      cacheUser(updatedUser);
      setUpdateMessage("Name updated successfully!");
      setIsEditingName(false);
      await loadUserData();
      setTimeout(() => setUpdateMessage(""), 3000);
    } catch (err) {
      console.error("Failed to update name:", err);
      setUpdateMessage("Failed to update name. Please try again.");
    }
  };

  const handleUpdateEmail = async () => {
    if (!email || email.trim() === "") {
      setUpdateMessage("Email cannot be empty.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setUpdateMessage("Please enter a valid email address.");
      return;
    }

    try {
      setUpdateMessage("");
      await updateProfile({ email });
      const updatedUser = { ...(user as User), email };
      cacheUser(updatedUser);
      setUpdateMessage("Email updated successfully!");
      setIsEditingEmail(false);
      await loadUserData();
      setTimeout(() => setUpdateMessage(""), 3000);
    } catch (err: any) {
      console.error("Failed to update email:", err);
      setUpdateMessage(
        err?.message || "Failed to update email. Please try again.",
      );
    }
  };

  const handleCancelEdit = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setIsEditingName(false);
    setIsEditingEmail(false);
    setUpdateMessage("");
  };

  if (loading) {
    return (
      <section className="mt_55 mb_100">
        <div className="container">
          <p>Loading your profile...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <section
        className="page_banner"
        style={{ background: "url('/assets/images/bannerOther.jpg')" }}
      >
        <div className="page_banner_overlay">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="page_banner_text wow fadeInUp">
                  <h1>My Profile</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard mb_50 mt_55">
        <div className="container">
          <div className="row">
            {/* Sidebar Navigation */}
            <div className="col-lg-3 wow fadeInUp">
              <ProfileSidebar user={user} />
            </div>

            {/* Main Content */}
            <div className="col-lg-9">
              <div className="dashboard_content">
                <h3 className="dashboard_title">Overview</h3>

                {/* Profile Completion Alert */}
                {profileMessage && (
                  <div
                    className="alert alert-warning"
                    role="alert"
                    style={{ marginBottom: "20px" }}
                  >
                    <strong>⚠️ Action Required:</strong> {profileMessage}
                  </div>
                )}

                {/* Personal Information Card */}
                <div className="dashboard_content_item">
                  <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap">
                    <h4 style={{ marginBottom: "0" }}>Personal Information</h4>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      {!isEditingName && !isEditingEmail && (
                        <>
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="common_btn"
                            style={{ padding: "8px 20px", fontSize: "14px" }}
                          >
                            <i className="fas fa-edit"></i> Edit Name
                          </button>
                          {isFirstEmailSetup(user.email, user.phone) && (
                            <button
                              onClick={() => setIsEditingEmail(true)}
                              className="common_btn"
                              style={{
                                padding: "8px 20px",
                                fontSize: "14px",
                                backgroundColor: "#ff6b6b",
                              }}
                            >
                              <i className="fas fa-envelope"></i> Set Email
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {updateMessage && (
                    <div
                      style={{
                        padding: "10px 15px",
                        marginBottom: "15px",
                        borderRadius: "5px",
                        backgroundColor: updateMessage.includes("success")
                          ? "#d4edda"
                          : "#f8d7da",
                        color: updateMessage.includes("success")
                          ? "#155724"
                          : "#721c24",
                        border: `1px solid ${updateMessage.includes("success") ? "#c3e6cb" : "#f5c6cb"}`,
                      }}
                    >
                      {updateMessage}
                    </div>
                  )}
                  <div className="row mt-4">
                    <div className="col-md-6 mb-3">
                      <strong>Full Name:</strong>
                      {isEditingName ? (
                        <input
                          type="text"
                          className="form-control mt-2"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter full name"
                        />
                      ) : (
                        <p style={{ marginTop: "8px", marginBottom: "0" }}>
                          {user.name}
                        </p>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>
                        Email:
                        {isFirstEmailSetup(user.email, user.phone) && (
                          <span
                            style={{
                              fontSize: "12px",
                              marginLeft: "8px",
                              color: "#ff6b6b",
                              fontWeight: "normal",
                            }}
                          >
                            ⚠️ First time setup
                          </span>
                        )}
                      </strong>
                      {isEditingEmail ? (
                        <input
                          type="email"
                          className="form-control mt-2"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      ) : (
                        <p style={{ marginTop: "8px", marginBottom: "0" }}>
                          {user.email}
                        </p>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Phone:</strong>
                      <p style={{ marginTop: "8px", marginBottom: "0" }}>
                        {user.phone || "Not provided"}
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Account Type:</strong>
                      <p
                        style={{
                          marginTop: "8px",
                          marginBottom: "0",
                          textTransform: "capitalize",
                        }}
                      >
                        {user.role}
                      </p>
                    </div>
                    {(isEditingName || isEditingEmail) && (
                      <div
                        className="col-12 mb-3"
                        style={{ paddingTop: "10px" }}
                      >
                        <button
                          onClick={
                            isEditingName ? handleUpdateName : handleUpdateEmail
                          }
                          className="common_btn me-2"
                          style={{ padding: "8px 20px", fontSize: "14px" }}
                        >
                          <i className="fas fa-save"></i> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="common_btn"
                          style={{
                            padding: "8px 20px",
                            fontSize: "14px",
                            backgroundColor: "#6c757d",
                          }}
                        >
                          <i className="fas fa-times"></i> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap">
                  <h4 style={{ marginBottom: "0" }}>Recent Orders</h4>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setOrdersLoading(true);
                        loadUserData().then(() => setOrdersLoading(false));
                      }}
                      className="common_btn"
                      style={{ padding: "8px 20px", fontSize: "14px" }}
                      disabled={ordersLoading}
                    >
                      <i
                        className="fas fa-sync-alt"
                        style={{
                          animation: ordersLoading
                            ? "spin 1s linear infinite"
                            : "none",
                        }}
                      ></i>{" "}
                      Refresh
                    </button>
                    <Link
                      href="/orders"
                      className="common_btn"
                      style={{ padding: "8px 20px", fontSize: "14px" }}
                    >
                      View All
                    </Link>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                    }}
                  >
                    <i
                      className="fas fa-box-open"
                      style={{
                        fontSize: "48px",
                        color: "#ccc",
                        marginBottom: "15px",
                      }}
                    ></i>
                    <p style={{ color: "#666", marginBottom: "15px" }}>
                      No orders yet
                    </p>
                    <Link href="/products" className="common_btn">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Invoice</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 2).map((order) => {
                          const statusNum =
                            typeof order.status === "number"
                              ? order.status
                              : parseInt(order.status as string);
                          const displayStatus =
                            statusNum === 6
                              ? "delivered"
                              : order.status === "cancelled"
                                ? "cancelled"
                                : order.status === "shipped"
                                  ? "shipped"
                                  : order.status === "processing"
                                    ? "processing"
                                    : "pending";
                          const totalAmount =
                            order.total ||
                            order.netAmount ||
                            order.totalPrice ||
                            0;

                          return (
                            <tr key={order._id}>
                              <td style={{ verticalAlign: "middle" }}>
                                <strong>
                                  #
                                  {order.orderId ||
                                    order.orderNo ||
                                    order._id.slice(-8)}
                                </strong>
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                {order.createdAt
                                  ? new Date(
                                    order.createdAt,
                                  ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                {order.items?.length || 0} item(s)
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <strong>
                                  ₹
                                  {typeof totalAmount === "number"
                                    ? totalAmount.toFixed(2)
                                    : "N/A"}
                                </strong>
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                {(order as any).invoiceUrl ? (
                                  <a
                                    href={(order as any).invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      padding: "5px 12px",
                                      fontSize: "11px",
                                      textDecoration: "none",
                                      display: "inline-block",
                                      verticalAlign: "middle",
                                      borderRadius: "20px",
                                      backgroundColor: "#FF6600",
                                      color: "white",
                                      transition: "all 0.3s ease",
                                    }}
                                    title="Download Invoice PDF"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#E55B00";
                                      e.currentTarget.style.transform =
                                        "translateY(-2px)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#FF6600";
                                      e.currentTarget.style.transform =
                                        "translateY(0)";
                                    }}
                                  >
                                    Invoice
                                  </a>
                                ) : (
                                  <span
                                    style={{ color: "#999", fontSize: "11px" }}
                                  >
                                    N/A
                                  </span>
                                )}
                              </td>
                              <td style={{ verticalAlign: "middle" }}>
                                <Link
                                  href={`/orders/${order._id}`}
                                  style={{
                                    padding: "5px 16px",
                                    fontSize: "11px",
                                    display: "inline-block",
                                    verticalAlign: "middle",
                                    textDecoration: "none",
                                    borderRadius: "20px",
                                    backgroundColor: "#781414",
                                    color: "white",
                                    transition: "all 0.3s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#5a0f0f";
                                    e.currentTarget.style.transform =
                                      "translateY(-2px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#781414";
                                    e.currentTarget.style.transform =
                                      "translateY(0)";
                                  }}
                                >
                                  View
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="dashboard_content_item mt-5">
                <h4 style={{ marginBottom: "20px" }}>Quick Actions</h4>
                <div className="row g-3">
                  <div className="col-md-4">
                    <Link
                      href="/profile/addresses"
                      className="common_btn w-100 text-center"
                      style={{ display: "block", padding: "12px 20px" }}
                    >
                      <i className="fas fa-map-marker-alt"></i> Manage Addresses
                    </Link>
                  </div>
                  <div className="col-md-4">
                    <Link
                      href="/products"
                      className="common_btn w-100 text-center"
                      style={{
                        display: "block",
                        padding: "12px 20px",
                        backgroundColor: "#6c757d",
                      }}
                    >
                      <i className="fas fa-shopping-bag"></i> Continue Shopping
                    </Link>
                  </div>
                  <div className="col-md-4">
                    <Link
                      href="/cart"
                      className="common_btn w-100 text-center"
                      style={{
                        display: "block",
                        padding: "12px 20px",
                        backgroundColor: "#17a2b8",
                      }}
                    >
                      <i className="fas fa-shopping-cart"></i> View Cart
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
