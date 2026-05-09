(function() {
    const API_URL = 'https://admin-api.engineersparcel.in/api/analytics/track';
    
    // 1. Session Management
    let sessionId = localStorage.getItem('ep_analytics_session');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('ep_analytics_session', sessionId);
    }

    // 2. Device Info
    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.indexOf("Firefox") > -1) browser = "Firefox";
        else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
        else if (ua.indexOf("Safari") > -1) browser = "Safari";
        
        return {
            os: navigator.platform,
            browser: browser,
            screenSize: `${window.screen.width}x${window.screen.height}`
        };
    };

    // 3. Track Function
    const track = async (event, data = {}) => {
        try {
            const body = {
                sessionId,
                path: window.location.pathname,
                event,
                data: {
                    ...data,
                    referrer: document.referrer,
                    device: getDeviceInfo()
                }
            };
            
            // Use fetch with keepalive to ensure it works on page unload if needed
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                keepalive: true
            });
        } catch (e) {
            // Silently fail
        }
    };

    // 4. Initial Page View
    track('pageview');

    // 5. Heartbeat (every 30s)
    setInterval(() => {
        track('heartbeat');
    }, 30000);

    // 6. Click Tracking
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a');
        if (target) {
            track('click', {
                element: target.tagName.toLowerCase(),
                text: target.innerText.substring(0, 50).trim(),
                id: target.id,
                classes: target.className
            });
        }
    });

})();
