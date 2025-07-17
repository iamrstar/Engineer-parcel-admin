"use client";
import { useState } from "react";

export default function ManualBooking() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pickupPincode: "",
    dropPincode: "",
    serviceType: "Surface",
    actualWeight: "",
    weightUnit: "kg",
    goodsDescription: "",
    goodsValue: "",
    senderName: "",
    senderPhone: "",
    senderAddress: "",

    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
   
    trackingId: "",
    deliveryStatus: "Pending",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
  e.preventDefault();

  try { 
    const res = await fetch('http://localhost:5000/api/manual-bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },  
      body: JSON.stringify({
        ...formData,
        bookingSource: 'Manual', // Explicitly tagging it as Manual
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(`Booking failed: ${errorData.message || "Unknown error"}`);
      return;
    }

    const data = await res.json();
    console.log("Booking successful:", data);

    // Proceed to summary
    setStep(3);
  } catch (error) {
    console.error('API Error:', error);
    alert("Something went wrong while submitting the booking.");
  }
};


  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4"> Booking (Admin only)</h1>
      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block font-semibold">Pickup Pincode</label>
              <input type="text" name="pickupPincode" value={formData.pickupPincode} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Drop Pincode</label>
              <input type="text" name="dropPincode" value={formData.dropPincode} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Service Type</label>
              <select name="serviceType" value={formData.serviceType} onChange={handleChange}  required className="w-full border rounded p-2">
                <option value="Surface">Surface</option>
                <option value="Air">Air</option>
                <option value="Express">Express</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Weight</label>
              <input type="text" name="actualWeight" value={formData.actualWeight} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Unit</label>
              <select name="weightUnit" value={formData.weightUnit} onChange={handleChange} required className="w-full border rounded p-2">
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold">Goods Description</label>
              <input type="text" name="goodsDescription" value={formData.goodsDescription} onChange={handleChange} className="w-full border rounded p-2" />
            </div>
            <button type="button" onClick={handleNext} className="bg-blue-600 text-white px-4 py-2 rounded">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block font-semibold">Sender Name</label>
              <input type="text" name="senderName" value={formData.senderName} onChange={handleChange}required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Sender Phone</label>
              <input type="text" name="senderPhone" value={formData.senderPhone} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Sender Address</label>
              <input type="text" name="senderAddress" value={formData.senderAddress} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
           
            <div>
              <label className="block font-semibold">Receiver Name</label>
              <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Receiver Phone</label>
              <input type="text" name="receiverPhone" value={formData.receiverPhone} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Receiver Address</label>
              <input type="text" name="receiverAddress" value={formData.receiverAddress} onChange={handleChange} required className="w-full border rounded p-2" />
            </div>

            <div>
              <label className="block font-semibold">Tracking ID</label>
              <input type="text" name="trackingId" value={formData.trackingId} onChange={handleChange}  placeholder="Start With AD or MAN and 6 Digits (ex: AD123456)" className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block font-semibold">Delivery Status</label>
              <select name="deliveryStatus" value={formData.deliveryStatus} onChange={handleChange} required className="w-full border rounded p-2">
                <option value="Pending">Pending</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block font-medium">Goods Value (₹)</label>
              <input type="number" name="goodsValue" value={formData.goodsValue} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={handleBack} className="bg-gray-400 text-white px-4 py-2 rounded">Back</button>
              <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded">Submit</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 p-4 border rounded shadow">
            <h2 className="text-xl font-bold mb-2 text-green-700">Booking Submitted Successfully!</h2>
            <p className="text-gray-600">Here’s a summary of your manual booking:</p>
            <ul className="text-sm space-y-1">
              <li><strong>Tracking ID:</strong> {formData.trackingId}</li>
              <li><strong>Service:</strong> {formData.serviceType}</li>
              <li><strong>From:</strong> {formData.pickupPincode} — To: {formData.dropPincode}</li>
              <li><strong>Weight:</strong> {formData.actualWeight} {formData.weightUnit}</li>
              <li><strong>Sender:</strong> {formData.senderName}, {formData.senderPhone}</li>
              <li><strong>Receiver:</strong> {formData.receiverName}, {formData.receiverPhone}</li>
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
    senderAddress: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    trackingId: "",
    deliveryStatus: "Pending",
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
