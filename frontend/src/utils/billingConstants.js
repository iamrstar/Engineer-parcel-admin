export const COMPANY_PROFILES = {
  SRQ: {
    key: "SRQ",
    name: "SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED",
    shortName: "Engineers Parcel",
    tagline: "Complete Logistics & Express Courier Solutions",
    address: "IIT (ISM) Dhanbad, Sardar Patel Nagar, Dhanbad - 826004, Jharkhand, India",
    phone: "+91 9708815717 / 9525801506",
    email: "info@engineersparcel.in",
    website: "www.engineersparcel.in",
    cin: "U63090JH2023PTC020726",
    gstin: "20AAHCS7825E1ZY",
    bank: "UCO Bank",
    accountName: "SRQ ENGINEERS PARCEL AND HAUL PVT LTD",
    accountNo: "01910210001448",
    accountType: "Current Account (CAA)",
    ifsc: "UCBA0000191",
    branch: "Hirapur, Dhanbad",
    upi: "engineersparcel@uco"
  },
  ENGGPARCEL: {
    key: "ENGGPARCEL",
    name: "ENGGPARCEL SERVICES LLP",
    shortName: "EnggParcel Services",
    tagline: "Premier Express Courier & Cargo Solutions",
    address: "IIT (ISM) Dhanbad - 826004, Jharkhand, India",
    phone: "+91 9708815717 / 9525801506",
    email: "info@engineersparcel.in",
    website: "www.engineersparcel.in",
    cin: "AAZ-3942",
    gstin: "20AAQFE4312Q1ZX",
    bank: "ICICI Bank",
    accountName: "ENGGPARCEL SERVICES LLP",
    accountNo: "196005001234",
    accountType: "Current Account",
    ifsc: "ICIC0000196",
    branch: "Dhanbad Branch",
    upi: "enggparcel@icici"
  }
};

