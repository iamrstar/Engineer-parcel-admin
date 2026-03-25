"use client";
import { useState, useEffect } from "react";

export default function ManualBooking() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pickupPincode: "",
    deliveryPincode: "",
    serviceType: "Surface",
    actualWeight: "",
    weightUnit: "kg",
    dimensions: [{ length: "", width: "", height: "" }],
    boxQuantity: 1,
    goodsDescription: "",
    senderName: "",
    senderPhone: "",
    senderEmail: "",
    senderAddress: "",
    senderAddress2: "",
    senderCity: "",
    senderState: "",
    senderLandmark: "",
    receiverName: "",
    receiverPhone: "",
    receiverEmail: "",
    receiverAddress: "",
    receiverAddress2: "",
    receiverCity: "",
    receiverState: "",
    receiverLandmark: "",
    bookingId: "",
    deliveryStatus: "confirmed",
    pickupDate: new Date().toISOString().split("T")[0],
    pickupSlot: "Anytime",
    insuranceRequired: true,
    fragile: false,
    premiumItemType: "",
    notes: "",
    totalAmount: "",
    isVendorBooking: false,
    vendorId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pincodeStatus, setPincodeStatus] = useState({
    pickup: null, // null, true, false
    drop: null
  });
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorResults, setVendorResults] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const searchVendors = async (query) => {
    if (!query) {
      setVendorResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vendors/search/${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVendorResults(data);
      setShowVendorDropdown(true);
    } catch (err) {
      console.error(err);
    }
  };

  const selectVendor = (vendor) => {
    setFormData(prev => ({
      ...prev,
      isVendorBooking: true,
      vendorId: vendor.vendorId,
      senderName: vendor.name,
      senderPhone: vendor.phone,
      senderEmail: vendor.email || "",
      senderAddress: vendor.address,
      senderAddress2: vendor.address2 || "",
      senderCity: vendor.city,
      senderState: vendor.state,
      senderLandmark: vendor.landmark || "",
      pickupPincode: vendor.pincode,
      totalAmount: "0" // Default to 0 as per user request
    }));
    setShowVendorDropdown(false);
    setVendorSearch(vendor.name);
    // Trigger pincode check for the vendor's pincode
    checkPincode(vendor.pincode, 'pickup');
  };

  useEffect(() => {
    if (formData.pickupPincode.length === 6) {
      checkPincode(formData.pickupPincode, 'pickup');
    } else {
      setPincodeStatus(prev => ({ ...prev, pickup: null }));
    }
  }, [formData.pickupPincode]);

  useEffect(() => {
    if (formData.deliveryPincode.length === 6) {
      checkPincode(formData.deliveryPincode, 'drop');
    } else {
      setPincodeStatus(prev => ({ ...prev, drop: null }));
    }
  }, [formData.deliveryPincode]);

  const checkPincode = async (pincode, type) => {
    try {
      const currentToken = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pincodes?code=${pincode}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      setPincodeStatus(prev => ({ ...prev, [type]: data.available }));

      if (data.available) {
        if (type === 'pickup') {
          setFormData(prev => ({ ...prev, senderCity: data.city, senderState: data.state }));
        } else {
          setFormData(prev => ({ ...prev, receiverCity: data.city, receiverState: data.state }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setFormData({
      pickupPincode: "",
      deliveryPincode: "",
      serviceType: "Surface",
      actualWeight: "",
      weightUnit: "kg",
      dimensions: [{ length: "", width: "", height: "" }],
      boxQuantity: 1,
      goodsDescription: "",
      senderName: "",
      senderPhone: "",
      senderEmail: "",
      senderAddress: "",
      senderAddress2: "",
      senderCity: "",
      senderState: "",
      senderLandmark: "",
      receiverName: "",
      receiverPhone: "",
      receiverEmail: "",
      receiverAddress: "",
      receiverAddress2: "",
      receiverCity: "",
      receiverState: "",
      receiverLandmark: "",
      bookingId: "",
      deliveryStatus: "confirmed",
      pickupDate: new Date().toISOString().split("T")[0],
      pickupSlot: "Anytime",
      insuranceRequired: true,
      fragile: false,
      premiumItemType: "",
      notes: "",
      totalAmount: "",
      isVendorBooking: false,
      vendorId: "",
    });
    setVendorSearch("");
    setPincodeStatus({ pickup: null, drop: null });
    setStep(1);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newState = {
        ...prev,
        [name]: type === "checkbox" ? checked : value
      };

      return newState;
    });
  };

  const handleDimensionChange = (index, e) => {
    const { name, value } = e.target;
    const newDimensions = [...formData.dimensions];
    newDimensions[index] = { ...newDimensions[index], [name]: value };
    setFormData((prev) => ({ ...prev, dimensions: newDimensions }));
  };

  const handleBoxQuantityChange = (e) => {
    const qty = parseInt(e.target.value) || 1;
    setFormData((prev) => {
      const newDimensions = [...prev.dimensions];
      if (qty > newDimensions.length) {
        for (let i = newDimensions.length; i < qty; i++) {
          newDimensions.push({ length: "", width: "", height: "" });
        }
      } else {
        newDimensions.splice(qty);
      }
      return { ...prev, boxQuantity: qty, dimensions: newDimensions };
    });
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      serviceType: formData.serviceType.toLowerCase(),
      pickupPincode: formData.pickupPincode,
      deliveryPincode: formData.deliveryPincode, // Corrected from dropPincode
      pickupDate: formData.pickupDate,
      pickupSlot: formData.pickupSlot,
      deliveryDate: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
      estimatedDelivery: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
      currentLocation: formData.senderCity || "Hub",
      parcelImage: "https://via.placeholder.com/150",
      couponCode: "",
      couponDiscount: 0,
      insuranceRequired: formData.insuranceRequired,
      paymentStatus: "pending",
      paymentMethod: "COD",
      notes: formData.notes || "Manual booking created by admin",
      status: formData.deliveryStatus.toLowerCase(),
      bookingSource: "admin",
      isVendorBooking: formData.isVendorBooking,
      vendorId: formData.vendorId,
      premiumItemType: formData.premiumItemType,
      bookingId: `EP${formData.bookingId.replace(/^EP/i, '')}`,
      pricing: {
        totalAmount: parseFloat(formData.totalAmount) || 0,
        basePrice: parseFloat(formData.totalAmount) || 0,
        tax: 0,
        additionalCharges: 0
      },

      senderDetails: {
        name: formData.senderName,
        phone: formData.senderPhone,
        email: formData.senderEmail,
        address: formData.senderAddress,
        address2: formData.senderAddress2,
        pincode: formData.pickupPincode,
        city: formData.senderCity,
        state: formData.senderState,
        landmark: formData.senderLandmark
      },

      receiverDetails: {
        name: formData.receiverName,
        phone: formData.receiverPhone,
        email: formData.receiverEmail,
        address: formData.receiverAddress,
        address2: formData.receiverAddress2,
        pincode: formData.deliveryPincode,
        city: formData.receiverCity,
        state: formData.receiverState,
        landmark: formData.receiverLandmark
      },

      packageDetails: {
        weight: parseFloat(formData.actualWeight),
        weightUnit: formData.weightUnit,
        volumetricWeight: formData.dimensions.reduce((acc, dim) => acc + (parseFloat(dim.length) * parseFloat(dim.width) * parseFloat(dim.height) / 5000 || 0), 0),
        dimensions: formData.dimensions.map(dim => ({
          length: parseFloat(dim.length) || 0,
          width: parseFloat(dim.width) || 0,
          height: parseFloat(dim.height) || 0
        })),
        boxQuantity: parseInt(formData.boxQuantity),
        description: formData.goodsDescription,
        value: 0,
        fragile: formData.fragile,
      },
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/manual-bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStep(3);
      } else {
        const errorData = await response.json();
        alert(`Failed to create booking: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error creating booking. Please check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white shadow-xl rounded-2xl border border-gray-100 my-8">
      <h1 className="text-3xl font-extrabold mb-8 text-center bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
        Manual Order Entry
      </h1>

      {/* Stepper UI */}
      <div className="flex justify-between mb-10 px-4 relative">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
        {[1, 2, 3].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
            <span className={`text-xs font-semibold ${step >= s ? 'text-orange-600' : 'text-gray-400'}`}>
              {s === 1 ? 'Details' : s === 2 ? 'Address' : 'Confirm'}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, isVendorBooking: false, vendorId: "" }))}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${!formData.isVendorBooking ? 'bg-white shadow-md text-orange-600' : 'text-gray-500'}`}
              >
                Normal Booking
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, isVendorBooking: true }))}
                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${formData.isVendorBooking ? 'bg-white shadow-md text-orange-600' : 'text-gray-500'}`}
              >
                Vendor Booking
              </button>
            </div>

            {formData.isVendorBooking && (
              <div className="relative mb-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-bold text-gray-700">Search Vendor (Name or ID)</label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 border border-orange-200 px-2 py-1 rounded-md bg-orange-50 transition-all flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    Start New / Reset
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      searchVendors(e.target.value);
                    }}
                    placeholder="Enter vendor name or ID..."
                    className="w-full border border-orange-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-orange-50 font-medium"
                  />
                  {showVendorDropdown && vendorResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-hidden">
                      {vendorResults.map(vendor => (
                        <div
                          key={vendor._id}
                          onClick={() => selectVendor(vendor)}
                          className="p-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          <div className="font-bold text-gray-900">{vendor.name}</div>
                          <div className="text-xs text-orange-600 font-mono">{vendor.vendorId}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-orange-600 mt-1 font-bold italic">Selecting a vendor will auto-fill address and set amount to 0.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">Pickup Pincode</label>
                <div className="relative">
                  <input
                    name="pickupPincode"
                    value={formData.pickupPincode}
                    onChange={handleChange}
                    placeholder="e.g. 826001"
                    className={`w-full border-2 p-3 rounded-xl focus:ring-2 outline-none transition-all ${pincodeStatus.pickup === true ? 'border-green-500 ring-green-50 bg-green-50/10' : pincodeStatus.pickup === false ? 'border-red-500 ring-red-50 bg-red-50/10' : 'border-gray-300 focus:ring-orange-500'}`}
                    required
                  />
                  {pincodeStatus.pickup === true && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {pincodeStatus.pickup === false && (
                    <span className="absolute -bottom-5 left-1 text-[10px] text-red-500 font-bold">Service not available</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">Drop Pincode</label>
                <div className="relative">
                  <input
                    name="deliveryPincode"
                    value={formData.deliveryPincode}
                    onChange={handleChange}
                    placeholder="e.g. 110001"
                    className={`w-full border-2 p-3 rounded-xl focus:ring-2 outline-none transition-all ${pincodeStatus.drop === true ? 'border-green-500 ring-green-50 bg-green-50/10' : pincodeStatus.drop === false ? 'border-red-500 ring-red-50 bg-red-50/10' : 'border-gray-300 focus:ring-orange-500'}`}
                    required
                  />
                  {pincodeStatus.drop === true && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 animate-in zoom-in duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {pincodeStatus.drop === false && (
                    <span className="absolute -bottom-5 left-1 text-[10px] text-red-500 font-bold">Service not available</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Service Type</label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-medium"
                  required
                >
                  <option value="Surface">Surface</option>
                  <option value="Air">Air</option>
                  <option value="Express">Express</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              {formData.serviceType === "Premium" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Premium Category</label>
                  <select
                    name="premiumItemType"
                    value={formData.premiumItemType}
                    onChange={handleChange}
                    className="w-full border border-orange-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-orange-50 font-medium"
                  >
                    <option value="">Select Category</option>
                    <option value="Documents">Documents</option>
                    <option value="Mobile Phones">Mobile Phones</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Pickup Date</label>
                <input
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Pickup Slot</label>
                <select
                  name="pickupSlot"
                  value={formData.pickupSlot}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  <option value="Anytime">Anytime</option>
                  <option value="Morning">Morning (10AM - 1PM)</option>
                  <option value="Afternoon">Afternoon (1PM - 4PM)</option>
                  <option value="Evening">Evening (4PM - 7PM)</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Shipment Boxes</label>
              <div className="mb-4">
                <select
                  name="boxQuantity"
                  value={formData.boxQuantity}
                  onChange={handleBoxQuantityChange}
                  className="w-full sm:w-48 border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white mb-4"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Box{i > 0 ? 'es' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.dimensions.map((dim, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 relative group">
                    <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-bold text-gray-400 border rounded-full">Box {index + 1}</span>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div>
                        <input
                          type="number"
                          name="length"
                          value={dim.length}
                          onChange={(e) => handleDimensionChange(index, e)}
                          placeholder="L (cm)"
                          className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          name="width"
                          value={dim.width}
                          onChange={(e) => handleDimensionChange(index, e)}
                          placeholder="W (cm)"
                          className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          name="height"
                          value={dim.height}
                          onChange={(e) => handleDimensionChange(index, e)}
                          placeholder="H (cm)"
                          className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Actual Weight ({formData.weightUnit})</label>
                <div className="flex gap-2">
                  <input
                    name="actualWeight"
                    type="number"
                    step="0.01"
                    value={formData.actualWeight}
                    onChange={handleChange}
                    placeholder="Total Weight"
                    className="flex-1 border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <select
                    name="weightUnit"
                    value={formData.weightUnit}
                    onChange={handleChange}
                    className="w-24 border border-gray-300 p-3 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <input
                  name="goodsDescription"
                  value={formData.goodsDescription}
                  onChange={handleChange}
                  placeholder="e.g. Books, Clothes"
                  className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all hover:-translate-y-0.5"
            >
              Continue to Addresses
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {['sender', 'receiver'].map((type) => (
              <div key={type} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm transition-all hover:bg-white hover:shadow-md">
                <h2 className="text-lg font-bold mb-4 capitalize flex items-center gap-2 text-orange-700">
                  <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                  {type} details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["Name", "Phone", "Email", "Address", "Address2", "City", "State", "Landmark"].map((field) => (
                    <div key={field} className={field === "Address" || field === "Address2" ? "sm:col-span-2" : ""}>
                      <input
                        name={`${type}${field}`}
                        value={formData[`${type}${field}`]}
                        onChange={handleChange}
                        placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} ${field}`}
                        className="w-full border border-gray-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        required={!["Email", "Landmark", "Address2"].includes(field)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 space-y-4">
              <h2 className="text-lg font-bold text-orange-800 mb-2">Additional Options</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="fragile"
                      checked={formData.fragile}
                      onChange={handleChange}
                      className="w-5 h-5 rounded-md border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">Fragile Item</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="insuranceRequired"
                      checked={formData.insuranceRequired}
                      onChange={handleChange}
                      className="w-5 h-5 rounded-md border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">Insurance Required</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-orange-700 uppercase mb-1 ml-1">Booking Amount (₹)</label>
                  <input
                    name="totalAmount"
                    type="number"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    placeholder="Total Price"
                    className="w-full border border-orange-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white font-bold"
                    required
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold text-orange-700 uppercase mb-1 ml-1">Admin Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Special instructions for the team..."
                  className="w-full border border-orange-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                  rows="2"
                />
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-xl space-y-3 border-l-4 border-orange-500">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Booking ID (Mandatory)</label>
              <div className="flex items-center gap-0">
                <div className="bg-gray-200 border border-gray-300 border-r-0 p-2.5 rounded-l-lg text-sm font-bold text-gray-600 px-4">
                  EP
                </div>
                <input
                  name="bookingId"
                  value={formData.bookingId.replace(/^EP/i, '')}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // only numbers
                    setFormData(prev => ({ ...prev, bookingId: val }));
                  }}
                  placeholder="e.g. 04410"
                  className="flex-1 border border-gray-300 p-2.5 rounded-r-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono font-bold"
                  required
                />
                <select
                  name="deliveryStatus"
                  value={formData.deliveryStatus}
                  onChange={handleChange}
                  className="ml-2 w-32 border border-gray-300 p-2.5 rounded-lg outline-none bg-white text-xs font-bold appearance-none text-center"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-500 italic">Enter only the numeric part after EP. Status is auto-confirmed.</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-[2] bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700 hover:-translate-y-0.5'}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Booking...</span>
                  </div>
                ) : (
                  "Create Booking"
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Booking Confirmed!</h2>
              <p className="text-gray-500 mt-2">Manual entry has been successfully recorded.</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 text-left space-y-4 shadow-inner">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Booking ID</p>
                  <p className="font-mono font-bold text-lg text-orange-600">EP{formData.bookingId.replace(/^EP/i, '')}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Service Type</p>
                  <p className="font-bold text-lg text-gray-800">{formData.serviceType}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 border-l-4 border-l-green-500">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Amount</p>
                  <p className="font-bold text-lg text-green-600">{formData.isVendorBooking ? 'CREDIT' : `₹${formData.totalAmount}`}</p>
                </div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sender:</span>
                  <span className="font-bold">{formData.senderName} ({formData.senderPhone})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Receiver:</span>
                  <span className="font-bold">{formData.receiverName} ({formData.receiverPhone})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Route:</span>
                  <span className="font-bold">{formData.pickupPincode} ➔ {formData.deliveryPincode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity:</span>
                  <span className="font-bold">{formData.boxQuantity} Box{formData.boxQuantity > 1 ? 'es' : ''}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormData({
                  pickupPincode: "",
                  deliveryPincode: "",
                  serviceType: "Surface",
                  actualWeight: "",
                  weightUnit: "kg",
                  dimensions: [{ length: "", width: "", height: "" }],
                  boxQuantity: 1,
                  goodsDescription: "",
                  senderName: "",
                  senderPhone: "",
                  senderEmail: "",
                  senderAddress: "",
                  senderAddress2: "",
                  senderCity: "",
                  senderState: "",
                  senderLandmark: "",
                  receiverName: "",
                  receiverPhone: "",
                  receiverEmail: "",
                  receiverAddress: "",
                  receiverAddress2: "",
                  receiverCity: "",
                  receiverState: "",
                  receiverLandmark: "",
                  bookingId: "",
                  deliveryStatus: "confirmed",
                  pickupDate: new Date().toISOString().split("T")[0],
                  pickupSlot: "Anytime",
                  insuranceRequired: true,
                  fragile: false,
                  premiumItemType: "",
                  notes: "",
                  totalAmount: "",
                });
                setStep(1);
              }}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg"
            >
              Enter Another Booking
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
