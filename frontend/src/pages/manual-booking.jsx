"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";


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
    bookingId: "EP",
    deliveryStatus: "Confirmed",
    ETD: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

 const handleSubmit = async (e) => {
  e.preventDefault();

  const payload = {
    serviceType: formData.serviceType.toLowerCase(),
    pickupPincode: formData.pickupPincode,
    deliveryPincode: formData.dropPincode,
    pickupDate: new Date().toISOString().split("T")[0],
    pickupSlot: "10AM-12PM",
    deliveryDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    estimatedDelivery: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
    currentLocation: "Admin Panel",
    parcelImage: "https://via.placeholder.com/150",
    couponCode: "",
    couponDiscount: 0,
    insuranceRequired: true,
    paymentStatus: "pending",
    paymentMethod: "COD",
    notes: "Manual booking created by admin",
    status: formData.deliveryStatus.toLowerCase(),
    bookingSource: "admin",

    ...(formData.bookingId && { bookingId: formData.bookingId }),

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
      weight: parseFloat(formData.actualWeight),
      weightUnit: formData.weightUnit,
      volumetricWeight: parseFloat(formData.actualWeight),
      dimensions: {
        length: parseInt(formData.length),
        width: parseInt(formData.width),
        height: parseInt(formData.height),
      },
      boxQuantity: parseInt(formData.boxQuantity),
      description: formData.goodsDescription,
      value: parseInt(formData.goodsValue),
      fragile: false,
    },

    pricing: {
      basePrice: 100,
      additionalCharges: 50,
      tax: 18,
      totalAmount: 168,
    },
  };

  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/manual-bookings`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // SUCCESS
    console.log("✅ Booking successful:", res.data);
    toast.success("Booking created successfully!");
    setStep(3);

  } catch (error) {
    console.error("❌ API Error:", error);

    // Duplicate booking ID
    if (error.response?.data?.message?.includes("duplicate key")) {
      toast.error(`Booking ID "${formData.bookingId}" already exists!`);
      return;
    }

    toast.error(error.response?.data?.message || "Something went wrong!");
  }
};

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manual Booking (Admin Only)</h1>

      <form onSubmit={handleSubmit}>
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <input name="pickupPincode" value={formData.pickupPincode} onChange={handleChange} placeholder="Pickup Pincode" className="w-full border p-2 rounded" required />
            <input name="dropPincode" value={formData.dropPincode} onChange={handleChange} placeholder="Drop Pincode" className="w-full border p-2 rounded" required />

            <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full border p-2 rounded" required>
              <option value="Surface">Surface</option>
              <option value="Air">Air</option>
              <option value="Express">Express</option>
              <option value="Premium">Premium</option>
            </select>

            <div className="grid grid-cols-3 gap-2">
              <input type="number" name="length" value={formData.length || ""} onChange={handleChange} placeholder="Length (cm)" className="border p-2 rounded" required />
              <input type="number" name="width" value={formData.width || ""} onChange={handleChange} placeholder="Width (cm)" className="border p-2 rounded" required />
              <input type="number" name="height" value={formData.height || ""} onChange={handleChange} placeholder="Height (cm)" className="border p-2 rounded" required />
            </div>

            <input type="number" name="boxQuantity" value={formData.boxQuantity || ""} onChange={handleChange} placeholder="Box Quantity" className="w-full border p-2 rounded" required />
            <input name="actualWeight" value={formData.actualWeight} onChange={handleChange} placeholder="Weight" className="w-full border p-2 rounded" required />
            <select name="weightUnit" value={formData.weightUnit} onChange={handleChange} className="w-full border p-2 rounded" required>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>

            <input name="goodsDescription" value={formData.goodsDescription} onChange={handleChange} placeholder="Goods Description" className="w-full border p-2 rounded" required />

            <button type="button" onClick={handleNext} className="bg-blue-600 text-white px-4 py-2 rounded">
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
                {["Name", "Phone", "Email", "Address", "City", "State", "Landmark"].map((field) => (
                  <input
                    key={field}
                    type={field === "Email" ? "email" : "text"}
                    name={`${type}${field}`}
                    value={formData[`${type}${field}`]}
                    onChange={handleChange}
                    placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} ${field}`}
                    className="w-full border p-2 rounded mb-2"
                    required
                  />
                ))}
              </div>
            ))}
<input
  name="bookingId"
  value={formData.bookingId}
  onChange={handleChange}
  placeholder = "Booking ID (Start with AD + 6 digits)"
  className="w-full border p-2 rounded uppercase"
/>
            <select name="deliveryStatus" value={formData.deliveryStatus} onChange={handleChange} className="w-full border p-2 rounded">
              <option value="confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="in-transit">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input name="goodsValue" value={formData.goodsValue} onChange={handleChange} placeholder="Goods Value (₹)" className="w-full border p-2 rounded" required />
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
              <li><strong>Booking ID:</strong> {formData.bookingId || "Auto-generated"}</li>
              <li><strong>Service:</strong> {formData.serviceType}</li>
              <li><strong>From:</strong> {formData.pickupPincode} — To: {formData.dropPincode}</li>
              <li><strong>Weight:</strong> {formData.actualWeight} {formData.weightUnit}</li>
              <li><strong>Sender:</strong> {formData.senderName}, {formData.senderPhone}, {formData.senderEmail}</li>
              <li><strong>Receiver:</strong> {formData.receiverName}, {formData.receiverPhone}, {formData.receiverEmail}</li>
              <li><strong>Status:</strong> {formData.deliveryStatus}</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  pickupPincode: "",
                  dropPincode: "",
                  serviceType: "Surface",
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
                  deliveryStatus: "Confirmed",
                });
                setStep(1);
              }}
              className="mt-4 bg-orange-500 text-white px-4 py-2 rounded"
            >
              New Booking
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
