"use client";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ManualBooking() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pickupPincode: "",
    dropPincode: "",
    serviceType: "surface",
    actualWeight: "",
    weightUnit: "kg",
    goodsDescription: "",
    goodsValue: "",
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderAddress: "",
    senderCity: "",
    senderState: "",
    senderLandmark: "",
    receiverName: "",
    receiverPhone: "",
    receiverEmail: "",
    receiverAddress: "",
    receiverCity: "",
    receiverState: "",
    receiverLandmark: "",
    bookingId: "EP", // Admin must fill this
    deliveryStatus: "confirmed",
    ETD: "",
    length: "",
    width: "",
    height: "",
    boxQuantity: "",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Validate numeric fields
  const numericFields = [
    "actualWeight",
    
    
    
  ];

  for (const field of numericFields) {
    if (isNaN(formData[field]) || formData[field] === "") {
      toast.error(`Please enter valid value for ${field}`);
      return;
    }
  }

  if (!formData.bookingId) {
    toast.error("Booking ID is required and must be filled by admin!");
    return;
  }
// ------------------- Pricing Calculation -------------------

let pricing = {};
const PER_KG_PRICE = 100;
const GST_RATE = 0.18;
const PACKAGING_RATE = 0.08;

const weight = parseFloat(formData.actualWeight) || 0;
const hasGoodsValue =
  formData.goodsValue !== "" && Number(formData.goodsValue) > 0;

const goodsValue = hasGoodsValue ? Number(formData.goodsValue) : null;



