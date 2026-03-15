const cron = require("node-cron");
const Booking = require("../models/Booking");
const { fetchUniversalTrackingStatus } = require("../services/trackingService");

// 🕒 Runs every 2 hours: "0 */2 * * *"
// For testing purposes right now, you could change this to "*/1 * * * *" (every 1 minute)
const trackingCronJob = cron.schedule("0 */2 * * *", async () => {
    console.log("⏰ [Cron] Starting scheduled tracking poll for active vendor shipments...");

    try {
        // 1. Find all active bookings that have a vendor tracking ID assigned
        const activeBookings = await Booking.find({
            status: { $nin: ["delivered", "cancelled"] },
            vendorTrackingId: { $type: "string", $nin: ["", " "] },
            vendorName: { $type: "string", $nin: ["", " ", "other"] }
        });

        if (activeBookings.length === 0) {
            console.log("⏰ [Cron] No active, vendor-tracked shipments found. Exiting poll.");
            return;
        }

        // 2. Loop through and poll the Universal API for updates
        // (Note: To prevent rate-limiting from the Universal API, you can introduce a delay between requests if you have hundreds of parcels)
        let updatedCount = 0;

        for (const booking of activeBookings) {
            const trackingId = booking.vendorTrackingId ? String(booking.vendorTrackingId).trim() : "";
            if (!trackingId || trackingId.length === 0) {
                continue; // Skip if it's just spaces
            }

            const vendorUpdate = await fetchUniversalTrackingStatus(booking.vendorName, trackingId);

            // If the API failed to fetch, skip updating this parcel
            if (!vendorUpdate) continue;

            const incStatus = vendorUpdate.status.toLowerCase();
            let newSystemStatus = booking.status; // default to no change

            // 3. Map Universal API status to EP Admin Status
            if (incStatus.includes("deliver")) newSystemStatus = "delivered";
            else if (incStatus.includes("transit") || incStatus.includes("dispatch")) newSystemStatus = "in-transit";
            else if (incStatus.includes("out") || incStatus.includes("ofb") || incStatus.includes("out for delivery")) newSystemStatus = "out-for-delivery";
            else if (incStatus.includes("cancel") || incStatus.includes("return")) newSystemStatus = "cancelled";
            else if (incStatus.includes("pick")) newSystemStatus = "picked";

            // 4. Update the booking if the status changed
            if (newSystemStatus !== booking.status) {
                booking.status = newSystemStatus;

                booking.trackingHistory.push({
                    status: vendorUpdate.status.toUpperCase(),
                    location: vendorUpdate.location || "System Update",
                    description: vendorUpdate.description || `Status pulled from ${booking.vendorName} aggregator`,
                    timestamp: new Date()
                });

                await booking.save();
                updatedCount++;
                console.log(`⏰ [Cron] Updated booking ${booking.bookingId} (${booking.vendorTrackingId}) to ${newSystemStatus}`);
            }
        }

        console.log(`⏰ [Cron] Tracking polling finished. Polled ${activeBookings.length} packages, updated ${updatedCount} packages.`);

    } catch (error) {
        console.error("⏰ [Cron Error] Failed during tracking polling:", error);
    }
});

module.exports = trackingCronJob;