export const SHIFTING_PRESETS = [
  // Furniture
  { name: "Double Bed (King Size) with Mattress", category: "Furniture", unit: "Nos", defaultRate: 2500 },
  { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", unit: "Nos", defaultRate: 2000 },
  { name: "Single Bed with Mattress", category: "Furniture", unit: "Nos", defaultRate: 1200 },
  { name: "3+1+1 Sofa Set (5 Seater)", category: "Furniture", unit: "Set", defaultRate: 3000 },
  { name: "L-Shape Sectional Sofa", category: "Furniture", unit: "Set", defaultRate: 3500 },
  { name: "Dining Table with 4 Chairs", category: "Furniture", unit: "Set", defaultRate: 2200 },
  { name: "Dining Table with 6 Chairs", category: "Furniture", unit: "Set", defaultRate: 2800 },
  { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", unit: "Nos", defaultRate: 2000 },
  { name: "Study Table & Office Chair", category: "Furniture", unit: "Set", defaultRate: 1200 },
  { name: "Center / Coffee Table", category: "Furniture", unit: "Nos", defaultRate: 800 },
  { name: "TV Unit / Entertainment Console", category: "Furniture", unit: "Nos", defaultRate: 1500 },
  { name: "Shoe Rack", category: "Furniture", unit: "Nos", defaultRate: 600 },
  { name: "Dressing Table with Mirror", category: "Furniture", unit: "Nos", defaultRate: 1400 },

  // Appliances
  { name: "Double Door Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 1800 },
  { name: "Single Door Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 1200 },
  { name: "Side-by-Side Refrigerator", category: "Appliances", unit: "Nos", defaultRate: 2500 },
  { name: "Fully Automatic Washing Machine", category: "Appliances", unit: "Nos", defaultRate: 1400 },
  { name: "Semi Automatic Washing Machine", category: "Appliances", unit: "Nos", defaultRate: 1000 },
  { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", unit: "Nos", defaultRate: 1800 },
  { name: "LED TV 32\" (Special Bubble Pack)", category: "Appliances", unit: "Nos", defaultRate: 1200 },
  { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", unit: "Set", defaultRate: 2200 },
  { name: "Window AC Unit", category: "Appliances", unit: "Nos", defaultRate: 1500 },
  { name: "Microwave Oven / OTG", category: "Appliances", unit: "Nos", defaultRate: 600 },
  { name: "Water Purifier (RO)", category: "Appliances", unit: "Nos", defaultRate: 500 },
  { name: "Room Air Cooler", category: "Appliances", unit: "Nos", defaultRate: 800 },

  // Boxes & Cartons
  { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", unit: "Boxes", defaultRate: 150 },
  { name: "Heavy Carton Box (Books/Documents)", category: "Boxes", unit: "Boxes", defaultRate: 200 },
  { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", unit: "Boxes", defaultRate: 250 },
  { name: "Large Suitcase / Trolley Bag", category: "Boxes", unit: "Nos", defaultRate: 300 },

  // Vehicles
  { name: "Motorcycle / Commuter Bike (up to 150cc)", category: "Vehicles", unit: "Nos", defaultRate: 4500 },
  { name: "Scooty / Activa", category: "Vehicles", unit: "Nos", defaultRate: 4000 },
  { name: "Royal Enfield / Cruiser Motorcycle", category: "Vehicles", unit: "Nos", defaultRate: 5500 },
  { name: "Hatchback Car Transportation", category: "Vehicles", unit: "Nos", defaultRate: 14000 },
  { name: "Sedan / Compact SUV Transportation", category: "Vehicles", unit: "Nos", defaultRate: 18000 },

  // Services & Charges
  { name: "Complete Professional 3-Layer Packing", category: "Services", unit: "Lot", defaultRate: 3500 },
  { name: "Loading Labor & Handling (Origin)", category: "Services", unit: "Lot", defaultRate: 2000 },
  { name: "Unloading Labor & Placement (Destination)", category: "Services", unit: "Lot", defaultRate: 2000 },
  { name: "Bed / AC Dismantling & Assembly Service", category: "Services", unit: "Service", defaultRate: 1500 },
  { name: "Transit Risk Insurance & Protection", category: "Services", unit: "Lot", defaultRate: 1000 }
];

export const PRESET_MOVE_BUNDLES = {
  "1BHK": [
    { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "Single Door Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "LED TV 32\" (Special Bubble Pack)", category: "Appliances", qty: 1, unit: "Nos", rate: 1200 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 8, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 4, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 3000 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 3500 }
  ],
  "2BHK": [
    { name: "Double Bed (King Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2500 },
    { name: "Double Bed (Queen Size) with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 2000 },
    { name: "3+1+1 Sofa Set (5 Seater)", category: "Furniture", qty: 1, unit: "Set", rate: 3000 },
    { name: "Dining Table with 4 Chairs", category: "Furniture", qty: 1, unit: "Set", rate: 2200 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 2, unit: "Nos", rate: 2000 },
    { name: "Double Door Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 1800 },
    { name: "Fully Automatic Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1400 },
    { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", qty: 1, unit: "Set", rate: 2200 },
    { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", qty: 1, unit: "Nos", rate: 1800 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 15, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 6, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 4500 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 4500 }
  ],
  "3BHK": [
    { name: "Double Bed (King Size) with Mattress", category: "Furniture", qty: 2, unit: "Nos", rate: 2500 },
    { name: "Single Bed with Mattress", category: "Furniture", qty: 1, unit: "Nos", rate: 1200 },
    { name: "L-Shape Sectional Sofa", category: "Furniture", qty: 1, unit: "Set", rate: 3500 },
    { name: "Dining Table with 6 Chairs", category: "Furniture", qty: 1, unit: "Set", rate: 2800 },
    { name: "Wardrobe / Almirah (Steel / Wooden)", category: "Furniture", qty: 3, unit: "Nos", rate: 2000 },
    { name: "Side-by-Side Refrigerator", category: "Appliances", qty: 1, unit: "Nos", rate: 2500 },
    { name: "Fully Automatic Washing Machine", category: "Appliances", qty: 1, unit: "Nos", rate: 1400 },
    { name: "Split AC (Indoor + Outdoor Unit)", category: "Appliances", qty: 2, unit: "Set", rate: 2200 },
    { name: "LED TV 43\" - 55\" (Special Bubble Pack)", category: "Appliances", qty: 2, unit: "Nos", rate: 1800 },
    { name: "Standard Carton Box (Clothes/Linens)", category: "Boxes", qty: 25, unit: "Boxes", rate: 150 },
    { name: "Kitchen Crockery & Utensil Box (Fragile)", category: "Boxes", qty: 10, unit: "Boxes", rate: 250 },
    { name: "Complete Professional 3-Layer Packing", category: "Services", qty: 1, unit: "Lot", rate: 6500 },
    { name: "Loading & Unloading Labor Service", category: "Services", qty: 1, unit: "Lot", rate: 6000 }
  ],
  "SINGLE_ITEM": [
    { name: "Single Parcel / Cargo Consignment", category: "General", qty: 1, unit: "Item", rate: 1200 }
  ],
  "VEHICLE": [
    { name: "Motorcycle / Bike (up to 150cc)", category: "Vehicles", qty: 1, unit: "Nos", rate: 4500 },
    { name: "Vehicle Specialized Transit Cover & Packaging", category: "Services", qty: 1, unit: "Lot", rate: 1000 }
  ]
};

export const numberToWordsIndian = (num) => {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
  };
  const rounded = Math.round(Number(num));
  return `Rupees ${convert(rounded)} Only`;
};