if (goodsValue > 0) {
  pricing = {
    basePrice: goodsValue,
    packagingCharge: 0,
    tax: 0,
    totalAmount: goodsValue,
    pricingMode: "MANUAL",
  };
} else if (weight > 0) {
  const basePrice = weight * PER_KG_PRICE;
  const packagingCharge = +(basePrice * PACKAGING_RATE).toFixed(2);
  const subtotal = basePrice + packagingCharge;
  const tax = +(subtotal * GST_RATE).toFixed(2);
  const totalAmount = +(subtotal + tax).toFixed(2);

  pricing = {
    basePrice: +basePrice.toFixed(2),
    packagingCharge,
    tax,
    totalAmount,
    pricingMode: "AUTO_WEIGHT",
  };
} else {
  toast.error("Either weight or goods value must be provided");
  return;
}


  // 🔥 1️⃣ UPPERCASE BOOKING ID
  const BOOKING_ID = formData.bookingId.toUpperCase();

  // 🔥 2️⃣ Clean payload (NO SELF-REFERENCE ERROR)
  const payload = {
    bookingId: BOOKING_ID,
    serviceType: formData.serviceType,
    pickupPincode: formData.pickupPincode,
    deliveryPincode: formData.dropPincode,
    pickupDate: new Date().toISOString().split("T")[0],
    pickupSlot: "10AM-12PM",
    deliveryDate: new Date(Date.now() + 4 * 86400000)
      .toISOString()
      .split("T")[0],
    estimatedDelivery: new Date(Date.now() + 4 * 86400000)
      .toISOString()
      .split("T")[0],
    currentLocation: "Admin Panel",
    parcelImage: "https://via.placeholder.com/150",
    couponCode: "",
    couponDiscount: 0,
    insuranceRequired: true,
    paymentStatus: "pending",
    paymentMethod: "COD",
    notes: formData.notes || "Manual booking created by admin",
    status: formData.deliveryStatus,

    senderDetails: {
      name: formData.senderName,
      phone: formData.senderPhone,
      email: formData.senderEmail,
      address: formData.senderAddress,
      pincode: formData.pickupPincode,
      city: formData.senderCity,
      state: formData.senderState,
      landmark: formData.senderLandmark,
    },

    receiverDetails: {
      name: formData.receiverName,
      phone: formData.receiverPhone,
      email: formData.receiverEmail,
      address: formData.receiverAddress,
      pincode: formData.dropPincode,
      city: formData.receiverCity,
      state: formData.receiverState,
      landmark: formData.receiverLandmark,
    },

    packageDetails: {
    
    weight: weight,
    weightUnit: formData.weightUnit,
    volumetricWeight: weight,
    dimensions: {
      length: parseInt(formData.length),
      width: parseInt(formData.width),
      height: parseInt(formData.height),
    },
    boxQuantity: parseInt(formData.boxQuantity),
    description: formData.goodsDescription,
    value: goodsValue || 0,
    fragile: false,
 
   pricing, 
    },

    
  };
    console.log("📦 Booking Payload:", payload);

  try {
    // 3️⃣ Save booking
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manual-bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      if (errorData.message?.includes("duplicate key")) {
        toast.error(`Booking ID "${BOOKING_ID}" already exists!`);
      } else {
        toast.error(errorData.message || "Booking failed.");
      }
      return;
    }

    const data = await res.json();
    console.log("✅ Booking created:", data);

    toast.success("Booking created successfully!");
    setStep(3); // move to step 4 AFTER booking is saved

    // 4️⃣ Send emails asynchronously (AFTER step change)
    const emails = [];
    if (formData.senderEmail) emails.push(formData.senderEmail);
    if (
      formData.receiverEmail &&
      formData.receiverEmail !== formData.senderEmail
    )
      emails.push(formData.receiverEmail);

    emails.forEach(async (email) => {
      try {
       await fetch(`${import.meta.env.VITE_API_URL}/api/manual-bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              bookingId: BOOKING_ID,
            }),
          }
        );
        console.log(`📩 Email sent to ${email}`);
      } catch (err) {
        console.error(`❌ Email failed: ${email}`, err);
      }
    });
  } catch (err) {
    console.error("❌ Submit error:", err);
    toast.error("Something went wrong while submitting booking.");
  }
};





  const resetForm = () => {
    setFormData({
      pickupPincode: "",
      dropPincode: "",
      serviceType: "surface",
      actualWeight: "",
      weightUnit: "kg",
      goodsDescription: "",
      goodsValue: "",
      senderName: "",
      senderPhone: "",
      senderEmail: "",
      senderAddress: "",
      senderCity: "",
      senderState: "",
      senderLandmark: "",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverAddress: "",
      receiverCity: "",
      receiverState: "",
      receiverLandmark: "",
      bookingId: "",
      deliveryStatus: "confirmed",
      ETD: "",
      length: "",
      width: "",
      height: "",
      boxQuantity: "",
      notes: "",
    });
    setStep(1);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manual Booking (Admin Only)</h1>

      <form onSubmit={handleSubmit}>
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <input
              name="pickupPincode"
              value={formData.pickupPincode}
              onChange={handleChange}
              placeholder="Pickup Pincode"
              className="w-full border p-2 rounded"
              required
            />
            <input
              name="dropPincode"
              value={formData.dropPincode}
              onChange={handleChange}
              placeholder="Drop Pincode"
              className="w-full border p-2 rounded"
              required
            />
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            >
              <option value="surface">Surface</option>
              <option value="Air">Air</option>
              <option value="Express">Express</option>
              <option value="Premium">Premium</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                name="length"
                value={formData.length || ""}
                onChange={handleChange}
                placeholder="Length (cm)"
                className="border p-2 rounded"
                
              />
              <input
                type="number"
                name="width"
                value={formData.width || ""}
                onChange={handleChange}
                placeholder="Width (cm)"
                className="border p-2 rounded"
                
              />
              <input
                type="number"
                name="height"
                value={formData.height || ""}
                onChange={handleChange}
                placeholder="Height (cm)"
                className="border p-2 rounded"
                
              />
            </div>
            <input
              type="number"
              name="boxQuantity"
              value={formData.boxQuantity || ""}
              onChange={handleChange}
              placeholder="Box Quantity"
              className="w-full border p-2 rounded"
              
            />
            <input
              type="text"
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              placeholder="Notes or Reference Number"
              className="w-full border p-2 rounded"
            />
            <input
              name="actualWeight"
              value={formData.actualWeight}
              onChange={handleChange}
              placeholder="Weight"
              className="w-full border p-2 rounded"
              required
            />
            <select
              name="weightUnit"
              value={formData.weightUnit}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
            <input
              name="goodsDescription"
              value={formData.goodsDescription}
              onChange={handleChange}
              placeholder="Goods Description"
              className="w-full border p-2 rounded"
              required
            />
            <button
              type="button"
              onClick={handleNext}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Next
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
  <div className="space-y-3">
    {["sender", "receiver"].map((type) => (
      <div key={type} className="border p-3 rounded">
        <h2 className="font-semibold mb-2 capitalize">{type} details</h2>
        {["Name", "Phone", "Email", "Address", "City", "State", "Landmark"].map(
          (field) => (
            <input
              key={field}
              type={field === "Email" ? "email" : "text"}
              name={`${type}${field}`}
              value={formData[`${type}${field}`]}
              onChange={handleChange}
              placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} ${field}`}
              className="w-full border p-2 rounded mb-2"
              required={field !== "Email"} // 🔥 Email is now optional
            />
          )
        )}
      </div>
    ))}
    <input
      name="bookingId"
      value={formData.bookingId}
      onChange={(e) =>
        setFormData({
          ...formData,
          bookingId: e.target.value.toUpperCase(), // 🔥 auto uppercase while typing
        })
      }
      placeholder="Booking ID (must be unique)"
      className="w-full border p-2 rounded uppercase"
      required
    />
    <select
      name="deliveryStatus"
      value={formData.deliveryStatus}
      onChange={handleChange}
      className="w-full border p-2 rounded"
    >
      <option value="confirmed">Confirmed</option>
      <option value="pending">Pending</option>
      <option value="in-transit">Dispatched</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
    <input
      name="goodsValue"
      value={formData.goodsValue}
      onChange={handleChange}
      placeholder="Goods Value (₹)"
      className="w-full border p-2 rounded"
      
    />
    <div className="flex justify-between">
      <button type="button" onClick={handleBack} className="bg-gray-400 text-white px-4 py-2 rounded">
        Back
      </button>
      <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded">
        Submit
      </button>
    </div>
  </div>
)}


        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4 p-4 border rounded shadow">
            <h2 className="text-xl font-bold mb-2 text-green-700">✅ Booking Submitted Successfully!</h2>
            <ul className="text-sm space-y-1">
              <li><strong>Booking ID:</strong> {formData.bookingId}</li>
              <li><strong>Service:</strong> {formData.serviceType}</li>
              <li><strong>From:</strong> {formData.pickupPincode} — To: {formData.dropPincode}</li>
              <li><strong>Weight:</strong> {formData.actualWeight} {formData.weightUnit}</li>
              <li><strong>Sender:</strong> {formData.senderName}, {formData.senderPhone}, {formData.senderEmail}</li>
              <li><strong>Receiver:</strong> {formData.receiverName}, {formData.receiverPhone}, {formData.receiverEmail}</li>
              <li><strong>Status:</strong> {formData.deliveryStatus}</li>
            </ul>
            <button type="button" onClick={resetForm} className="mt-4 bg-orange-500 text-white px-4 py-2 rounded">
              New Booking
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
