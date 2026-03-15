const axios = require("axios");

/**
 * Universal Tracking Aggregator API Placeholder
 * e.g., TrackingMore, 17TRACK, Shiprocket Tracking API
 */
const TRACKING_API_KEY = process.env.TRACKING_API_KEY || "YOUR_UNIVERSAL_API_KEY_HERE";
const TRACKING_API_URL = process.env.TRACKING_API_URL || "https://api.trackingmore.com/v4/trackings/get";

/**
 * Fetch tracking details from a universal vendor API.
 * This API natively understands Delhivery, DTDC, Blue Dart, etc., 
 * so you don't need separate scrapers for each!
 * 
 * @param {String} vendorName (e.g. "dtdc", "bluedart")
 * @param {String} trackingId / AWB (e.g. "12345678")
 * @returns {Object} { status, location, description }
 */
const fetchUniversalTrackingStatus = async (vendorName, trackingId) => {
    try {
        console.log(`[TrackingService] Polling TrackingMore for AWB: ${trackingId}...`);

        // Check if package exists in TrackingMore. If not, we have to create a tracking item first.
        // TrackingMore requires us to POST to create the item before we can track it continuously.

        // 1. First, try to fetch the tracking. If it returns 404, we create it.
        const headers = {
            'Tracking-Api-Key': TRACKING_API_KEY,
            'Content-Type': 'application/json'
        };

        let response;
        try {
            response = await axios.get(`${TRACKING_API_URL}?tracking_numbers=${trackingId}`, { headers });
        } catch (err) {
            console.error(`[TrackingService] Fetch failed for ${trackingId}. Status: ${err.response?.status}. Message:`, err.response?.data?.meta?.message || err.message);
            return null;
        }

        // If data array is empty, it means we haven't registered this AWB with TrackingMore yet.
        if (!response.data || !response.data.data || response.data.data.length === 0) {
            console.log(`[TrackingService] AWB ${trackingId} not found in TrackingMore. Registering it now...`);

            // Register it
            try {
                await axios.post('https://api.trackingmore.com/v4/trackings/create', {
                    tracking_number: trackingId,
                    courier_code: vendorName.toLowerCase() // tm tries auto-detect if wrong
                }, { headers });

                // Wait 1 second to let TM process it, then fetch again
                await new Promise(resolve => setTimeout(resolve, 1000));
                response = await axios.get(`${TRACKING_API_URL}?tracking_numbers=${trackingId}`, { headers });
            } catch (postErr) {
                console.error(`[TrackingService] Failed to register new AWB ${trackingId}:`, postErr.response?.data || postErr.message);
                return null;
            }
        }

        // 2. Extract the latest tracking event from their payload
        if (response.data && response.data.data && response.data.data.length > 0) {
            const trackingData = response.data.data[0];

            // TM returns delivery_status in top level (pending, notfound, transit, pickup, delivered, expired, undelivered, exception)
            const mainStatus = trackingData.delivery_status;

            // The actual step-by-step history is in track_info.tracking_details
            let latestEvent = null;
            if (trackingData.track_info && trackingData.track_info.tracking_details && trackingData.track_info.tracking_details.length > 0) {
                // The *first* element in this array is usually the oldest event in TrackingMore format, but checking tracking_details
                const details = trackingData.track_info.tracking_details;
                latestEvent = details[0]; // TrackingMore v4 returns newest first 
            }

            if (!latestEvent) {
                return {
                    status: mainStatus || "pending",
                    location: "Awaiting Carrier Update",
                    description: "Package registered, waiting for first scan from carrier.",
                    timestamp: new Date()
                };
            }

            return {
                status: latestEvent.substatus || mainStatus || "in-transit",
                location: latestEvent.location || "Carrier Hub",
                description: latestEvent.tracking_detail || "Carrier update received",
                timestamp: latestEvent.checkpoint_date ? new Date(latestEvent.checkpoint_date) : new Date()
            };
        }

        return null;

    } catch (error) {
        console.error(`[TrackingService] Error polling AWB ${trackingId}:`, error.message);
        return null;
    }
};

module.exports = { fetchUniversalTrackingStatus };
