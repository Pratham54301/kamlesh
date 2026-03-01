    /**
     * Tripset
 - MONGODB VERSION (GRAND TOTAL UPDATED)
     * Steps to Run:
     * 1. npm install express mongoose
     * 2. node server.js
     */

    const express = require('express');
    const session = require('express-session');
    const connectMongo = require('connect-mongo');
    const mongoose = require('mongoose');
    const path = require('path');

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(__dirname));

    // Session (must be before routes that use it)
    const mongoURI = "mongodb+srv://vedteic:Pratham%4054301@vedteix.yby9dng.mongodb.net/tripkamlesh-db";
    
    // Get MongoStore - connect-mongo v6 exports it as .default
    let MongoStore;
    try {
        MongoStore = connectMongo.default;
        if (!MongoStore || typeof MongoStore.create !== 'function') {
            // Try alternative export
            MongoStore = connectMongo.MongoStore || connectMongo;
        }
        if (!MongoStore || typeof MongoStore.create !== 'function') {
            throw new Error('MongoStore.create not found');
        }
    } catch (err) {
        console.error('ERROR initializing MongoStore:', err.message);
        console.error('connect-mongo exports:', Object.keys(connectMongo));
        console.error('connectMongo.default:', typeof connectMongo.default);
        console.error('connectMongo.MongoStore:', typeof connectMongo.MongoStore);
        throw new Error('Failed to initialize MongoStore. Check connect-mongo installation.');
    }
    
    app.use(session({
        secret: process.env.SESSION_SECRET || 'tripset-session-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
        store: MongoStore.create({ mongoUrl: mongoURI, collectionName: 'sessions' })
    }));

    // Serve PWA files with no-cache so updates apply immediately
    app.get('/manifest.json', (req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(path.join(__dirname, 'manifest.json'));
    });

    app.get('/sw.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.sendFile(path.join(__dirname, 'sw.js'));
    });


    // --- MONGODB CONNECTION ---
    mongoose.connect(mongoURI)
        .then(() => console.log("Kamlesh Bhai, MongoDB Connected! ✅"))
        .catch(err => console.error("Connection error: ", err));

    // MongoDB Schema
    const tripSchema = new mongoose.Schema({
        date: String,
        pickupTime: String,
        dropTime: String,
        tripId: String,
        pickup: String,
        drop: String,
        person: Number,
        km: Number,
        rate: { type: Number, default: 21 },
        other: Number,
        cng: Number,
        otherExpense: Number,
        total: String,
        createdAt: { type: Date, default: Date.now }
    });

    const Trip = mongoose.model('Trip', tripSchema);

    // App settings (stored in MongoDB only - no localStorage)
    const appSettingsSchema = new mongoose.Schema(
        {
            key: { type: String, unique: true, required: true },
            companyName: { type: String, default: 'Tripset' },
            rate: { type: Number, default: 21 },
            darkMode: { type: String, default: 'off', enum: ['on', 'off'] },
            installPromptShown: { type: Boolean, default: false }
        },
        { collection: 'tripset_settings', versionKey: false }
    );

    const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

    async function getSettings() {
        let doc = await AppSettings.findOne({ key: 'singleton' }).lean();
        if (!doc) {
            doc = await AppSettings.create({
                key: 'singleton',
                companyName: 'Tripset',
                rate: 21,
                darkMode: 'off',
                installPromptShown: false
            });
            doc = doc.toObject ? doc.toObject() : doc;
        }
        return {
            companyName: (doc && doc.companyName) ? doc.companyName : 'Tripset',
            rate: (doc && doc.rate != null) ? Number(doc.rate) : 21,
            darkMode: (doc && doc.darkMode) ? doc.darkMode : 'off',
            installPromptShown: !!(doc && doc.installPromptShown)
        };
    }

    async function getCompanyName() {
        const s = await getSettings();
        return s.companyName;
    }

    // Settings API
    app.get('/api/settings', async (req, res) => {
        try {
            const settings = await getSettings();
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/settings', requireApiAuth, async (req, res) => {
        try {
            const { companyName, rate, darkMode, installPromptShown } = req.body;
            let doc = await AppSettings.findOne({ key: 'singleton' });
            if (!doc) {
                doc = await AppSettings.create({ key: 'singleton' });
            }
            if (companyName != null) doc.companyName = String(companyName);
            if (rate != null) doc.rate = Number(rate);
            if (darkMode != null && ['on', 'off'].includes(darkMode)) doc.darkMode = darkMode;
            if (installPromptShown != null) doc.installPromptShown = Boolean(installPromptShown);
            await doc.save();
            res.json({
                companyName: doc.companyName,
                rate: Number(doc.rate),
                darkMode: doc.darkMode,
                installPromptShown: !!doc.installPromptShown
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- AUTH ---
    const AUTH_USER = '9033337363';
    const AUTH_PASS = '9033337363';

    function requireAuth(req, res, next) {
        if (req.session && req.session.isAuthenticated) return next();
        res.redirect(302, '/login');
    }

    function requireApiAuth(req, res, next) {
        if (req.session && req.session.isAuthenticated) return next();
        res.status(401).json({ error: 'Unauthorized' });
    }

    app.post('/auth/login', (req, res) => {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '').trim();
        if (username === AUTH_USER && password === AUTH_PASS) {
            req.session.isAuthenticated = true;
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Failed to save session' });
                }
                console.log('✅ Login successful, session saved');
                return res.json({ success: true });
            });
        } else {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    });

    app.post('/auth/logout', (req, res) => {
        req.session.destroy(() => {});
        res.json({ success: true });
    });

    app.get('/api/auth/status', (req, res) => {
        res.json({ isAuthenticated: !!(req.session && req.session.isAuthenticated) });
    });

    // API Routes - OLD ENTRIES FIRST (Sort 1) - protected
    app.get('/api/trips', requireApiAuth, async (req, res) => {
        try {
            const trips = await Trip.find().sort({ createdAt: 1 });
            res.json(trips);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/trips', requireApiAuth, async (req, res) => {
        try {
            const count = await Trip.countDocuments();
            if (count >= 10000) {
                const oldest = await Trip.find().sort({ createdAt: 1 }).limit(1);
                if (oldest.length > 0) await Trip.deleteOne({ _id: oldest[0]._id });
            }
            const newTrip = new Trip(req.body);
            await newTrip.save();
            res.json(newTrip);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

   app.delete('/api/trips/:id', requireApiAuth, async (req, res) => {
    try {
        await Trip.findByIdAndDelete(req.params.id);
        res.json({ success: true });

    } catch (err) {
        console.error("DELETE ERROR:", err);

        res.status(500).json({ 
            error: err.message 
        });
    }
});

    // API: Bulk Insert for Restore
    app.post('/api/trips/bulk', requireApiAuth, async (req, res) => {
        try {
            const trips = req.body.trips;
            
            if (!Array.isArray(trips)) {
                return res.status(400).json({ error: 'Invalid data format. Expected array of trips.' });
            }

            if (trips.length === 0) {
                return res.status(400).json({ error: 'No trips to restore.' });
            }

            // Validate trip structure
            const requiredFields = ['date', 'tripId', 'pickup', 'drop', 'km', 'total'];
            for (let trip of trips) {
                for (let field of requiredFields) {
                    if (trip[field] === undefined || trip[field] === null) {
                        return res.status(400).json({ 
                            error: `Invalid trip data. Missing required field: ${field}` 
                        });
                    }
                }
            }

            // Remove _id from trips to allow MongoDB to generate new ones
            const tripsToInsert = trips.map(trip => {
                const { _id, __v, createdAt, ...tripData } = trip;
                return tripData;
            });

            // Insert all trips
            const result = await Trip.insertMany(tripsToInsert, { ordered: false });
            
            res.json({ 
                success: true, 
                inserted: result.length,
                message: `Successfully restored ${result.length} trips.`
            });
        } catch (err) {
            console.error("BULK INSERT ERROR:", err);
            res.status(500).json({ 
                error: err.message,
                inserted: err.insertedDocs ? err.insertedDocs.length : 0
        });
    }
});


    // API: Update Trip
app.put('/api/trips/:id', requireApiAuth, async (req, res) => {
    try {
        const updated = await Trip.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

    // Invoice API (MongoDB only)
    // GET /api/invoice/:month  (month format: YYYY-MM)
    app.get('/api/invoice/:month', requireApiAuth, async (req, res) => {
        try {
            const monthStr = String(req.params.month || '').trim(); // "YYYY-MM"
            if (!/^\d{4}-\d{2}$/.test(monthStr)) {
                return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
            }

            const [year, month] = monthStr.split('-').map(Number);
            const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const end = new Date(year, month, 1, 0, 0, 0, 0); // exclusive

            const trips = await Trip.find({ createdAt: { $gte: start, $lt: end } }).lean();
            const settings = await getSettings();

            const totals = trips.reduce(
                (acc, t) => {
                    const km = Number(t.km) || 0;
                    const rate = Number(t.rate) || settings.rate;
                    const other = Number(t.other) || 0;
                    const cng = Number(t.cng) || 0;
                    const otherExpense = Number(t.otherExpense) || 0;
                    const entryTotal = Number(t.total) || 0;

                    acc.totalTrips += 1;
                    acc.totalKm += km;
                    acc.entryTotal += entryTotal;
                    acc.companyTotal += km * rate;
                    acc.totalCng += cng;
                    acc.totalOtherExpense += otherExpense;
                    acc.netProfit += (km * rate + other) - (cng + otherExpense);
                    return acc;
                },
                {
                    totalTrips: 0,
                    totalKm: 0,
                    entryTotal: 0,
                    companyTotal: 0,
                    totalCng: 0,
                    totalOtherExpense: 0,
                    netProfit: 0
                }
            );

            const companyName = await getCompanyName();

            return res.json({
                companyName,
                month: monthStr,
                totals
            });
        } catch (err) {
            console.error('INVOICE ERROR:', err);
            return res.status(500).json({ error: 'Failed to generate invoice' });
    }
});


    // Serve Frontend
    // Login page
    app.get('/login', (req, res) => {
        if (req.session && req.session.isAuthenticated) {
            return res.redirect(302, '/');
        }
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob:",
            "connect-src 'self' http://localhost:3000"
        ].join('; ');
        res.setHeader('Content-Security-Policy', csp);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.send(`
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Tripset</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .login-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .login-box {
            background: white;
            border-radius: 1.5rem;
            padding: 2.5rem;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
            max-width: 22rem;
            width: 100%;
            text-align: center;
        }
        .login-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 0.5rem;
        }
        .login-subtitle {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 1.5rem;
        }
        .login-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 0.75rem;
            margin-bottom: 1rem;
            font-size: 1rem;
        }
        .login-input:focus {
            outline: none;
            border-color: #F97316;
            box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
        }
        .login-btn {
            width: 100%;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #F97316, #EA580C);
            color: white;
            font-weight: 700;
            border-radius: 0.75rem;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        .login-btn:hover { opacity: 0.95; }
        .error-msg {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.5rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <h2 class="login-title">Tripset</h2>
            <p class="login-subtitle">Login required</p>
            <input id="username" type="text" inputmode="numeric" autocomplete="username" class="login-input" placeholder="Mobile number">
            <input id="password" type="password" inputmode="numeric" autocomplete="current-password" class="login-input" placeholder="Password">
            <button type="button" class="login-btn" onclick="doLogin()">Login</button>
            <p id="errorMsg" class="error-msg"></p>
            <p class="text-xs text-slate-500 mt-4">Authorized user only</p>
        </div>
    </div>
    <script>
        function showError(msg) {
            var err = document.getElementById('errorMsg');
            err.textContent = msg;
            err.style.display = 'block';
        }
        async function doLogin() {
            var u = document.getElementById('username');
            var p = document.getElementById('password');
            var username = (u.value || '').trim();
            var password = (p.value || '').trim();
            if (!username || !password) {
                showError('Enter username & password');
                return;
            }
            try {
                var res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Include cookies for session
                    body: JSON.stringify({ username: username, password: password })
                });
                if (!res.ok) {
                    showError('Invalid login');
                    return;
                }
                p.value = '';
                window.location.href = '/';
            } catch (e) {
                showError('Login failed');
            }
        }
        document.getElementById('password').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doLogin();
        });
        document.getElementById('username').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doLogin();
        });
    </script>
</body>
</html>
        `);
    });

    app.get('/', requireAuth, (req, res) => {
        // CSP tuned to allow only the external CDNs actually used on the page
        // while fixing console errors about blocked fonts and source maps.
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob:",
            "connect-src 'self' http://localhost:3000 https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
        ].join('; ');

        res.setHeader('Content-Security-Policy', csp);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.send(`
    <!DOCTYPE html>
    <html lang="gu">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <title>Tripset (Invoice Build)</title>
        <meta name="description" content="Tripset is a simple and easy to use trip management system for your business.">
        <link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#F97316">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
        <meta name="author" content="Tripkamlesh">
        <meta name="keywords" content="trip, management, system, business, tripset">
        <meta name="robots" content="index, follow">
        <meta name="googlebot" content="index, follow">
        <meta name="google" content="notranslate">

        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>


        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
        
            @import url('https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@300;400;500;600;700&family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Hind Vadodara', 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; }
            .tab-content { display: none; }
            .tab-content.active { display: block; animation: fadeIn 0.4s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
            .welcome-gradient { background: linear-gradient(135deg, #F97316, #EA580C); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; transition: all 0.2s; background-color: white; }
            .input-field:focus { box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2); border-color: #6366f1; }
            .btn-primary { background-color: #4f46e5; color: white; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; transition: all 0.2s; width: 100%; cursor: pointer; }
            .nav-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; cursor: pointer; }
            .nav-btn-active { 
    background-color: #F97316; 
    color: white;
}

            .nav-btn-inactive { color: #cbd5e1; }.dash-card {
        background: white;
        padding: 1.5rem;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 10px 25px rgba(0,0,0,0.04);
        transform: translateY(20px);
        opacity: 0;
        animation: dashIn 0.6s ease forwards;
        transition: all 0.25s ease;
    }

    .dash-card:hover {
        transform: translateY(-6px) scale(1.02);
        box-shadow: 0 20px 35px rgba(79,70,229,0.15);
    }

    .dash-title {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 0.08em;
    }

    .dash-value {
        font-size: 2rem;
        font-weight: 900;
        margin-top: 0.4rem;
        color: #0f172a;
        animation: numberPop 0.35s ease;
    }

    @keyframes dashIn {
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes numberPop {
        0% { transform: scale(0.85); opacity: 0.6; }
        100% { transform: scale(1); opacity: 1; }
    }
    .dash-card:nth-child(1) { animation-delay: 0.05s; }
    .dash-card:nth-child(2) { animation-delay: 0.1s; }
    .dash-card:nth-child(3) { animation-delay: 0.15s; }
    .dash-card:nth-child(4) { animation-delay: 0.2s; }
    .dash-card:nth-child(5) { animation-delay: 0.25s; }
    .dash-card:nth-child(6) { animation-delay: 0.3s; }

    /* DARK MODE */
body.dark {
    background-color: #020617;
    color: #e2e8f0;
}
   body.dark {
    background-color: #020617;
    color: #e2e8f0;
}


/* Ensure all common text elements visible */
body.dark h1,
body.dark h2,
body.dark h3,
body.dark h4,
body.dark h5,
body.dark h6,
body.dark p,
body.dark span,
body.dark label,
body.dark div,
body.dark td,
body.dark th {
    color: #f1f5f9 !important;
}

body.dark nav {
    background-color: #020617;
    border-color: #0f172a;
}

body.dark .bg-white {
    background-color: #0f172a !important;
    color: #e2e8f0;
}

body.dark .bg-slate-50 {
    background-color: #020617 !important;
}

body.dark .text-slate-800,
body.dark .text-slate-900 {
    color: #e2e8f0 !important;
}

body.dark .text-slate-500 {
    color: #94a3b8 !important;
}

body.dark table thead {
    background-color: #020617 !important;
    color: #05080c;
}
    body.dark .dash-value {
    color: #f8fafc !important;
}

body.dark .text-orange-500 {
    color: #818cf8 !important;
}

body.dark .text-emerald-600 {
    color: #34d399 !important;
}

body.dark .text-green-600 {
    color: #34d399 !important;
}


body.dark .dash-card {
    background-color: #121b30;
    border-color: #1e293b;
}

body.dark .input-field {
    background-color: #101424;
    border-color: #1e293b;
    color: #e2e8f0;
}

body.dark .input-field::placeholder {
    color: #64748b;
}

    /* PIN Lock Screen (after login) */
    body > #pinLockScreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483645 !important;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
        align-items: center;
        justify-content: center;
        padding: 1rem;
    }
    #pinLockScreen.hidden { display: none !important; visibility: hidden !important; }
    #appContent { display: none !important; visibility: hidden !important; }

    /* Login Screen (single-user) - SHOW BY DEFAULT */
    body > #loginScreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483646 !important;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: loginFadeIn 0.3s ease-out 1s forwards;
    }
    @keyframes loginFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    #loginScreen.hidden {
        display: none !important;
        visibility: hidden !important;
    }
    #loginScreen.show {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
    }
    .pin-lock-modal {
        background: white;
        border-radius: 1.5rem;
        padding: 2rem 2.5rem;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
        max-width: 22rem;
        width: 100%;
        text-align: center;
    }
    body.dark .pin-lock-modal {
        background: #0f172a;
        border: 1px solid #1e293b;
    }
    .pin-lock-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 0.5rem;
    }
    body.dark .pin-lock-title { color: #f1f5f9; }
    .pin-lock-subtitle {
        font-size: 0.875rem;
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .pin-input {
        width: 100%;
        font-size: 1.5rem;
        letter-spacing: 0.5em;
        text-align: center;
        padding: 0.75rem 1rem;
        border: 2px solid #e2e8f0;
        border-radius: 0.75rem;
        margin-bottom: 1rem;
    }
    .pin-input:focus {
        outline: none;
        border-color: #F97316;
        box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
    }
    .pin-input.error { border-color: #ef4444; }
    @keyframes pinShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(6px); }
    }
    .pin-shake { animation: pinShake 0.4s ease-in-out; }
    .btn-unlock {
        width: 100%;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #F97316, #EA580C);
        color: white;
        font-weight: 700;
        border-radius: 0.75rem;
        border: none;
        cursor: pointer;
        font-size: 1rem;
    }
    .btn-unlock:hover { opacity: 0.95; }
    .pin-set-form .pin-row { margin-bottom: 1rem; }
    #changePinModal .input-field { margin-bottom: 0.75rem; }

    /* Splash Screen */
    #splashScreen {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: opacity 0.5s ease-out;
        animation: splashFadeOut 0.8s ease-out 0.5s forwards;
    }
    @keyframes splashFadeOut {
        to {
            opacity: 0;
            pointer-events: none;
            display: none;
        }
    }
    #splashScreen.hidden {
        opacity: 0;
        pointer-events: none;
        display: none !important;
    }
    .splash-logo {
        font-size: 3rem;
        font-weight: 900;
        color: #F97316;
        margin-bottom: 1rem;
        animation: splashPulse 1.5s ease-in-out infinite;
    }
    @keyframes splashPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
    }
    .splash-loader {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(249,115,22,0.2);
        border-top-color: #F97316;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-top: 2rem;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .splash-text {
        color: #94a3b8;
        font-size: 0.875rem;
        margin-top: 1rem;
        font-weight: 500;
    }

    /* Offline Banner */
    #offlineBanner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 99998;
        background: #ef4444;
        color: white;
        padding: 0.75rem 1rem;
        text-align: center;
        font-weight: 600;
        font-size: 0.875rem;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    #offlineBanner.show {
        transform: translateY(0);
    }
    #offlineBanner.online {
        background: #10b981;
    }

    /* Install Prompt */
    #installPrompt {
        position: fixed;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%) translateY(120%);
        z-index: 99997;
        background: white;
        border-radius: 1rem;
        padding: 1rem 1.5rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        max-width: 90%;
        width: 400px;
        transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border: 2px solid #F97316;
    }
    body.dark #installPrompt {
        background: #0f172a;
        border-color: #F97316;
        color: #e2e8f0;
    }
    #installPrompt.show {
        transform: translateX(-50%) translateY(0);
    }
    .install-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }
    .install-icon {
        font-size: 2rem;
    }
    .install-buttons {
        display: flex;
        gap: 0.5rem;
    }
    .install-btn {
        flex: 1;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        border: none;
    }
    .install-btn-primary {
        background: #F97316;
        color: white;
    }
    .install-btn-secondary {
        background: #e2e8f0;
        color: #0f172a;
    }
    body.dark .install-btn-secondary {
        background: #1e293b;
        color: #e2e8f0;
    }

    /* App-like Transitions */
    .tab-content {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .tab-content:not(.active) {
        opacity: 0;
        transform: translateX(20px);
        pointer-events: none;
    }
    .tab-content.active {
        opacity: 1;
        transform: translateX(0);
}

        </style>
    </head>
   
    <body class="min-h-screen" style="margin:0 !important;padding:0 !important;background-color:#0f172a !important;overflow-x:hidden !important;overflow-y:auto !important;">
        <!-- Splash Screen - HIDDEN BY DEFAULT -->
        <div id="splashScreen" style="display:none !important;opacity:0 !important;pointer-events:none !important;">
            <div class="splash-logo">Tripset</div>
            <div class="splash-loader"></div>
            <div class="splash-text">Loading...</div>
        </div>

        <!-- Offline Banner -->
        <div id="offlineBanner">
            <span id="offlineText">📡 You're offline. Some features may be limited.</span>
        </div>

        <!-- Install Prompt -->
        <div id="installPrompt">
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem;">Install Tripset</div>
                    <div style="font-size: 0.75rem; color: #64748b;">Install app for better experience</div>
                </div>
            </div>
            <div class="install-buttons">
                <button class="install-btn install-btn-primary" id="installBtn">Install</button>
                <button class="install-btn install-btn-secondary" onclick="window.dismissInstallPrompt()">Later</button>
            </div>
        </div>

        <!-- Login Screen (hardcoded single-user) - VISIBLE BY DEFAULT WITH INLINE STYLES -->
        <div id="loginScreen" style="position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100% !important;height:100% !important;z-index:2147483646 !important;display:flex !important;visibility:visible !important;opacity:1 !important;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%) !important;align-items:center !important;justify-content:center !important;padding:1rem !important;">
            <div style="background:white;border-radius:1.5rem;padding:2rem 2.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);max-width:22rem;width:100%;text-align:center;">
                <h2 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:0.5rem;">Tripset</h2>
                <p style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem;">Login required</p>
                <input id="loginUsername" type="text" inputmode="numeric" autocomplete="username" placeholder="Mobile number" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <input id="loginPassword" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Password" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <button type="button" onclick="window.doLogin()" style="width:100%;padding:0.75rem 1.5rem;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-weight:700;border-radius:0.75rem;border:none;cursor:pointer;font-size:1rem;">Login</button>
                <p style="font-size:0.75rem;color:#64748b;margin-top:1rem;">Authorized user only</p>
            </div>
        </div>

        <!-- IMMEDIATE SCRIPT: Hide splash, keep app hidden until auth check -->
        <script>
        console.log('🚀 Immediate script running...');
        (function() {
            try {
                // Force hide splash
                var splash = document.getElementById('splashScreen');
                if (splash) {
                    splash.style.setProperty('display', 'none', 'important');
                    splash.style.setProperty('opacity', '0', 'important');
                    splash.style.setProperty('pointer-events', 'none', 'important');
                    splash.style.setProperty('visibility', 'hidden', 'important');
                    console.log('✅ Splash hidden');
                }
                
                // Hide login screen (will be shown by bootstrapAuth if not authenticated)
                var login = document.getElementById('loginScreen');
                if (login) {
                    login.style.setProperty('display', 'none', 'important');
                    login.style.setProperty('visibility', 'hidden', 'important');
                    console.log('✅ Login screen hidden (will show if not auth)');
                }
                
                // Hide PIN screen
                var pin = document.getElementById('pinLockScreen');
                if (pin) {
                    pin.style.setProperty('display', 'none', 'important');
                    pin.style.setProperty('visibility', 'hidden', 'important');
                }
                
                // Keep app content hidden - bootstrapAuth will show it after auth check
                var app = document.getElementById('appContent');
                if (app) {
                    app.style.setProperty('display', 'none', 'important');
                    app.style.setProperty('visibility', 'hidden', 'important');
                    console.log('✅ App content hidden (waiting for auth)');
                }
                console.log('✅ All elements processed - waiting for bootstrapAuth');
            } catch(e) {
                console.error('❌ Immediate script error:', e);
            }
        })();
        </script>

        <!-- PIN Lock Screen (shown after login, via JS) -->
        <div id="pinLockScreen" class="hidden" style="display:none !important;position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;z-index:2147483645 !important;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);align-items:center;justify-content:center;padding:1rem;">
            <div class="pin-lock-modal" id="pinLockModal">
                <div id="pinEnterMode">
                    <h2 class="pin-lock-title">Tripset</h2>
                    <p class="pin-lock-subtitle">Enter 4-digit PIN</p>
                    <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinInput" class="pin-input" placeholder="••••" autocomplete="off">
                    <button type="button" class="btn-unlock" onclick="window.submitPin()">Unlock</button>
                </div>
                <div id="pinSetMode" class="hidden">
                    <h2 class="pin-lock-title">Set PIN</h2>
                    <p class="pin-lock-subtitle">Create a 4-digit PIN to lock the app</p>
                    <div class="pin-set-form">
                        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinSetInput" class="pin-input" placeholder="New PIN" autocomplete="off">
                        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinSetConfirm" class="pin-input" placeholder="Confirm PIN" autocomplete="off">
                    </div>
                    <button type="button" class="btn-unlock" onclick="window.setPin()">Set PIN &amp; Unlock</button>
                </div>
            </div>
        </div>

        <div id="appContent" style="display:none !important;">
        <nav class="bg-[#020617] text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
            <div class="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
                <div class="text-xl font-extrabold text-orange-500 uppercase italic tracking-tighter">Tripset</div>
                <div class="flex space-x-2 overflow-x-auto no-scrollbar py-2">
            

                    <button id="btn-home" onclick="window.showTab('home')" class="nav-btn nav-btn-active">હોમ</button>
                    <button id="btn-dashboard"
            onclick="window.showTab('dashboard')"
            class="nav-btn nav-btn-inactive">
        ડેશબોર્ડ
    </button>
             

                    <button id="btn-enter-detail" onclick="window.showTab('enter-detail')" class="nav-btn nav-btn-inactive">વિગત</button>
                    <button id="btn-entries" onclick="window.showTab('entries')" class="nav-btn nav-btn-inactive">એન્ટ્રી</button>
                    <button id="btn-company-entries" onclick="window.showTab('company-entries')" class="nav-btn nav-btn-inactive">કંપની</button>
                    <button id="btn-settings" onclick="window.showTab('settings')" class="nav-btn nav-btn-inactive">સેટિંગ્સ</button>

                    <button onclick="window.toggleDarkMode()" 
        class="nav-btn nav-btn-inactive">
    🌙
</button>

                </div>
            </div>
        </nav>
          

        <div class="max-w-7xl mx-auto p-4 md:p-8">
        <div id="settings" class="tab-content max-w-2xl mx-auto">
    <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
        <h2 class="text-2xl font-extrabold mb-6 border-b pb-4 uppercase">⚙ Settings</h2>

        <div class="space-y-5">
            <div>
                <label class="text-xs font-bold uppercase text-slate-500">Company Name</label>
                <input type="text" id="companyName" class="input-field">
            </div>

            <div>
                <label class="text-xs font-bold uppercase text-slate-500">Rate (₹ per KM)</label>
                <input type="number" id="rateSetting" class="input-field">
            </div>

            <button onclick="window.saveSettings()" 
                class="btn-primary py-3 text-lg">
                Save Settings 💾
            </button>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700">💾 Backup & Restore</h3>
                
                <div class="space-y-4">
                    <button onclick="window.downloadBackup()" 
                        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                        📥 Download Backup
                    </button>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-2">
                            Restore Backup (JSON File)
                        </label>
                        <input type="file" 
                               id="backupFileInput" 
                               accept=".json,application/json" 
                               class="hidden"
                               onchange="window.handleRestoreBackup(event)">
                        <button onclick="document.getElementById('backupFileInput').click()" 
                            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                            📤 Restore Backup
                        </button>
                    </div>
                </div>
            </div>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700">🧾 Invoice</h3>
                <button onclick="window.openInvoiceModal()"
                    class="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    🧾 Invoice Generator
                </button>
                <p class="text-xs text-slate-500 mt-2">Select month and download invoice PDF.</p>
            </div>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700">🔒 PIN Lock</h3>
                <button onclick="window.openChangePinModal()" 
                    class="w-full bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    🔑 Change PIN
                </button>
            </div>

            <div class="border-t pt-6 mt-6">
                <button onclick="window.doLogout()" 
                    class="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    🚪 Logout
                </button>
            </div>
        </div>
    </div>
</div>

        <!-- Invoice Modal -->
        <div id="invoiceModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 uppercase">🧾 Invoice Generator</h2>
                        <p class="text-sm text-slate-500 mt-1">Select month and press Enter to download.</p>
                    </div>
                    <button onclick="window.closeInvoiceModal()" class="text-slate-400 hover:text-slate-600 text-xl font-black">✖</button>
                </div>

                <div class="mt-5">
                    <label class="text-xs font-bold uppercase text-slate-500 block mb-2">Select Month</label>
                    <input type="month" id="invoiceMonthModal" class="input-field font-bold">
                </div>

                <div class="flex gap-3 mt-6">
                    <button onclick="window.closeInvoiceModal()"
                        class="flex-1 py-2.5 rounded-lg font-bold border border-slate-300 text-slate-700">
                        Cancel
                    </button>
                    <button onclick="window.generateInvoiceFromModal()"
                        class="flex-1 py-2.5 rounded-lg font-bold bg-orange-500 hover:bg-orange-600 text-white">
                        Download PDF
            </button>
        </div>
    </div>
</div>

         <div id="dashboard" class="tab-content mt-6">
         <div class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">

    <!-- Invoice Generator -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 w-full">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <h2 class="text-lg font-extrabold uppercase text-slate-800">🧾 Invoice Generator</h2>
                <p class="text-slate-500 text-sm mt-1">Generate monthly invoice directly from MongoDB trips.</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div>
                    <label class="text-xs font-bold uppercase text-slate-500 block mb-1">Select Month</label>
                    <input type="month" id="invoiceMonth" class="px-3 py-2 border rounded-lg font-bold">
                </div>
                <button onclick="window.generateInvoice()" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md">
                    Generate Invoice PDF
                </button>
            </div>
        </div>
    </div>

    <div class="flex items-center gap-3">
    <label class="text-xs font-bold uppercase text-slate-500">
        Select Month
    </label>

    <input type="month"
           id="dashMonthFilter"
           onchange="fetchTrips()"
           class="px-3 py-2 border rounded-lg font-bold">
</div>
</div>

<!-- Hidden container used for PDF rendering -->
<div id="invoiceContainer" class="hidden">
  <div id="invoiceContent" class="max-w-3xl mx-auto bg-white text-slate-800 p-8 text-sm leading-relaxed"></div>
</div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div class="dash-card">
                <div class="dash-title">Total Trips</div>
                <div id="dashTrips" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Total KM</div>
                <div id="dashKM" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Entry Total</div>
                <div id="dashEntryTotal" class="dash-value text-emerald-600">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Company Total</div>
                <div id="dashCompanyTotal" class="dash-value text-orange-500">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Today KM</div>
                <div id="dashTodayKM" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Today Amount</div>
                <div id="dashTodayAmt" class="dash-value">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title">Net Profit</div>
                <div id="dashNetProfit" class="dash-value text-green-600">₹0</div>
            </div>

          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-3">
    <h3 class="text-lg font-black mb-4 text-orange-500 uppercase">
        📈 Monthly Analytics
    </h3>

    <div class="flex justify-end mb-3">
        <button onclick="toggleChartType()" 
            class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
            Toggle Chart 📊
        </button>
    </div>

    <canvas id="kmChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-emerald-600 uppercase">
        📅 Daily Trend
    </h3>
    <canvas id="dailyChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-rose-500 uppercase">
        💸 Profit Analysis
    </h3>
    <canvas id="profitChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-orange-500 uppercase">
        📆 Weekly Report
    </h3>
    <canvas id="weeklyChart" height="110"></canvas>
</div>

<div class="dash-card md:col-span-3 bg-indigo-50 border-indigo-100">
    <div class="dash-title text-indigo-700">Monthly Summary</div>

    <div class="flex flex-wrap gap-6 mt-3 text-sm font-bold text-slate-700">

        <div>
            <div class="text-slate-500 text-xs">Month</div>
            <div id="dashMonth">--</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs">Trips</div>
            <div id="dashMonthTrips">0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs">KM</div>
            <div id="dashMonthKM">0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs">Entry Total</div>
            <div id="dashMonthEntry">₹0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs">Company Total</div>
            <div id="dashMonthCompany">₹0</div>
        </div>

    </div>
</div>

        </div>
    </div>
            <div id="home" class="tab-content active py-12 text-center">
                <div class="bg-white max-w-3xl mx-auto rounded-3xl p-10 shadow-sm border border-slate-200">
                    <h1 id="typing-text" class="text-4xl md:text-6xl font-extrabold welcome-gradient min-h-[4rem]"></h1>
                    <p class="text-slate-500 mb-10 text-lg uppercase font-bold tracking-widest">Best Trip Management System </p>
                    <button onclick="window.showTab('enter-detail')" class="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-indigo-700 transition">નવી એન્ટ્રી શરૂ કરો ➔</button>
                </div>
            </div>

            <div id="enter-detail" class="tab-content max-w-3xl mx-auto">
                <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                    <h2 class="text-2xl font-extrabold mb-6 border-b pb-4 text-slate-900 uppercase">ટ્રિપની વિગત ભરો</h2>
                    <form id="tripForm" onsubmit="event.preventDefault(); window.saveToMongo();">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label class="text-xs font-bold uppercase text-slate-500">તારીખ</label><input type="date" id="date" required class="input-field"></div>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="text-xs font-bold uppercase text-slate-500">Pickup સમય</label><input type="time" id="pickupTime" required class="input-field"></div>
                                <div><label class="text-xs font-bold uppercase text-slate-500">Drop સમય</label><input type="time" id="dropTime" required class="input-field"></div>
                            </div>
                            <div class="md:col-span-2"><label class="text-xs font-bold uppercase text-slate-500">આઈડી (Trip ID)</label><input type="text" id="tripId" placeholder="Manual ID" required class="input-field font-mono"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500">ચઢવાનું સ્થળ</label><input type="text" id="pickup" list="locationList" placeholder="Pickup point" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500">ઉતરવાનું સ્થળ</label><input type="text" id="drop" list="locationList" placeholder="Drop point" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500">માણસો</label><input type="number" id="person" value="1" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500">KM</label><input type="number" id="km" step="0.01" value="0" required oninput="window.calculateTotal()" class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500">Rate</label><input type="number" id="rateDisplay" readonly class="input-field bg-slate-100 font-bold" value="21"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500 text-indigo-700">અન્ય (+)</label><input type="number" id="other" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500 text-rose-500">CNG (-)</label><input type="number" id="cng" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field"></div>
                            <div class="md:col-span-2"><label class="text-xs font-bold uppercase text-rose-600">અન્ય ખર્ચ (બાદ થશે -)</label><input type="number" id="otherExpense" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field bg-rose-50"></div>
                            <div class="md:col-span-2 bg-slate-900 p-6 rounded-xl mt-4 flex justify-between items-center text-white font-black"><span class="text-slate-400">TOTAL AMOUNT:</span><span id="totalDisplay" class="text-3xl">₹ 0.00</span></div>
                            <button type="submit" id="saveBtn" class="md:col-span-2 btn-primary py-4 text-lg">Save to MongoDB 💾</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="entries" class="tab-content bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-6 bg-slate-50 flex justify-between items-center border-b">
                    <h2 class="font-black uppercase text-slate-800">એન્ટ્રી લિસ્ટ (જૂની થી નવી)</h2>
                    <button onclick="window.downloadPDF('entries')" class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">📥 PDF</button>
                    <button onclick="window.exportExcel()" 
class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">
📥 Excel
</button>

                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                                <th class="p-4">તારીખ</th>
                                <th class="p-4">ID</th>
                                <th class="p-4 text-center">P</th>
                                <th class="p-4">Route</th>
                                <th class="p-4">KM</th>
                                <th class="p-4">Time</th>
                                <th class="p-4">Other Details</th>
                                <th class="p-4 text-right">Total</th>
                                <th class="p-4 text-center no-pdf">Action</th>
                            </tr>
                        </thead>
                        <tbody id="listBody" class="divide-y text-slate-700"></tbody>
                        <tfoot id="listFoot" class="bg-slate-900 text-white font-bold"></tfoot>
                    </table>
                </div>
            </div>

            <div id="company-entries" class="tab-content bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-6 flex justify-between items-center bg-indigo-900 text-white">
                    <h2 class="text-xl font-extrabold uppercase">કંપની એન્ટ્રી રિપોર્ટ</h2>
                    <div class="flex items-center gap-3">
            <input type="month" id="monthFilter"
                class="px-3 py-2 rounded-lg text-black font-bold">

            <button onclick="window.applyMonthFilter()"
                    class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold">
                Apply
            </button>
        </div>
                    <button onclick="window.downloadPDF('company-entries')" class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold">📁 PDF</button>
                    <button onclick="window.exportExcel()" 
class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">
📥 Excel
</button>

                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th class="p-4">તારીખ</th>
                                <th class="p-4">ID</th>
                                <th class="p-4 text-center">P</th>
                                <th class="p-4">રૂટ</th>
                                <th class="p-4">KM</th>
                                <th class="p-4">સમય</th>
                                <th class="p-4 text-right">ટોટલ (KM × Rate)</th>
                            </tr>
                        </thead>
                        <tbody id="companyTableBody" class="divide-y"></tbody>
                        <tfoot id="companyFoot" class="bg-indigo-900 text-white font-bold"></tfoot>
                    </table>
                </div>
            </div>
        </div>

    <datalist id="locationList">

        <!-- CENTRAL / WEST -->
        <option value="નવરંગપુરા">
        <option value="અંબાવાડી">
        <option value="પાલડી">
        <option value="વસત્રાપુર">
        <option value="બોડકદેવ">
        <option value="પ્રહલાદનગર">
        <option value="સેટેલાઇટ">
        <option value="જોધપુર">
        <option value="થલતેજ">
        <option value="મેમનગર">
        <option value="ઘાટલોડિયા">
        <option value="નારણપુરા">
        <option value="વાડજ">
        <option value="નવા વાડજ">
        <option value="ઉસ્માનપુરા">
        <option value="આશ્રમ રોડ">
        <option value="મીઠાખળી">
        <option value="ગુલબાઈ ટેકરા">
        <option value="અખબારનગર">
        <option value="ડ્રાઇવ-ઇન રોડ">
        <option value="ગુરુકુલ">
        <option value="ઇસ્કોન">
        <option value="અંબલી">
        <option value="શિલાજ">

        <!-- SG HIGHWAY / NEW WEST -->
        <option value="ગોટા">
        <option value="સોલા">
        <option value="ચાંદલોડિયા">
        <option value="ચાંદખેડા">
        <option value="મોટેરા">
        <option value="સાબરમતી">
        <option value="રાણીપ">
        <option value="શેલા">
        <option value="બોપલ">
        <option value="સાઉથ બોપલ">
        <option value="સરખેજ">
        <option value="મકરબા">
        <option value="વેજલપુર">
        <option value="જુહાપુરા">
        <option value="ફતેહવાડી">
        <option value="રામદેવનગર">

        <!-- EAST AHMEDABAD -->
        <option value="માણિનગર">
        <option value="મણિનગર ઇસ્ટ">
        <option value="ખોખરા">
        <option value="હાટકેશ્વર">
        <option value="અમરાઈવાડી">
        <option value="ઓઢવ">
        <option value="વટવા">
        <option value="વટવા GIDC">
        <option value="રખિયાલ">
        <option value="ગોમતીપુર">
        <option value="બાપુનગર">
        <option value="નારોડા">
        <option value="નારોડા રોડ">
        <option value="નિકોલ">
        <option value="ન્યૂ નિકોલ">
        <option value="વસ્ત્રાલ">
        <option value="રામોલ">
        <option value="સી.ટી.એમ">
        <option value="કૃષ્ણનગર">
        <option value="સર્દારનગર">
        <option value="કુબેરનગર">
        <option value="ઠક્કરબાપા નગર">

        <!-- SOUTH AHMEDABAD -->
        <option value="દાણિલીમડા">
        <option value="લાંભા">
        <option value="ઇસનપુર">
        <option value="ઘોડાસર">
        <option value="નરોલ">
        <option value="નરોલ રોડ">
        <option value="બહેરામપુરા">
        <option value="શાહઆલમ">
        <option value="મણીનગર સાઉથ">
        <option value="ઇન્દ્રપુરા">
        <option value="લાંભા ગામ">

        <!-- NORTH AHMEDABAD -->
        <option value="ચાંદખેડા">
        <option value="મોટેરા">
        <option value="સાબરમતી">
        <option value="રાણીપ">
        <option value="અડાલજ રોડ">
        <option value="કોબા રોડ">
        <option value="વિસત">
        <option value="હંસોલ">
        <option value="એરપોર્ટ રોડ">

        <!-- OLD CITY -->
        <option value="કાલુપુર">
        <option value="દરિયાપુર">
        <option value="શાહપુર">
        <option value="જામાલપુર">
        <option value="રાયખડ">
        <option value="ખાડિયા">
        <option value="રિલીફ રોડ">
        <option value="સારંગપુર">
        <option value="રાયપુર">
        <option value="દેલોલપુર">
        <option value="અસ્તોડિયા">
        <option value="ભદ્ર">

        <!-- SANAND / OUTSKIRTS -->
        <option value="સાનંદ">
        <option value="સાનંદ GIDC">
        <option value="ચાંગોદર">
        <option value="તેલાવ">
        <option value="ગોધાવી">
        <option value="મોરૈયા">
        <option value="ખોરજ">
        <option value="ઉતવા">
        <option value="બોલ">
        <option value="સાચાણા">
        <option value="માતોડા">

        <!-- OTHER COMMONLY USED -->
        <option value="નારોલ-વટવા રોડ">
        <option value="એસ.જી. હાઇવે">
        <option value="એસ.પી. રિંગ રોડ">
        <option value="સી.જી. રોડ">
        <option value="રિંગ રોડ">
        <option value="હાઇકોર્ટ રોડ">

    </datalist>

        </div><!-- end appContent -->

        <div id="toast" class="hidden fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-xl shadow-2xl z-[100] font-bold"></div>

         <!-- EDIT MODAL -->
<div id="editModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative">
        <button onclick="window.closeEditModal()" 
                class="absolute top-3 right-3 text-slate-400 text-xl">✖</button>

        <h2 class="text-xl font-black mb-4 text-orange-500 uppercase">
            Edit Trip
        </h2>

        <div class="grid grid-cols-2 gap-3">
            <input id="e-date" type="date" class="input-field">
            <input id="e-tripId" type="text" placeholder="Trip ID" class="input-field">

            <input id="e-pickup" type="text" placeholder="Pickup" class="input-field">
            <input id="e-drop" type="text" placeholder="Drop" class="input-field">

            <input id="e-person" type="number" placeholder="Persons" class="input-field">
            <input id="e-km" type="number" step="0.01" placeholder="KM" class="input-field">

            <input id="e-other" type="number" step="0.01" placeholder="Other (+)" class="input-field">
            <input id="e-cng" type="number" step="0.01" placeholder="CNG (-)" class="input-field">

            <input id="e-exp" type="number" step="0.01" placeholder="Other Expense (-)" class="input-field">

            <div class="col-span-2 bg-slate-900 text-white p-4 rounded-xl flex justify-between">
                <span class="text-slate-400 font-bold">Total</span>
                <span id="e-total" class="font-black text-xl">₹ 0.00</span>
            </div>

            <button onclick="window.updateTrip()" 
                    class="col-span-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black">
                Update Trip 🔄
            </button>
        </div>
    </div>
</div>

        <!-- Change PIN Modal -->
        <div id="changePinModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                <h2 class="text-xl font-black mb-4 text-slate-800 uppercase">🔑 Change PIN</h2>
                <input type="password" inputmode="numeric" maxlength="4" id="changePinCurrent" class="input-field" placeholder="Current PIN" autocomplete="off">
                <input type="password" inputmode="numeric" maxlength="4" id="changePinNew" class="input-field" placeholder="New PIN" autocomplete="off">
                <input type="password" inputmode="numeric" maxlength="4" id="changePinConfirm" class="input-field" placeholder="Confirm New PIN" autocomplete="off">
                <div class="flex gap-3 mt-4">
                    <button onclick="window.closeChangePinModal()" class="flex-1 py-2 rounded-lg font-bold border border-slate-300 text-slate-700">Cancel</button>
                    <button onclick="window.saveNewPin()" class="flex-1 py-2 rounded-lg font-bold bg-orange-500 text-white">Save PIN</button>
        </div>
    </div>
</div>

        <script>
        'use strict';
        // Enhanced error handler - suppress known browser extension errors

        
        // Suppress console warnings from Tailwind CDN (development only)
        var originalWarn = console.warn;
        console.warn = function() {
            var args = Array.prototype.slice.call(arguments);
            var message = String(args.join(' '));
            if (message.includes('cdn.tailwindcss.com should not be used in production') ||
                message.includes('tailwindcss.com/docs/installation')) {
                return; // Suppress Tailwind CDN warning
            }
            originalWarn.apply(console, args);
        };
        
        // Also suppress console.log for Tailwind warning (some browsers use log instead)
        var originalLog = console.log;
        console.log = function() {
            var args = Array.prototype.slice.call(arguments);
            var message = String(args.join(' '));
            if (message.includes('cdn.tailwindcss.com should not be used in production') ||
                message.includes('tailwindcss.com/docs/installation')) {
                return;
            }
            originalLog.apply(console, args);
        };
        
        console.log("SCRIPT LOADED ✅ (Invoice Build)");

        var appInitialized = false;

        function setDisplayImportant(el, value) {
            if (!el) return;
            el.style.setProperty('display', value, 'important');
        }

        function setVisibilityImportant(el, value) {
            if (!el) return;
            el.style.setProperty('visibility', value, 'important');
        }

        function setBodyScrollLocked(locked) {
            if (!document.body) return;
            if (locked) {
                document.body.style.setProperty('overflow', 'hidden', 'important');
                document.body.style.setProperty('height', '100vh', 'important');
            } else {
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.body.style.setProperty('overflow-x', 'hidden', 'important');
                document.body.style.setProperty('overflow-y', 'auto', 'important');
                document.body.style.removeProperty('height');
            }
        }

        function hideSplashNow() {
            var splash = document.getElementById('splashScreen');
            if (!splash) return;
            splash.classList.add('hidden');
            setTimeout(function() {
                splash.style.display = 'none';
            }, 250);
        }

        function showLoginScreen() {
            console.log('🔐 showLoginScreen: Showing login screen');
            var login = document.getElementById('loginScreen');
            var lock = document.getElementById('pinLockScreen');
            var appContent = document.getElementById('appContent');
            if (!login) {
                console.error('🔐 showLoginScreen: loginScreen element not found!');
                return;
            }
            if (lock) { lock.classList.add('hidden'); setDisplayImportant(lock, 'none'); }
            if (appContent) {
                setDisplayImportant(appContent, 'none');
                setVisibilityImportant(appContent, 'hidden');
            }
            setBodyScrollLocked(true);
            // Force show login screen
            login.classList.add('show');
            setDisplayImportant(login, 'flex');
            setVisibilityImportant(login, 'visible');
            hideSplashNow();
            setTimeout(function() {
                var u = document.getElementById('loginUsername');
                if (u) u.focus();
            }, 80);
        }

        function showPinScreen(pinSet) {
            var login = document.getElementById('loginScreen');
            var lock = document.getElementById('pinLockScreen');
            var appContent = document.getElementById('appContent');
            var enterMode = document.getElementById('pinEnterMode');
            var setMode = document.getElementById('pinSetMode');

            if (login) login.classList.remove('show');
            if (appContent) {
                setDisplayImportant(appContent, 'none');
                setVisibilityImportant(appContent, 'hidden');
            }

            if (!lock) return;
            lock.classList.remove('hidden');
            setDisplayImportant(lock, 'flex');
            setVisibilityImportant(lock, 'visible');
            setBodyScrollLocked(true);

            if (pinSet) {
                if (enterMode) enterMode.classList.remove('hidden');
                if (setMode) setMode.classList.add('hidden');
                setTimeout(function() { var el = document.getElementById('pinInput'); if (el) el.focus(); }, 100);
            } else {
                if (enterMode) enterMode.classList.add('hidden');
                if (setMode) setMode.classList.remove('hidden');
                setTimeout(function() { var el = document.getElementById('pinSetInput'); if (el) el.focus(); }, 100);
            }

            hideSplashNow();
        }

        window.getRate = function() { return (window.appSettings && window.appSettings.rate) || 21; };

        function initApp() {
            if (appInitialized) return;
            appInitialized = true;
            window.appSettings = { rate: 21, companyName: 'Tripset', darkMode: 'off', installPromptShown: false };
            window.loadSettings().then(function() {
                var today = new Date();
                var currentMonth = today.toISOString().slice(0, 7);
                var dashFilter = document.getElementById('dashMonthFilter');
                if (dashFilter) dashFilter.value = currentMonth;
                var invoiceMonth = document.getElementById('invoiceMonth');
                if (invoiceMonth) invoiceMonth.value = currentMonth;
                fetchTrips();
                window.startTypingEffect();
            }).catch(function(err) {
                console.error('loadSettings failed:', err);
                fetchTrips();
                window.startTypingEffect();
            });
        }

        window.unlockScreen = function() {
            var login = document.getElementById('loginScreen');
            var el = document.getElementById('pinLockScreen');
            var appEl = document.getElementById('appContent');
            var splash = document.getElementById('splashScreen');
            if (login) {
                login.classList.remove('show');
                setDisplayImportant(login, 'none');
                setVisibilityImportant(login, 'hidden');
            }
            if (el) {
                el.classList.add('hidden');
                setDisplayImportant(el, 'none');
                setVisibilityImportant(el, 'hidden');
            }
            if (splash) {
                splash.classList.add('hidden');
                setDisplayImportant(splash, 'none');
                setVisibilityImportant(splash, 'hidden');
            }
            if (appEl) {
                setDisplayImportant(appEl, 'block');
                setVisibilityImportant(appEl, 'visible');
            }
            setBodyScrollLocked(false);
            initApp();
        };

        window.doLogin = async function() {
            // Auth removed - no-op function to prevent errors if login button is somehow clicked
            console.log('Login attempted but auth is disabled');
        };

        window.doLogout = async function() {
            try {
                await fetch('/auth/logout', { method: 'POST' });
            } catch (e) {}
            location.reload();
        };

        window.bootstrapAuth = async function() {
            try {
                console.log('🔐 bootstrapAuth: Checking auth status...');
                var res = await fetch('/api/auth/status', { 
                    cache: 'no-store',
                    credentials: 'include' // Include cookies for session
                });
                if (!res.ok) {
                    console.log('🔐 bootstrapAuth: Status check failed (HTTP ' + res.status + '), redirecting to login');
                    window.location.href = '/login';
                    return;
                }
                var s = await res.json();
                console.log('🔐 bootstrapAuth: Status response:', JSON.stringify(s));
                if (!s.isAuthenticated) {
                    console.log('🔐 bootstrapAuth: Not authenticated, redirecting to login');
                    window.location.href = '/login';
                    return;
                }
                // User is authenticated - show app
                console.log('🔐 bootstrapAuth: Authenticated, showing app');
                window.unlockScreen();
            } catch (e) {
                console.error('🔐 bootstrapAuth: Error:', e);
                window.location.href = '/login';
            }
        };

        window.submitPin = async function() {
            var input = document.getElementById('pinInput');
            if (!input) return;
            var val = (input.value || '').trim();
            if (val.length !== 4 || !/^\d{4}$/.test(val)) {
                showToast('Please enter 4 digits');
                return;
            }
            try {
                var res = await fetch('/api/pin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: val })
                });
                if (!res.ok) {
                    input.classList.add('error', 'pin-shake');
                    input.value = '';
                    input.focus();
                    showToast('Wrong PIN');
                    setTimeout(function() {
                        input.classList.remove('pin-shake');
                        setTimeout(function() { input.classList.remove('error'); }, 400);
                    }, 400);
                    return;
                }
                input.value = '';
                window.unlockScreen();
            } catch (e) {
                showToast('PIN verify failed');
            }
        };

        window.setPin = async function() {
            var inp = document.getElementById('pinSetInput');
            var conf = document.getElementById('pinSetConfirm');
            if (!inp || !conf) return;
            var a = (inp.value || '').trim();
            var b = (conf.value || '').trim();
            if (a.length !== 4 || !/^\d{4}$/.test(a)) {
                showToast('Enter 4 digits for PIN');
                return;
            }
            if (a !== b) {
                showToast('PINs do not match');
                conf.classList.add('error', 'pin-shake');
                setTimeout(function() {
                    conf.classList.remove('pin-shake');
                    setTimeout(function() { conf.classList.remove('error'); }, 400);
                }, 400);
                return;
            }
            try {
                var res = await fetch('/api/pin/set', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: a })
                });
                if (!res.ok) {
                    showToast('PIN set failed');
                    return;
                }
                inp.value = ''; conf.value = '';
                showToast('PIN set');
                window.unlockScreen();
            } catch (e) {
                showToast('PIN set failed');
            }
        };

        window.openChangePinModal = function() {
            var m = document.getElementById('changePinModal');
            if (m) m.classList.remove('hidden');
            document.getElementById('changePinCurrent').value = '';
            document.getElementById('changePinNew').value = '';
            document.getElementById('changePinConfirm').value = '';
        };

        window.closeChangePinModal = function() {
            var m = document.getElementById('changePinModal');
            if (m) m.classList.add('hidden');
        };

        window.saveNewPin = function() {
            var cur = document.getElementById('changePinCurrent');
            var newPin = document.getElementById('changePinNew');
            var conf = document.getElementById('changePinConfirm');
            if (!cur || !newPin || !conf) return;
            var c = (cur.value || '').trim();
            var n = (newPin.value || '').trim();
            var co = (conf.value || '').trim();
            if (n.length !== 4 || !/^\d{4}$/.test(n)) {
                showToast('New PIN must be 4 digits');
                return;
            }
            if (n !== co) {
                showToast('New PINs do not match');
                return;
            }
            (async function() {
                try {
                    var res = await fetch('/api/pin/change', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPin: c, newPin: n })
                    });
                    if (!res.ok) {
                        showToast('Current PIN is wrong');
                        cur.classList.add('error', 'pin-shake');
                        setTimeout(function() { cur.classList.remove('pin-shake', 'error'); }, 400);
                        return;
                    }
                    cur.value = ''; newPin.value = ''; conf.value = '';
                    window.closeChangePinModal();
                    showToast('PIN changed');
                } catch (e) {
                    showToast('PIN change failed');
                }
            })();
        };

        document.addEventListener('DOMContentLoaded', function() {
            var loginU = document.getElementById('loginUsername');
            var loginP = document.getElementById('loginPassword');
            if (loginU) loginU.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.doLogin(); });
            if (loginP) loginP.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.doLogin(); });

            var pinInput = document.getElementById('pinInput');
            if (pinInput) {
                pinInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') window.submitPin();
                });
            }
            var pinSetConfirm = document.getElementById('pinSetConfirm');
            if (pinSetConfirm) {
                pinSetConfirm.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') window.setPin();
                });
            }

            var invModal = document.getElementById('invoiceMonthModal');
            if (invModal) {
                invModal.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        window.generateInvoiceFromModal();
                    }
                });
            }
        });

        // Splash Screen Logic - stays visible until PIN unlock
        function hideSplashScreen() {
            var splash = document.getElementById('splashScreen');
            var lockScreen = document.getElementById('pinLockScreen');
            // Only hide if PIN screen is not showing (already unlocked)
            if (splash && lockScreen && lockScreen.style.display === 'none') {
                splash.classList.add('hidden');
                setTimeout(function() {
                    splash.style.display = 'none';
                }, 500);
            }
        }

        // Offline Detection
        function initOfflineDetection() {
            var banner = document.getElementById('offlineBanner');
            var offlineText = document.getElementById('offlineText');
            if (!banner) return;

            function updateOnlineStatus() {
                if (navigator.onLine) {
                    banner.classList.remove('show');
                    banner.classList.add('online');
                    if (offlineText) offlineText.textContent = '✅ Back online!';
                    setTimeout(function() {
                        banner.classList.remove('show');
                        setTimeout(function() {
                            banner.classList.remove('online');
                            if (offlineText) offlineText.textContent = "📡 You're offline. Some features may be limited.";
                        }, 2000);
                    }, 3000);
                } else {
                    banner.classList.add('show');
                    banner.classList.remove('online');
                    if (offlineText) offlineText.textContent = "📡 You're offline. Some features may be limited.";
                }
            }

            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            updateOnlineStatus();
        }

        // Install Prompt Logic (MongoDB only)
        var deferredPrompt = null;

        function showInstallPromptIfNeeded() {
            if (window.appSettings && window.appSettings.installPromptShown) return;
            if (deferredPrompt) {
                var prompt = document.getElementById('installPrompt');
                if (prompt) prompt.classList.add('show');
            }
        }

        function saveInstallPromptShown() {
            fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ installPromptShown: true })
            }).then(function() {
                if (window.appSettings) window.appSettings.installPromptShown = true;
            }).catch(function() {});
        }

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            if (!(window.appSettings && window.appSettings.installPromptShown)) {
                setTimeout(showInstallPromptIfNeeded, 3000);
            }
        });

        window.addEventListener('appinstalled', function() {
            var prompt = document.getElementById('installPrompt');
            if (prompt) prompt.classList.remove('show');
            deferredPrompt = null;
            saveInstallPromptShown();
            showToast('App installed successfully! 🎉');
        });

        document.getElementById('installBtn') && document.getElementById('installBtn').addEventListener('click', function() {
            if (!deferredPrompt) {
                showToast('Installation not available');
                return;
            }
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choiceResult) {
                if (choiceResult.outcome === 'accepted') showToast('Installing app...');
                deferredPrompt = null;
                var prompt = document.getElementById('installPrompt');
                if (prompt) prompt.classList.remove('show');
                saveInstallPromptShown();
            });
        });

        window.dismissInstallPrompt = function() {
            var prompt = document.getElementById('installPrompt');
            if (prompt) prompt.classList.remove('show');
            saveInstallPromptShown();
        };

        // Auth removed: load app directly so clicks work
        var loginScreen = document.getElementById('loginScreen');
        var pinLockScreen = document.getElementById('pinLockScreen');
        var appContent = document.getElementById('appContent');

        function startAuthFlow() {
            initOfflineDetection();
            setTimeout(function() {
                if (window.bootstrapAuth) {
                    window.bootstrapAuth().catch(function(err) {
                        console.error('🔐 startAuthFlow: bootstrapAuth error:', err);
                        window.location.href = '/login';
                    });
                } else {
                    console.error('🔐 startAuthFlow: bootstrapAuth function not found!');
                    window.location.href = '/login';
                }
            }, 200);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startAuthFlow);
        } else {
            startAuthFlow();
        }

        let kmChartInstance = null;
let currentChartType = 'line';
let dailyChartInstance = null;
let profitChartInstance = null;
let weeklyChartInstance = null;

// Enhanced Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
            console.log("SW Registered ✅");
            
            // Check for updates periodically
            setInterval(function() {
                registration.update();
            }, 60000); // Check every minute
            
            // Handle updates
            registration.addEventListener('updatefound', function() {
                var newWorker = registration.installing;
                newWorker.addEventListener('statechange', function() {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker available
                        showToast('New version available! Refresh to update.', 5000);
                    }
                });
            });
        })
        .catch(function(err) {
            console.log("SW Registration failed (this is OK if sw.js doesn't exist):", err);
        });
    
    // Listen for controller change (app updated)
    navigator.serviceWorker.addEventListener('controllerchange', function() {
        window.location.reload();
    });
}


function renderWeeklyChart(data) {

    const monthInput = document.getElementById('dashMonthFilter');
    if (!monthInput?.value) return;

    const [year, month] = monthInput.value.split('-');
    const rate = window.getRate ? window.getRate() : 21;

    const weekly = {
        W1: { trips: 0, km: 0, revenue: 0, profit: 0 },
        W2: { trips: 0, km: 0, revenue: 0, profit: 0 },
        W3: { trips: 0, km: 0, revenue: 0, profit: 0 },
        W4: { trips: 0, km: 0, revenue: 0, profit: 0 },
        W5: { trips: 0, km: 0, revenue: 0, profit: 0 }
    };

    data.forEach(e => {

        if (!e.date) return;

        const parts = e.date.split('-'); // dd-mm-yyyy
        if (parts.length !== 3) return;


        if (parts[1] !== month || parts[2] !== year) return;

        const day = parseInt(parts[0]);
        const week =
            day <= 7 ? 'W1' :
            day <= 14 ? 'W2' :
            day <= 21 ? 'W3' :
            day <= 28 ? 'W4' : 'W5';

        const km = parseFloat(e.km || 0);
        const revenue = parseFloat(e.total || 0);
        const cng = parseFloat(e.cng || 0);
        const exp = parseFloat(e.otherExpense || 0);

        weekly[week].trips += 1;
        weekly[week].km += km;
        weekly[week].revenue += revenue;
        weekly[week].profit += revenue - cng - exp;
    });

    const labels = Object.keys(weekly);
    const tripsData = labels.map(w => weekly[w].trips);
    const kmData = labels.map(w => weekly[w].km.toFixed(2));
    const revenueData = labels.map(w => weekly[w].revenue.toFixed(2));
    const profitData = labels.map(w => weekly[w].profit.toFixed(2));

    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    if (weeklyChartInstance) weeklyChartInstance.destroy();

    weeklyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Trips', data: tripsData },
                { label: 'KM', data: kmData },
                { label: 'Revenue ₹', data: revenueData },
                { label: 'Profit ₹', data: profitData }
            ]
        }
    });
}


function renderProfitChart(data) {

    const monthly = {};

    data.forEach(e => {
        if (!e.date) return;

        const parts = e.date.split('-'); // dd-mm-yyyy
        const key = parts[1] + "-" + parts[2];

        const revenue = parseFloat(e.total || 0);
        const cng = parseFloat(e.cng || 0);
        const exp = parseFloat(e.otherExpense || 0);

        if (!monthly[key]) monthly[key] = 0;

        monthly[key] += revenue - cng - exp;
    });

    const labels = Object.keys(monthly);
    const values = labels.map(m => monthly[m].toFixed(2));

    const ctx = document.getElementById('profitChart');
    if (!ctx) return;

    if (profitChartInstance) profitChartInstance.destroy();

    profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Profit ₹',
                data: values
            }]
        }
    });
}


function renderDailyChart(data) {

    const monthInput = document.getElementById('dashMonthFilter');
    if (!monthInput?.value) return;

    const [year, month] = monthInput.value.split('-');

    const daily = {};

    data.forEach(e => {
        if (!e.date) return;

        const parts = e.date.split('-'); // dd-mm-yyyy
        if (parts[1] !== month || parts[2] !== year) return;

        const day = parts[0];
        const km = parseFloat(e.km || 0);
        const amt = parseFloat(e.total || 0);

        if (!daily[day]) daily[day] = { km: 0, revenue: 0 };

        daily[day].km += km;
        daily[day].revenue += amt;
    });

    const labels = Object.keys(daily).sort((a,b)=>a-b);
    const kmVals = labels.map(d => daily[d].km.toFixed(2));
    const revVals = labels.map(d => daily[d].revenue.toFixed(2));

    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    if (dailyChartInstance) dailyChartInstance.destroy();

    dailyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'KM', data: kmVals, tension: 0.3 },
                { label: 'Revenue ₹', data: revVals, tension: 0.3 }
            ]
        }
    });
}


function renderKMChart(data) {

    const rate = window.getRate ? window.getRate() : 21;

    const monthlyData = {};

    data.forEach(e => {
        if (!e.date) return;

        const parts = e.date.split('-'); // dd-mm-yyyy
        if (parts.length !== 3) return;

        const key = parts[1] + "-" + parts[2]; // mm-yyyy
        const km = parseFloat(e.km || 0);
        const amt = parseFloat(e.total || 0);

        if (!monthlyData[key]) {
            monthlyData[key] = { km: 0, revenue: 0 };
        }

        monthlyData[key].km += km;
        monthlyData[key].revenue += amt;
    });

    const labels = Object.keys(monthlyData);
    const kmValues = labels.map(m => monthlyData[m].km.toFixed(2));
    const revenueValues = labels.map(m => monthlyData[m].revenue.toFixed(2));

    const ctx = document.getElementById('kmChart');
    if (!ctx) return;

    // ✅ Destroy old chart (important)
    if (kmChartInstance) kmChartInstance.destroy();

    kmChartInstance = new Chart(ctx, {
type: currentChartType,
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total KM',
                    data: kmValues,
                    tension: 0.3
                },
                {
                    label: 'Revenue ₹',
                    data: revenueValues,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

function toggleChartType() {

    if (!window.currentTrips) {
        showToast("No data for chart ❌");
        return;
    }

    currentChartType =
        currentChartType === 'line' ? 'bar' : 'line';

    console.log("Chart Type:", currentChartType);

    renderKMChart(window.currentTrips);
}


        // ✅ Load Settings (MongoDB only)
window.loadSettings = async function() {
    try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const s = await res.json();
        window.appSettings = {
            rate: Number(s.rate) || 21,
            companyName: String(s.companyName || 'Tripset'),
            darkMode: String(s.darkMode || 'off'),
            installPromptShown: !!s.installPromptShown
        };
        var rateEl = document.getElementById('rateSetting');
        var companyEl = document.getElementById('companyName');
        var rateDisplay = document.getElementById('rateDisplay');
        if (rateEl) rateEl.value = window.appSettings.rate;
        if (companyEl) companyEl.value = window.appSettings.companyName;
        if (rateDisplay) rateDisplay.value = window.appSettings.rate;
        if (window.appSettings.darkMode === 'on') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        return window.appSettings;
    } catch (e) {
        console.error('loadSettings error:', e);
        window.appSettings = window.appSettings || { rate: 21, companyName: 'Tripset', darkMode: 'off', installPromptShown: false };
        return window.appSettings;
    }
};

// ✅ Save Settings (MongoDB only)
window.saveSettings = async function() {
    const rate = document.getElementById('rateSetting').value || 21;
    const company = document.getElementById('companyName').value || '';

    try {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ rate: Number(rate), companyName: company })
        });
        if (!res.ok) throw new Error('Failed to save');
        const s = await res.json();
        window.appSettings.rate = Number(s.rate) || 21;
        window.appSettings.companyName = String(s.companyName || 'Tripset');
        var rateDisplay = document.getElementById('rateDisplay');
        if (rateDisplay) rateDisplay.value = window.appSettings.rate;
        showToast("Settings Saved ✅");
    } catch (e) {
        showToast("Failed to save settings ❌");
    }
};


window.exportExcel = async function () {

    showToast("Preparing Company Excel... ⏳");

    const res = await fetch('/api/trips');
    const data = await res.json();

    if (!data.length) {
        showToast("No data found ❌");
        return;
    }

    const rate = window.getRate ? window.getRate() : 21;
    const excelData = data.map(e => {
        const km = parseFloat(e.km || 0);
        return {
            Date: e.date,
            TripID: e.tripId,
            Pickup: e.pickup,
            Drop: e.drop,
            Person: e.person,
            KM: km,
            Rate: rate,
            CompanyTotal: (km * rate).toFixed(2)
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company Report");

    XLSX.writeFile(wb, "Company_Report.xlsx");

    showToast("Company Excel Downloaded ✅");
};

// ✅ Download Backup Function
window.downloadBackup = async function() {
    try {
        showToast("Preparing backup... ⏳");
        
        const res = await fetch('/api/trips');
        if (!res.ok) {
            throw new Error('Failed to fetch trips');
        }
        
        const data = await res.json();
        
        if (!data || data.length === 0) {
            showToast("No trips to backup ❌");
            return;
        }

        // Create backup object with metadata
        const backup = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            totalTrips: data.length,
            trips: data
        };

        // Convert to JSON string with formatting
        const jsonString = JSON.stringify(backup, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`trips_backup_\${new Date().toISOString().split('T')[0]}.json\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(\`Backup downloaded: \${data.length} trips ✅\`);
    } catch (err) {
        console.error("Backup error:", err);
        showToast("Failed to download backup ❌");
    }
};

// ✅ Restore Backup Function
window.handleRestoreBackup = async function(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Validate file type
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        showToast("Invalid file type. Please select a JSON file ❌");
        event.target.value = ''; // Reset input
        return;
    }

    try {
        showToast("Reading backup file... ⏳");
        
        // Read file as text
        const fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });

        // Parse JSON
        let backupData;
        try {
            backupData = JSON.parse(fileContent);
        } catch (parseError) {
            showToast("Invalid JSON format ❌");
            event.target.value = '';
            return;
        }

        // Validate backup structure
        let trips = [];
        if (Array.isArray(backupData)) {
            // If it's a direct array of trips
            trips = backupData;
        } else if (backupData.trips && Array.isArray(backupData.trips)) {
            // If it's a backup object with trips array
            trips = backupData.trips;
        } else {
            showToast("Invalid backup format. Expected array of trips ❌");
            event.target.value = '';
            return;
        }

        if (trips.length === 0) {
            showToast("Backup file is empty ❌");
            event.target.value = '';
            return;
        }

        // Validate trip structure
        const requiredFields = ['date', 'tripId', 'pickup', 'drop', 'km', 'total'];
        const invalidTrips = [];
        
        trips.forEach((trip, index) => {
            for (let field of requiredFields) {
                if (trip[field] === undefined || trip[field] === null) {
                    invalidTrips.push(\`Trip \${index + 1}: missing \${field}\`);
                }
            }
        });

        if (invalidTrips.length > 0) {
            showToast(\`Invalid trip data: \${invalidTrips[0]} ❌\`);
            event.target.value = '';
            return;
        }

        // Confirm restore
        const confirmMessage = \`Restore \${trips.length} trips? This will add them to your database.\`;
        if (!confirm(confirmMessage)) {
            event.target.value = '';
            return;
        }

        showToast(\`Restoring \${trips.length} trips... ⏳\`);

        // Send to API
        const res = await fetch('/api/trips/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ trips: trips })
        });

        const result = await res.json();

        if (res.ok) {
            showToast(\`Successfully restored \${result.inserted} trips ✅\`);
            // Refresh trips list
            if (window.fetchTrips) {
                setTimeout(() => {
                    fetchTrips();
                }, 500);
            }
        } else {
            showToast(\`Restore failed: \${result.error || 'Unknown error'} ❌\`);
            if (result.inserted > 0) {
                showToast(\`Note: \${result.inserted} trips were inserted before error.\`);
            }
        }

        // Reset file input
        event.target.value = '';
    } catch (err) {
        console.error("Restore error:", err);
        showToast("Failed to restore backup ❌");
        event.target.value = '';
    }
};


        /* DARK MODE TOGGLE (MongoDB only) */
window.toggleDarkMode = async function() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    try {
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ darkMode: isDark ? 'on' : 'off' })
        });
        if (window.appSettings) window.appSettings.darkMode = isDark ? 'on' : 'off';
    } catch (e) {}
    showToast(isDark ? "Dark Mode ON 🌙" : "Light Mode ☀️");
};

/* LOAD SAVED MODE - now handled inside loadSettings */
window.loadDarkMode = function() { /* No-op; loadSettings applies darkMode */ };

        window.editingId = null;


window.openEditModal = function(id) {
    if (!id) {
        console.error("Edit: No ID provided");
        showToast("Error: No trip ID provided ❌");
        return;
    }
    
    if (!window.currentTrips) {
        showToast("Trips not loaded yet. Please wait... ❌");
        return;
    }
    
    const trip = window.currentTrips.find(t => t._id === id);
    if (!trip) {
        console.error("Edit: Trip not found with ID:", id);
        showToast("Trip not found ❌");
        return;
    }

    const modal = document.getElementById('editModal');
    if (!modal) {
        console.error("Edit: Modal element not found");
        return;
    }

    modal.classList.remove('hidden');

    document.getElementById('e-date').value = convertDMYtoYMD(trip.date);
    document.getElementById('e-tripId').value = trip.tripId || '';
    document.getElementById('e-pickup').value = trip.pickup || '';
    document.getElementById('e-drop').value = trip.drop || '';
    document.getElementById('e-person').value = trip.person || 0;
    document.getElementById('e-km').value = trip.km || 0;
    document.getElementById('e-other').value = trip.other || 0;
    document.getElementById('e-cng').value = trip.cng || 0;
    document.getElementById('e-exp').value = trip.otherExpense || 0;

    calcEditTotal();
    window.editingId = id;
};
function convertDMYtoYMD(dmy) {
    if (!dmy) return "";
    const parts = dmy.split("-");
    if (parts.length !== 3) return "";
    return parts[2] + "-" + parts[1] + "-" + parts[0];
}
    function calcEditTotal() {
    const km = parseFloat(document.getElementById('e-km').value) || 0;
    const other = parseFloat(document.getElementById('e-other').value) || 0;
    const cng = parseFloat(document.getElementById('e-cng').value) || 0;
    const exp = parseFloat(document.getElementById('e-exp').value) || 0;
    const rate = window.getRate ? window.getRate() : 21;
    const total = (km * rate + other) - cng - exp;

    document.getElementById('e-total').innerText =
        "₹ " + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
window.updateTrip = async function() {
    if (!window.editingId) return;

    const km = parseFloat(document.getElementById('e-km').value) || 0;
    const other = parseFloat(document.getElementById('e-other').value) || 0;
    const cng = parseFloat(document.getElementById('e-cng').value) || 0;
    const exp = parseFloat(document.getElementById('e-exp').value) || 0;
    const rate = window.getRate ? window.getRate() : 21;
    const total = (km * rate + other) - cng - exp;

    const payload = {
        date: window.formatDateToDMY(document.getElementById('e-date').value),
        tripId: document.getElementById('e-tripId').value,
        pickup: document.getElementById('e-pickup').value,
        drop: document.getElementById('e-drop').value,
        person: parseInt(document.getElementById('e-person').value) || 0,
        km,
        other,
        cng,
        otherExpense: exp,
        total: total.toFixed(2)
    };

    const res = await fetch('/api/trips/' + window.editingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showToast("Trip Updated ✅");
        window.closeEditModal();
        fetchTrips();
    }
};


window.closeEditModal = function() {
    document.getElementById('editModal').classList.add('hidden');
    window.editingId = null;
};



            let typingTimeout;

            window.formatDateToDMY = function(dateStr) {
                if(!dateStr) return "";
                const parts = dateStr.split('-');
                if(parts.length !== 3) return dateStr;
                return parts[2] + "-" + parts[1] + "-" + parts[0];
            };

            window.calculateTotal = function() {
                const km = parseFloat(document.getElementById('km').value) || 0;
                const other = parseFloat(document.getElementById('other').value) || 0;
                const cng = parseFloat(document.getElementById('cng').value) || 0;
                const otherExp = parseFloat(document.getElementById('otherExpense').value) || 0;
                const rate = window.getRate ? window.getRate() : 21;
                const total = (km * rate + other) - cng - otherExp;
                document.getElementById('totalDisplay').innerText = "₹ " + total.toLocaleString('en-IN', {minimumFractionDigits: 2});
            };

           window.showTab = function(id) {
    // Smooth transition: fade out current tab
    var currentActive = document.querySelector('.tab-content.active');
    if (currentActive && currentActive.id !== id) {
        currentActive.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        currentActive.style.opacity = '0';
        currentActive.style.transform = 'translateX(-10px)';
        
        setTimeout(function() {
            // Remove active class after fade out
            document.querySelectorAll('.tab-content')
                .forEach(c => c.classList.remove('active'));
            
            // Update nav buttons
            document.querySelectorAll('.nav-btn')
                .forEach(btn => {
                    btn.classList.remove('nav-btn-active');
                    btn.classList.add('nav-btn-inactive');
                });
            
            var activeBtn = document.getElementById('btn-' + id);
            if (activeBtn) {
                activeBtn.classList.remove('nav-btn-inactive');
                activeBtn.classList.add('nav-btn-active');
            }
            
            // Show new tab with fade in
            var newTab = document.getElementById(id);
            if (newTab) {
                newTab.classList.add('active');
                newTab.style.opacity = '0';
                newTab.style.transform = 'translateX(10px)';
                
                // Force reflow
                newTab.offsetHeight;
                
                // Fade in
                requestAnimationFrame(function() {
                    newTab.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    newTab.style.opacity = '1';
                    newTab.style.transform = 'translateX(0)';
                });
            }
            
            // Reset styles after transition
            setTimeout(function() {
                if (currentActive) {
                    currentActive.style.opacity = '';
                    currentActive.style.transform = '';
                    currentActive.style.transition = '';
                }
                if (newTab) {
                    newTab.style.opacity = '';
                    newTab.style.transform = '';
                    newTab.style.transition = '';
                }
            }, 300);
        }, 200);
    } else {
        // No transition needed, just update
    document.querySelectorAll('.tab-content')
        .forEach(c => c.classList.remove('active'));

    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.nav-btn')
        .forEach(btn => {
            btn.classList.remove('nav-btn-active');
            btn.classList.add('nav-btn-inactive');
        });

        var activeBtn = document.getElementById('btn-' + id);
    if (activeBtn) {
        activeBtn.classList.remove('nav-btn-inactive');
        activeBtn.classList.add('nav-btn-active');
        }
    }

    if (id === 'entries' || id === 'company-entries' || id === 'dashboard')
        fetchTrips();

    if (id === 'home')
        window.startTypingEffect();

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

            window.startTypingEffect = function() {
                const text = "Welcome Kamlesh Bhai";
                const target = document.getElementById('typing-text');
                if(!target) return;
                target.innerHTML = "";
                let i = 0;
                const type = () => {
                    if (i < text.length) {
                        target.innerHTML += text.charAt(i++);
                        setTimeout(type, 120);
                    }
                };
                type();
            };

       async function fetchTrips() {

    const res = await fetch('/api/trips');
    const data = await res.json();

    const companyMonth = document.getElementById('monthFilter')?.value;
    const dashMonth = document.getElementById('dashMonthFilter')?.value;

    let filtered = data;

    // ✅ COMPANY PAGE FILTER
    if (companyMonth && document.getElementById('company-entries')?.classList.contains('active')) {

        const [year, month] = companyMonth.split('-');

        filtered = data.filter(e => {
            if (!e.date) return false;

            const parts = e.date.split('-'); // dd-mm-yyyy
            if (parts.length !== 3) return false;

            return parts[1] === month && parts[2] === year;
        });
    }

    // ✅ DASHBOARD PAGE FILTER
    if (dashMonth && document.getElementById('dashboard')?.classList.contains('active')) {

        const [year, month] = dashMonth.split('-');

        filtered = data.filter(e => {
            if (!e.date) return false;

            const parts = e.date.split('-');
            if (parts.length !== 3) return false;

            return parts[1] === month && parts[2] === year;
        });
    }

    window.currentTrips = filtered;
    renderTables(filtered);
}


    // ✅ ADD HERE
    window.applyMonthFilter = function() {
        fetchTrips();
    };



            window.saveToMongo = async function() {
                const km = parseFloat(document.getElementById('km').value) || 0;
                const other = parseFloat(document.getElementById('other').value) || 0;
                const cng = parseFloat(document.getElementById('cng').value) || 0;
                const otherExp = parseFloat(document.getElementById('otherExpense').value) || 0;
                const rate = window.getRate ? window.getRate() : 21;
                const totalVal = (km * rate + other) - cng - otherExp;

                const payload = {
                    date: window.formatDateToDMY(document.getElementById('date').value),
                    pickupTime: document.getElementById('pickupTime').value,
                    dropTime: document.getElementById('dropTime').value,
                    tripId: document.getElementById('tripId').value,
                    pickup: document.getElementById('pickup').value,
                    drop: document.getElementById('drop').value,
                    person: parseInt(document.getElementById('person').value) || 0,
                    km: km, rate: rate, other: other, cng: cng, otherExpense: otherExp,
                    total: totalVal.toFixed(2)
                };

                const res = await fetch('/api/trips', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                if(res.ok) {
                    showToast("Data Saved! ✅");
                    document.getElementById('tripForm').reset();
                    window.showTab('entries');
                }
            };

            window.deleteTrip = async function(id) {
                if(!id) {
                    console.error("Delete: No ID provided");
                    showToast("Error: No trip ID provided ❌");
                    return;
                }
                
                if(!confirm("Are you sure you want to delete this trip?")) return;
                
                try {
                    const res = await fetch('/api/trips/' + id, { 
                        method: 'DELETE' 
                    });
                    
                    if(res.ok) {
                        showToast("Trip deleted successfully ✅");
                fetchTrips();
                    } else {
                        const error = await res.json();
                        showToast("Delete failed: " + (error.error || "Unknown error") + " ❌");
                    }
                } catch(err) {
                    console.error("Delete error:", err);
                    showToast("Error deleting trip ❌");
                }
            };

  function updateDashboard(data) {
    let totalTrips = data.length;
    let totalKM = 0;
    let entryTotal = 0;
    let companyTotal = 0;
    let todayKM = 0;
    let todayAmt = 0;
    let netProfit = 0;
    const rate = window.getRate ? window.getRate() : 21;
    const today = new Date().toLocaleDateString('en-GB').split('/').join('-');

    data.forEach(e => {
        const km = parseFloat(e.km || 0) || 0;
        const amt = parseFloat(e.total || 0) || 0;
        const cng = parseFloat(e.cng || 0) || 0;
        const otherExpense = parseFloat(e.otherExpense || 0) || 0;

        totalKM += km;
        entryTotal += amt;
        companyTotal += km * rate;
        const revenue = (km * rate) + (parseFloat(e.other || 0) || 0);
        const expenses = cng + otherExpense;
        netProfit += revenue - expenses;

        if (e.date === today) {
            todayKM += km;
            todayAmt += amt;
        }
    });

    animateValue('dashTrips', 0, totalTrips, 500);
    animateValue('dashKM', 0, totalKM, 800);
    animateValue('dashEntryTotal', 0, entryTotal, 900);
    animateValue('dashCompanyTotal', 0, companyTotal, 900);
    animateValue('dashTodayKM', 0, todayKM, 700);
    animateValue('dashTodayAmt', 0, todayAmt, 900);
    animateValue('dashNetProfit', 0, netProfit, 1000);
}

function updateMonthlySummary(data) {
    const monthInput = document.getElementById('dashMonthFilter');
    const rate = window.getRate ? window.getRate() : 21;

    if (!monthInput || !monthInput.value) {

        document.getElementById('dashMonth').innerText = "--";
        document.getElementById('dashMonthTrips').innerText = 0;
        document.getElementById('dashMonthKM').innerText = "0.00";
        document.getElementById('dashMonthEntry').innerText = "₹0";
        document.getElementById('dashMonthCompany').innerText = "₹0";
        return;
    }

    const [year, month] = monthInput.value.split('-');

    let trips = 0, km = 0, entry = 0, company = 0;

    data.forEach(e => {
        if (!e.date) return;

        const parts = e.date.split('-'); // dd-mm-yyyy
        if (parts.length !== 3) return;

        if (parts[1] === month && parts[2] === year) {
            trips++;
            const k = parseFloat(e.km);
            const amt = parseFloat(e.total || 0);

            km += k;
            entry += amt;
            company += k * rate;
        }
    });

    document.getElementById('dashMonth').innerText = month + "-" + year;
    document.getElementById('dashMonthTrips').innerText = trips;
    document.getElementById('dashMonthKM').innerText = km.toFixed(2);
    document.getElementById('dashMonthEntry').innerText =
        "₹" + entry.toLocaleString('en-IN', {minimumFractionDigits:2});
    document.getElementById('dashMonthCompany').innerText =
        "₹" + company.toLocaleString('en-IN', {minimumFractionDigits:2});
}


    

function animateValue(id, start, end, duration = 800) {
    const el = document.getElementById(id);
    if (!el) return;

    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = progress * (end - start) + start;

        if (id.toLowerCase().includes('total') || id.toLowerCase().includes('amt') || id.toLowerCase().includes('profit')) {
            el.innerText = "₹" + value.toLocaleString('en-IN', {
                maximumFractionDigits: 2
            });
        } else {
            el.innerText = Number.isInteger(end)
                ? Math.floor(value)
                : value.toFixed(2);
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };

    requestAnimationFrame(step);
}


            
            function renderTables(data) {
        const lBody = document.getElementById('listBody');
        const cBody = document.getElementById('companyTableBody');
        const lFoot = document.getElementById('listFoot');
        const cFoot = document.getElementById('companyFoot');
        const rate = window.getRate ? window.getRate() : 21;
        
        lBody.innerHTML = '';
        cBody.innerHTML = '';
        
        let gKm = 0, gCng = 0, gAmt = 0, gcAmt = 0;

        data.forEach(e => {
            const km = parseFloat(e.km || 0);
            const cng = parseFloat(e.cng || 0);
            const amt = parseFloat(e.total || 0);

            gKm += km;
            gCng += cng;
            gAmt += amt;

            const companyValue = (parseFloat(e.km || 0)) * rate;
            gcAmt += companyValue;

       const entryHtml =
'<tr class="hover:bg-slate-50 border-b">' +

'<td class="p-4 text-orange-500 uppercase">' + (e.date || '-') + '</td>' +

'<td class="p-4 font-black text-orange-500 uppercase font-mono">' + (e.tripId || '-') + '</td>' +

'<td class="p-4 text-center font-bold">' + (e.person ?? '-') + '</td>' +

'<td class="p-4 text-sm leading-tight font-semibold">🏁 ' + (e.pickup || '-') +
'<br/>📍 ' + (e.drop || '-') + '</td>' +

'<td class="p-4 font-bold font-mono">' + 
(parseFloat(e.km) || 0).toFixed(2) + ' KM</td>' +

'<td class="p-4 text-xs font-black text-slate-500 uppercase font-mono">' +
(e.pickupTime || '-') + ' - ' + (e.dropTime || '-') + '</td>' +

'<td class="p-4 text-xs font-bold">' +
'Other:+₹' + (parseFloat(e.other) || 0).toFixed(2) +
'<br/>CNG:-₹' + (parseFloat(e.cng) || 0).toFixed(2) +
'<br/>Exp:-₹' + (parseFloat(e.otherExpense) || 0).toFixed(2) +
'</td>' +

'<td class="p-4 text-right font-black text-slate-900">₹' +
(parseFloat(e.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
'</td>' +

'<td class="p-4 text-center no-pdf">' +

'<button data-edit-id="' + (e._id || '') + '" class="text-indigo-500 hover:text-indigo-700 cursor-pointer" title="Edit">🖊</button>' +

'<button data-delete-id="' + (e._id || '') + '" class="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer" title="Delete">🗑️</button>' +

'</td>' +
'</tr>';



            lBody.innerHTML += entryHtml;

            // Company table  
            const companyHtml = '<tr class="hover:bg-indigo-50 border-b"><td class="p-4 font-bold text-slate-800 font-mono text-xs">' + e.date + '</td>' +
                '<td class="p-4 font-black text-orange-500 uppercase font-mono">' + e.tripId + '</td>' +
                '<td class="p-4 text-center font-bold">' + e.person + '</td>' +
                '<td class="p-4 text-sm leading-tight font-semibold">🏁 ' + e.pickup + '<br/>📍 ' + e.drop + '</td>' +
                '<td class="p-4 font-bold font-mono">' + km.toFixed(2) + ' KM</td>' +
                '<td class="p-4 text-xs font-black text-slate-500 uppercase font-mono">' + e.pickupTime + ' - ' + e.dropTime + '</td>' +
                '<td class="p-4 text-right font-black text-indigo-900 text-base">₹' + companyValue.toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td></tr>';
            cBody.innerHTML += companyHtml;
        });

        // Footers
        const fHtml = (trips, km, cng, amt) => {
            const cngText = cng > 0 ? 'CNG:-₹' + cng.toLocaleString('en-IN') : '-';
            return '<tr><td colspan="2" class="p-4 text-xs">Trips: ' + trips + '</td><td class="p-4 text-center">-</td><td class="p-4 text-xs text-center font-black underline">Grand Total</td><td class="p-4 font-mono">' + km.toFixed(2) + ' KM</td><td class="p-4 text-xs font-black">' + cngText + '</td><td class="p-4"></td><td class="p-4 text-right text-indigo-300 text-base">₹' + amt.toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td><td class="no-pdf"></td></tr>';
        };

        const cfHtml = (trips, km, amt) => {
            return '<tr><td colspan="2" class="p-4 text-xs">Trips: ' + trips + '</td><td class="p-4 text-center">-</td><td class="p-4 text-xs text-center font-black underline">Grand Total</td><td class="p-4 font-mono">' + km.toFixed(2) + ' KM</td><td class="p-4 text-center">-</td><td class="p-4 text-right text-indigo-100 text-lg">₹' + amt.toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td></tr>';
        };

        lFoot.innerHTML = fHtml(data.length, gKm, gCng, gAmt);
        cFoot.innerHTML = cfHtml(data.length, gKm, gcAmt);
        updateDashboard(data);
        updateMonthlySummary(data);
        animateDashboard();
        renderKMChart(data);
renderDailyChart(data);
renderProfitChart(data);
renderWeeklyChart(data);



    }
        function animateDashboard() {
        const els = document.querySelectorAll('.dash-value');
        if (!els.length) return;

        els.forEach(el => {
            try {
                el.style.animation = "none";
                void el.offsetHeight;   // reflow (important)
                el.style.animation = "numberPop 0.35s ease";
            } catch (err) {
                console.log("Animation skip:", err);
            }
        });
    }


            function showToast(m) {
                const t = document.getElementById('toast');
                t.innerText = m; t.classList.remove('hidden');
                setTimeout(() => t.classList.add('hidden'), 3000);
            }

            window.downloadPDF = async function(id) {
                const el = document.getElementById(id);
                showToast("PDF Generating... ⏳");
                await html2pdf().set({ 
                    margin: 5, 
                    filename: 'Trip_Report.pdf', 
                    jsPDF: {format: 'a4', orientation: 'portrait'} 
                }).from(el).save();
                showToast("Download Complete! 📄");
            };

            // Invoice Generator (MongoDB only)
            (function() {
                const inr = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 2
                });

                function formatInr(n) {
                    const num = Number(n) || 0;
                    return inr.format(num);
                }

                function formatMonthLabel(ym) {
                    if (!/^\d{4}-\d{2}$/.test(String(ym || ''))) return String(ym || '');
                    const [y, m] = ym.split('-').map(Number);
                    const d = new Date(y, m - 1, 1);
                    return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
                }

                window.openInvoiceModal = function() {
                    var m = document.getElementById('invoiceModal');
                    var inp = document.getElementById('invoiceMonthModal');
                    var dash = document.getElementById('dashMonthFilter');
                    var inv = document.getElementById('invoiceMonth');
                    var month = (dash && dash.value) ? dash.value : ((inv && inv.value) ? inv.value : new Date().toISOString().slice(0, 7));
                    if (inp) inp.value = month;
                    if (m) m.classList.remove('hidden');
                    setTimeout(function() { if (inp) inp.focus(); }, 50);
                };

                window.closeInvoiceModal = function() {
                    var m = document.getElementById('invoiceModal');
                    if (m) m.classList.add('hidden');
                };

                window.generateInvoiceFromModal = function() {
                    var inp = document.getElementById('invoiceMonthModal');
                    var month = inp && inp.value ? inp.value : '';
                    if (!month) {
                        showToast('Please select invoice month');
                        return;
                    }
                    window.closeInvoiceModal();
                    window.generateInvoice(month);
                };

                window.generateInvoice = async function(monthOverride) {
                    try {
                        const monthInput = document.getElementById('invoiceMonth');
                        const modalInput = document.getElementById('invoiceMonthModal');
                        const month = (monthOverride && String(monthOverride).trim())
                            ? String(monthOverride).trim()
                            : ((modalInput && modalInput.value) ? modalInput.value : ((monthInput && monthInput.value) ? monthInput.value : ''));
                        if (!month) {
                            showToast('Please select invoice month');
                            return;
                        }

                        showToast('Generating invoice...');

                        const res = await fetch('/api/invoice/' + month, { cache: 'no-store' });
                        if (!res.ok) {
                            showToast('Failed to generate invoice');
                            return;
                        }

                        const data = await res.json();
                        const t = data.totals || {};
                        const companyName = data.companyName || 'Tripset';
                        const monthLabel = formatMonthLabel(data.month || month);
                        const generatedOn = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

                        const content = document.getElementById('invoiceContent');
                        if (!content) {
                            showToast('Invoice template missing');
                            return;
                        }

                        var html = ''
                            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;">'
                            +   '<div>'
                            +     '<div style="font-size:22px;font-weight:900;color:#0f172a;">' + String(companyName) + '</div>'
                            +     '<div style="font-size:12px;color:#64748b;margin-top:2px;">Monthly Trip Invoice</div>'
                            +   '</div>'
                            +   '<div style="text-align:right;font-size:12px;color:#64748b;">'
                            +     '<div><span style="font-weight:700;color:#0f172a;">Invoice Month:</span> ' + String(monthLabel) + '</div>'
                            +     '<div><span style="font-weight:700;color:#0f172a;">Generated:</span> ' + String(generatedOn) + '</div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="border-top:1px solid #e2e8f0;margin:12px 0;"></div>'
                            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px;margin-bottom:16px;">'
                            +   '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">'
                            +     '<div style="color:#64748b;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">Trips</div>'
                            +     '<div style="margin-top:10px;display:flex;justify-content:space-between;"><span>Total Trips</span><span style="font-weight:800;">' + String(t.totalTrips || 0) + '</span></div>'
                            +     '<div style="margin-top:6px;display:flex;justify-content:space-between;"><span>Total KM</span><span style="font-weight:800;">' + String((Number(t.totalKm) || 0).toFixed(2)) + '</span></div>'
                            +   '</div>'
                            +   '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">'
                            +     '<div style="color:#64748b;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">Totals</div>'
                            +     '<div style="margin-top:10px;display:flex;justify-content:space-between;"><span>Entry Total</span><span style="font-weight:900;color:#059669;">' + formatInr(t.entryTotal) + '</span></div>'
                            +     '<div style="margin-top:6px;display:flex;justify-content:space-between;"><span>Company Total (KM × rate)</span><span style="font-weight:900;color:#f97316;">' + formatInr(t.companyTotal) + '</span></div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:12px;">'
                            +   '<div style="background:#f8fafc;padding:10px 12px;font-weight:900;color:#0f172a;">Expense Breakdown</div>'
                            +   '<div style="padding:12px;">'
                            +     '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>CNG</span><span style="font-weight:800;">' + formatInr(t.totalCng) + '</span></div>'
                            +     '<div style="display:flex;justify-content:space-between;"><span>Other Expense</span><span style="font-weight:800;">' + formatInr(t.totalOtherExpense) + '</span></div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="margin-top:16px;border:1px solid #bbf7d0;background:#ecfdf5;border-radius:12px;padding:12px;font-size:12px;">'
                            +   '<div style="display:flex;justify-content:space-between;align-items:center;">'
                            +     '<span style="font-weight:900;color:#065f46;">Net Profit</span>'
                            +     '<span style="font-weight:900;font-size:16px;color:#064e3b;">' + formatInr(t.netProfit) + '</span>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#64748b;">'
                            +   '<div>'
                            +     '<div style="height:36px;border-bottom:1px solid #cbd5e1;width:180px;"></div>'
                            +     '<div style="margin-top:6px;">Authorised Signatory</div>'
                            +   '</div>'
                            +   '<div style="text-align:right;">Thank you.</div>'
                            + '</div>';

                        content.innerHTML = html;

                        const container = document.getElementById('invoiceContainer');
                        if (container) container.classList.remove('hidden');

                        await html2pdf().set({
                            margin: 10,
                            filename: 'Invoice_' + month + '.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2 },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        }).from(content).save();

                        showToast('Invoice downloaded ✅');
                    } catch (e) {
                        console.error('INVOICE UI ERROR:', e);
                        showToast('Invoice generation failed');
                    }
                };
            })();

   // Event delegation for edit/delete buttons (more reliable than inline onclick)
   document.addEventListener('click', function(e) {
       // Handle edit button clicks
       if (e.target.closest('[data-edit-id]')) {
           const id = e.target.closest('[data-edit-id]').getAttribute('data-edit-id');
           if (id && window.openEditModal) {
               window.openEditModal(id);
           }
       }
       
       // Handle delete button clicks
       if (e.target.closest('[data-delete-id]')) {
           const id = e.target.closest('[data-delete-id]').getAttribute('data-delete-id');
           if (id && window.deleteTrip) {
               window.deleteTrip(id);
           }
       }
   });

   window.onload = function() {
    /* Dark mode applied by loadSettings after auth */
};

            ['e-km','e-other','e-cng','e-exp'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input', calcEditTotal);
});
console.log("SCRIPT END ✅");

        </script>
    </body>
    
    </html>
        `);
    });

    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server chalu thai gayu che: http://localhost:${PORT} 🚀`);
    }); 
