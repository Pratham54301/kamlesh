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

    // Serve static files after explicit PWA routes so manifest/sw headers stay controlled.
    app.use(express.static(__dirname));


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
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#F97316">
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
        <link rel="manifest" href="/manifest.json" />
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
        <script src="https://cdn.jsdelivr.net/npm/i18next@23.16.8/dist/umd/i18next.min.js"></script>
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

            .nav-btn-inactive { color: #cbd5e1; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    body.mobile-nav-open { overflow: hidden !important; }
    #mobileNavBackdrop { display: none; }
    #mobileNavMenu { display: none; }
    #mobileNavMenu.open { display: block; }
    #mobileMenuBtn {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        border: 1px solid #334155;
        background: #0b1220;
        color: #f8fafc;
        font-weight: 900;
        line-height: 1;
    }
    @media (max-width: 767px) {
        #mobileNavBackdrop {
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 23, 0.55);
            z-index: 49;
        }
        #mobileNavMenu {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            width: min(86vw, 320px);
            background: #020617;
            border-left: 1px solid #1e293b;
            box-shadow: -12px 0 28px rgba(0, 0, 0, 0.45);
            z-index: 50;
            padding: 1rem;
            overflow-y: auto;
        }
        #mobileNavMenu .nav-btn {
            width: 100%;
            text-align: left;
            padding: 0.75rem 0.9rem;
        }
        .dash-card {
            padding: 1rem;
        }
        .dash-value {
            font-size: 1.35rem;
        }
        #installPrompt {
            left: 0.5rem;
            right: 0.5rem;
            width: auto;
            transform: translateY(120%);
            max-width: none;
        }
        #installPrompt.show {
            transform: translateY(0);
        }
    }
    .dash-card {
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
            <span id="offlineText" data-i18n="status.offline">📡 You're offline. Some features may be limited.</span>
        </div>

        <!-- Install Prompt -->
        <div id="installPrompt">
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem;" data-i18n="install.title">Install Tripset</div>
                    <div style="font-size: 0.75rem; color: #64748b;" data-i18n="install.subtitle">Install app for better experience</div>
                </div>
            </div>
            <div class="install-buttons">
                <button class="install-btn install-btn-primary" id="installBtn" data-i18n="install.install">Install</button>
                <button class="install-btn install-btn-secondary" onclick="window.dismissInstallPrompt()" data-i18n="install.later">Later</button>
            </div>
        </div>

        <!-- Login Screen (hardcoded single-user) - VISIBLE BY DEFAULT WITH INLINE STYLES -->
        <div id="loginScreen" style="position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100% !important;height:100% !important;z-index:2147483646 !important;display:flex !important;visibility:visible !important;opacity:1 !important;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%) !important;align-items:center !important;justify-content:center !important;padding:1rem !important;">
            <div style="background:white;border-radius:1.5rem;padding:2rem 2.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);max-width:22rem;width:100%;text-align:center;">
                <h2 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:0.5rem;">Tripset</h2>
                <p style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem;" data-i18n="login.required">Login required</p>
                <input id="loginUsername" type="text" inputmode="numeric" autocomplete="username" placeholder="Mobile number" data-i18n-placeholder="login.username" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <input id="loginPassword" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Password" data-i18n-placeholder="login.password" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <button type="button" onclick="window.doLogin()" style="width:100%;padding:0.75rem 1.5rem;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-weight:700;border-radius:0.75rem;border:none;cursor:pointer;font-size:1rem;" data-i18n="login.button">Login</button>
                <p style="font-size:0.75rem;color:#64748b;margin-top:1rem;" data-i18n="login.authorized">Authorized user only</p>
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
                    <p class="pin-lock-subtitle" data-i18n="pin.enterTitle">Enter 4-digit PIN</p>
                    <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinInput" class="pin-input" placeholder="••••" autocomplete="off">
                    <button type="button" class="btn-unlock" onclick="window.submitPin()" data-i18n="pin.unlock">Unlock</button>
                </div>
                <div id="pinSetMode" class="hidden">
                    <h2 class="pin-lock-title" data-i18n="pin.setTitle">Set PIN</h2>
                    <p class="pin-lock-subtitle" data-i18n="pin.setSubtitle">Create a 4-digit PIN to lock the app</p>
                    <div class="pin-set-form">
                        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinSetInput" class="pin-input" placeholder="New PIN" data-i18n-placeholder="pin.newPin" autocomplete="off">
                        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" id="pinSetConfirm" class="pin-input" placeholder="Confirm PIN" data-i18n-placeholder="pin.confirmPin" autocomplete="off">
                    </div>
                    <button type="button" class="btn-unlock" onclick="window.setPin()" data-i18n="pin.setAndUnlock">Set PIN &amp; Unlock</button>
                </div>
            </div>
        </div>

        <div id="appContent" style="display:none !important;">
        <nav class="bg-[#020617] text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
            <div class="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
                <div class="text-xl font-extrabold text-orange-500 uppercase italic tracking-tighter">Tripset</div>
                <button type="button" id="mobileMenuBtn" class="md:hidden" aria-label="Open menu" aria-expanded="false" onclick="window.toggleMobileNav()">
                    ☰
                </button>
                <div class="hidden md:flex space-x-2 overflow-x-auto no-scrollbar py-2">
            

                    <button id="btn-home" data-tab="home" onclick="window.showTab('home')" class="nav-btn nav-btn-active" data-i18n="nav.home">Home</button>
                    <button id="btn-dashboard"
            onclick="window.showTab('dashboard')"
            class="nav-btn nav-btn-inactive" data-i18n="nav.dashboard" data-tab="dashboard">
        Dashboard
    </button>
             

                    <button id="btn-enter-detail" data-tab="enter-detail" onclick="window.showTab('enter-detail')" class="nav-btn nav-btn-inactive" data-i18n="nav.entryForm">Details</button>
                    <button id="btn-entries" data-tab="entries" onclick="window.showTab('entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.entries">Entries</button>
                    <button id="btn-company-entries" data-tab="company-entries" onclick="window.showTab('company-entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.company">Company</button>
                    <button id="btn-settings" data-tab="settings" onclick="window.showTab('settings')" class="nav-btn nav-btn-inactive" data-i18n="nav.settings">Settings</button>

                    <button onclick="window.toggleDarkMode()" 
        class="nav-btn nav-btn-inactive">
    🌙
</button>

                </div>
            </div>
        </nav>
        <div id="mobileNavBackdrop" onclick="window.toggleMobileNav(false)"></div>
        <aside id="mobileNavMenu">
            <div class="flex items-center justify-between mb-4">
                <div class="text-lg font-extrabold text-orange-500 uppercase italic tracking-tight">Tripset</div>
                <button type="button" class="nav-btn nav-btn-inactive" onclick="window.toggleMobileNav(false)">✕</button>
            </div>
            <div class="flex flex-col gap-2">
                <button data-tab="home" onclick="window.showTab('home')" class="nav-btn nav-btn-active" data-i18n="nav.home">Home</button>
                <button data-tab="dashboard" onclick="window.showTab('dashboard')" class="nav-btn nav-btn-inactive" data-i18n="nav.dashboard">Dashboard</button>
                <button data-tab="enter-detail" onclick="window.showTab('enter-detail')" class="nav-btn nav-btn-inactive" data-i18n="nav.entryForm">Details</button>
                <button data-tab="entries" onclick="window.showTab('entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.entries">Entries</button>
                <button data-tab="company-entries" onclick="window.showTab('company-entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.company">Company</button>
                <button data-tab="settings" onclick="window.showTab('settings')" class="nav-btn nav-btn-inactive" data-i18n="nav.settings">Settings</button>
                <button onclick="window.toggleDarkMode()" class="nav-btn nav-btn-inactive">🌙</button>
            </div>
        </aside>
          

        <div class="max-w-7xl mx-auto p-4 md:p-8">
        <div id="settings" class="tab-content max-w-2xl mx-auto">
    <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
        <h2 class="text-2xl font-extrabold mb-6 border-b pb-4 uppercase" data-i18n="settings.title">⚙ Settings</h2>

        <div class="space-y-5">
            <div>
                <label class="text-xs font-bold uppercase text-slate-500" data-i18n="settings.companyName">Company Name</label>
                <input type="text" id="companyName" class="input-field">
            </div>

            <div>
                <label class="text-xs font-bold uppercase text-slate-500" data-i18n="settings.rate">Rate (₹ per KM)</label>
                <input type="number" id="rateSetting" class="input-field">
            </div>

            <div>
                <label class="text-xs font-bold uppercase text-slate-500" data-i18n="settings.language">Language</label>
                <select id="languageSelect" class="input-field font-bold">
                    <option value="en">English</option>
                    <option value="gu">Gujarati</option>
                    <option value="hi">Hindi</option>
                </select>
            </div>

            <button onclick="window.saveSettings()" 
                class="btn-primary py-3 text-lg">
                <span data-i18n="settings.save">Save Settings 💾</span>
            </button>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700" data-i18n="settings.backupTitle">💾 Backup & Restore</h3>
                
                <div class="space-y-4">
                    <button onclick="window.downloadBackup()" 
                        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                        <span data-i18n="settings.downloadBackup">📥 Download Backup</span>
                    </button>

                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-500 mb-2" data-i18n="settings.restoreLabel">
                            Restore Backup (JSON File)
                        </label>
                        <input type="file" 
                               id="backupFileInput" 
                               accept=".json,application/json" 
                               class="hidden"
                               onchange="window.handleRestoreBackup(event)">
                        <button onclick="document.getElementById('backupFileInput').click()" 
                            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                            <span data-i18n="settings.restoreBackup">📤 Restore Backup</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700" data-i18n="settings.invoiceTitle">🧾 Invoice</h3>
                <button onclick="window.openInvoiceModal()"
                    class="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    <span data-i18n="settings.invoiceGenerator">🧾 Invoice Generator</span>
                </button>
                <p class="text-xs text-slate-500 mt-2" data-i18n="settings.invoiceHelp">Select month and download invoice PDF.</p>
            </div>

            <div class="border-t pt-6 mt-6">
                <h3 class="text-lg font-extrabold mb-4 uppercase text-slate-700" data-i18n="settings.pinTitle">🔒 PIN Lock</h3>
                <button onclick="window.openChangePinModal()" 
                    class="w-full bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    <span data-i18n="settings.changePin">🔑 Change PIN</span>
                </button>
            </div>

            <div class="border-t pt-6 mt-6">
                <button onclick="window.doLogout()" 
                    class="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md">
                    <span data-i18n="settings.logout">🚪 Logout</span>
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
                        <h2 class="text-xl font-black text-slate-800 uppercase" data-i18n="invoice.modalTitle">🧾 Invoice Generator</h2>
                        <p class="text-sm text-slate-500 mt-1" data-i18n="invoice.modalHelp">Select month and press Enter to download.</p>
                    </div>
                    <button onclick="window.closeInvoiceModal()" class="text-slate-400 hover:text-slate-600 text-xl font-black">✖</button>
                </div>

                <div class="mt-5">
                    <label class="text-xs font-bold uppercase text-slate-500 block mb-2" data-i18n="invoice.selectMonth">Select Month</label>
                    <input type="month" id="invoiceMonthModal" class="input-field font-bold">
                </div>

                <div class="flex gap-3 mt-6">
                    <button onclick="window.closeInvoiceModal()"
                        class="flex-1 py-2.5 rounded-lg font-bold border border-slate-300 text-slate-700">
                        <span data-i18n="common.cancel">Cancel</span>
                    </button>
                    <button onclick="window.generateInvoiceFromModal()"
                        class="flex-1 py-2.5 rounded-lg font-bold bg-orange-500 hover:bg-orange-600 text-white">
                        <span data-i18n="common.downloadPdf">Download PDF</span>
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
                <h2 class="text-lg font-extrabold uppercase text-slate-800" data-i18n="invoice.modalTitle">🧾 Invoice Generator</h2>
                <p class="text-slate-500 text-sm mt-1" data-i18n="dashboard.invoiceDescription">Generate monthly invoice directly from MongoDB trips.</p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div>
                    <label class="text-xs font-bold uppercase text-slate-500 block mb-1" data-i18n="invoice.selectMonth">Select Month</label>
                    <input type="month" id="invoiceMonth" class="px-3 py-2 border rounded-lg font-bold">
                </div>
                <button onclick="window.generateInvoice()" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md">
                    <span data-i18n="dashboard.generateInvoicePdf">Generate Invoice PDF</span>
                </button>
            </div>
        </div>
    </div>

    <div class="flex items-center gap-3">
    <label class="text-xs font-bold uppercase text-slate-500" data-i18n="dashboard.selectMonth">
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
                <div class="dash-title" data-i18n="dashboard.totalTrips">Total Trips</div>
                <div id="dashTrips" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.totalKm">Total KM</div>
                <div id="dashKM" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.entryTotal">Entry Total</div>
                <div id="dashEntryTotal" class="dash-value text-emerald-600">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.companyTotal">Company Total</div>
                <div id="dashCompanyTotal" class="dash-value text-orange-500">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.todayKm">Today KM</div>
                <div id="dashTodayKM" class="dash-value">0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.todayAmount">Today Amount</div>
                <div id="dashTodayAmt" class="dash-value">₹0</div>
            </div>

            <div class="dash-card">
                <div class="dash-title" data-i18n="dashboard.netProfit">Net Profit</div>
                <div id="dashNetProfit" class="dash-value text-green-600">₹0</div>
            </div>

          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-3">
    <h3 class="text-lg font-black mb-4 text-orange-500 uppercase">
        <span data-i18n="dashboard.monthlyAnalytics">📈 Monthly Analytics</span>
    </h3>

    <div class="flex justify-end mb-3">
        <button onclick="toggleChartType()" 
            class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
            <span data-i18n="dashboard.toggleChart">Toggle Chart 📊</span>
        </button>
    </div>

    <canvas id="kmChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-emerald-600 uppercase">
        <span data-i18n="dashboard.dailyTrend">📅 Daily Trend</span>
    </h3>
    <canvas id="dailyChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-rose-500 uppercase">
        <span data-i18n="dashboard.profitAnalysis">💸 Profit Analysis</span>
    </h3>
    <canvas id="profitChart" height="100"></canvas>
</div>

<div class="bg-white rounded-2xl p-6 border shadow-sm md:col-span-3 mt-6">
    <h3 class="text-lg font-black mb-4 text-orange-500 uppercase">
        <span data-i18n="dashboard.weeklyReport">📆 Weekly Report</span>
    </h3>
    <canvas id="weeklyChart" height="110"></canvas>
</div>

<div class="dash-card md:col-span-3 bg-indigo-50 border-indigo-100">
    <div class="dash-title text-indigo-700" data-i18n="dashboard.monthlySummary">Monthly Summary</div>

    <div class="flex flex-wrap gap-6 mt-3 text-sm font-bold text-slate-700">

        <div>
            <div class="text-slate-500 text-xs" data-i18n="dashboard.month">Month</div>
            <div id="dashMonth">--</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs" data-i18n="dashboard.trips">Trips</div>
            <div id="dashMonthTrips">0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs" data-i18n="dashboard.km">KM</div>
            <div id="dashMonthKM">0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs" data-i18n="dashboard.entryTotal">Entry Total</div>
            <div id="dashMonthEntry">₹0</div>
        </div>

        <div>
            <div class="text-slate-500 text-xs" data-i18n="dashboard.companyTotal">Company Total</div>
            <div id="dashMonthCompany">₹0</div>
        </div>

    </div>
</div>

        </div>
    </div>
            <div id="home" class="tab-content active py-12 text-center">
                <div class="bg-white max-w-3xl mx-auto rounded-3xl p-10 shadow-sm border border-slate-200">
                    <h1 id="typing-text" class="text-4xl md:text-6xl font-extrabold welcome-gradient min-h-[4rem]"></h1>
                    <p class="text-slate-500 mb-10 text-lg uppercase font-bold tracking-widest" data-i18n="home.subtitle">Best Trip Management System </p>
                    <button onclick="window.showTab('enter-detail')" class="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-indigo-700 transition" data-i18n="home.startEntry">Start New Entry ➔</button>
                </div>
            </div>

            <div id="enter-detail" class="tab-content max-w-3xl mx-auto">
                <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                    <h2 class="text-2xl font-extrabold mb-6 border-b pb-4 text-slate-900 uppercase" data-i18n="entry.title">Trip Details Form</h2>
                    <form id="tripForm" onsubmit="event.preventDefault(); window.saveToMongo();">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.date">Date</label><input type="date" id="date" required class="input-field"></div>
                            <div class="grid grid-cols-2 gap-2">
                                <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.pickupTime">Pickup Time</label><input type="time" id="pickupTime" required class="input-field"></div>
                                <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.dropTime">Drop Time</label><input type="time" id="dropTime" required class="input-field"></div>
                            </div>
                            <div class="md:col-span-2"><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.tripId">Trip ID</label><input type="text" id="tripId" placeholder="Manual ID" data-i18n-placeholder="entry.tripIdPlaceholder" required class="input-field font-mono"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.pickup">Pickup</label><input type="text" id="pickup" list="locationList" placeholder="Pickup point" data-i18n-placeholder="entry.pickupPlaceholder" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.drop">Drop</label><input type="text" id="drop" list="locationList" placeholder="Drop point" data-i18n-placeholder="entry.dropPlaceholder" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.person">Persons</label><input type="number" id="person" value="1" required class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="dashboard.km">KM</label><input type="number" id="km" step="0.01" value="0" required oninput="window.calculateTotal()" class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500" data-i18n="entry.rate">Rate</label><input type="number" id="rateDisplay" readonly class="input-field bg-slate-100 font-bold" value="21"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500 text-indigo-700" data-i18n="entry.otherPlus">Other (+)</label><input type="number" id="other" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field"></div>
                            <div><label class="text-xs font-bold uppercase text-slate-500 text-rose-500">CNG (-)</label><input type="number" id="cng" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field"></div>
                            <div class="md:col-span-2"><label class="text-xs font-bold uppercase text-rose-600" data-i18n="entry.otherExpense">Other Expense (-)</label><input type="number" id="otherExpense" step="0.01" value="0" oninput="window.calculateTotal()" class="input-field bg-rose-50"></div>
                            <div class="md:col-span-2 bg-slate-900 p-6 rounded-xl mt-4 flex justify-between items-center text-white font-black"><span class="text-slate-400" data-i18n="entry.totalAmount">TOTAL AMOUNT:</span><span id="totalDisplay" class="text-3xl">₹ 0.00</span></div>
                            <button type="submit" id="saveBtn" class="md:col-span-2 btn-primary py-4 text-lg" data-i18n="entry.save">Save to MongoDB 💾</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="entries" class="tab-content bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-6 bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b">
                    <h2 class="font-black uppercase text-slate-800" data-i18n="entries.title">Entries List (Old to New)</h2>
                    <div class="flex flex-wrap items-end gap-2">
                        <div class="flex flex-col">
                            <label for="entriesMonthFilter" class="text-[10px] font-bold uppercase text-slate-500" data-i18n="dashboard.selectMonth">Select Month</label>
                            <input type="month" id="entriesMonthFilter" onchange="fetchTrips()" class="px-3 py-2 rounded-lg border font-bold">
                        </div>
                        <button onclick="window.applyEntriesMonthFilter()"
                                class="bg-slate-700 text-white px-4 py-2 rounded-lg font-bold">
                            <span data-i18n="common.apply">Apply</span>
                        </button>
                    <button onclick="window.downloadPDF('entries')" class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">📥 <span data-i18n="common.pdf">PDF</span></button>
                    <button onclick="window.exportExcel()" 
class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">
📥 <span data-i18n="common.excel">Excel</span>
</button>
                    </div>

                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            <tr>
                                <th class="p-4" data-i18n="entry.date">Date</th>
                                <th class="p-4">ID</th>
                                <th class="p-4 text-center">P</th>
                                <th class="p-4" data-i18n="entries.route">Route</th>
                                <th class="p-4" data-i18n="dashboard.km">KM</th>
                                <th class="p-4" data-i18n="entries.time">Time</th>
                                <th class="p-4" data-i18n="entries.otherDetails">Other Details</th>
                                <th class="p-4 text-right" data-i18n="entries.total">Total</th>
                                <th class="p-4 text-center no-pdf" data-i18n="entries.action">Action</th>
                            </tr>
                        </thead>
                        <tbody id="listBody" class="divide-y text-slate-700"></tbody>
                        <tfoot id="listFoot" class="bg-slate-900 text-white font-bold"></tfoot>
                    </table>
                </div>
            </div>

            <div id="company-entries" class="tab-content bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div class="p-6 flex justify-between items-center bg-indigo-900 text-white">
                    <h2 class="text-xl font-extrabold uppercase" data-i18n="company.title">Company Entry Report</h2>
                    <div class="flex items-center gap-3">
            <input type="month" id="monthFilter"
                class="px-3 py-2 rounded-lg text-black font-bold">

            <button onclick="window.applyMonthFilter()"
                    class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold">
                <span data-i18n="common.apply">Apply</span>
            </button>
        </div>
                    <button onclick="window.downloadPDF('company-entries')" class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold">📁 <span data-i18n="common.pdf">PDF</span></button>
                    <button onclick="window.exportExcel()" 
class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">
📥 <span data-i18n="common.excel">Excel</span>
</button>

                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th class="p-4" data-i18n="entry.date">Date</th>
                                <th class="p-4">ID</th>
                                <th class="p-4 text-center">P</th>
                                <th class="p-4" data-i18n="entries.route">Route</th>
                                <th class="p-4" data-i18n="dashboard.km">KM</th>
                                <th class="p-4" data-i18n="entries.time">Time</th>
                                <th class="p-4 text-right" data-i18n="company.totalRate">Total (KM × Rate)</th>
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

        <h2 class="text-xl font-black mb-4 text-orange-500 uppercase" data-i18n="edit.title">
            Edit Trip
        </h2>

        <div class="grid grid-cols-2 gap-3">
            <input id="e-date" type="date" class="input-field">
            <input id="e-tripId" type="text" placeholder="Trip ID" data-i18n-placeholder="entry.tripId" class="input-field">

            <input id="e-pickup" type="text" placeholder="Pickup" data-i18n-placeholder="entry.pickup" class="input-field">
            <input id="e-drop" type="text" placeholder="Drop" data-i18n-placeholder="entry.drop" class="input-field">

            <input id="e-person" type="number" placeholder="Persons" data-i18n-placeholder="entry.person" class="input-field">
            <input id="e-km" type="number" step="0.01" placeholder="KM" class="input-field">

            <input id="e-other" type="number" step="0.01" placeholder="Other (+)" data-i18n-placeholder="entry.otherPlus" class="input-field">
            <input id="e-cng" type="number" step="0.01" placeholder="CNG (-)" class="input-field">

            <input id="e-exp" type="number" step="0.01" placeholder="Other Expense (-)" data-i18n-placeholder="entry.otherExpense" class="input-field">

            <div class="col-span-2 bg-slate-900 text-white p-4 rounded-xl flex justify-between">
                <span class="text-slate-400 font-bold" data-i18n="entries.total">Total</span>
                <span id="e-total" class="font-black text-xl">₹ 0.00</span>
            </div>

            <button onclick="window.updateTrip()" 
                    class="col-span-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black">
                <span data-i18n="edit.update">Update Trip 🔄</span>
            </button>
        </div>
    </div>
</div>

        <!-- Change PIN Modal -->
        <div id="changePinModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                <h2 class="text-xl font-black mb-4 text-slate-800 uppercase" data-i18n="pin.changeTitle">🔑 Change PIN</h2>
                <input type="password" inputmode="numeric" maxlength="4" id="changePinCurrent" class="input-field" placeholder="Current PIN" data-i18n-placeholder="pin.currentPin" autocomplete="off">
                <input type="password" inputmode="numeric" maxlength="4" id="changePinNew" class="input-field" placeholder="New PIN" data-i18n-placeholder="pin.newPin" autocomplete="off">
                <input type="password" inputmode="numeric" maxlength="4" id="changePinConfirm" class="input-field" placeholder="Confirm New PIN" data-i18n-placeholder="pin.confirmNewPin" autocomplete="off">
                <div class="flex gap-3 mt-4">
                    <button onclick="window.closeChangePinModal()" class="flex-1 py-2 rounded-lg font-bold border border-slate-300 text-slate-700" data-i18n="common.cancel">Cancel</button>
                    <button onclick="window.saveNewPin()" class="flex-1 py-2 rounded-lg font-bold bg-orange-500 text-white" data-i18n="pin.savePin">Save PIN</button>
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

        window.toggleMobileNav = function(forceOpen) {
            var menu = document.getElementById('mobileNavMenu');
            var backdrop = document.getElementById('mobileNavBackdrop');
            var btn = document.getElementById('mobileMenuBtn');
            if (!menu || !backdrop) return;

            if (window.innerWidth >= 768) {
                menu.classList.remove('open');
                backdrop.style.display = 'none';
                document.body.classList.remove('mobile-nav-open');
                if (btn) btn.setAttribute('aria-expanded', 'false');
                return;
            }

            var open = menu.classList.contains('open');
            var shouldOpen = (typeof forceOpen === 'boolean') ? forceOpen : !open;

            if (shouldOpen) {
                menu.classList.add('open');
                backdrop.style.display = 'block';
                document.body.classList.add('mobile-nav-open');
                if (btn) btn.setAttribute('aria-expanded', 'true');
            } else {
                menu.classList.remove('open');
                backdrop.style.display = 'none';
                document.body.classList.remove('mobile-nav-open');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        };

        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768) window.toggleMobileNav(false);
        });

        var LANGUAGE_STORAGE_KEY = 'tripset_language';
        var SUPPORTED_LANGUAGES = ['en', 'gu', 'hi'];

        var i18nResources = {
            en: {
                translation: {
                    nav: { home: "Home", dashboard: "Dashboard", entryForm: "Details", entries: "Entries", company: "Company", settings: "Settings" },
                    login: { required: "Login required", username: "Mobile number", password: "Password", button: "Login", authorized: "Authorized user only" },
                    install: { title: "Install Tripset", subtitle: "Install app for better experience", install: "Install", later: "Later" },
                    pin: {
                        enterTitle: "Enter 4-digit PIN", unlock: "Unlock", setTitle: "Set PIN", setSubtitle: "Create a 4-digit PIN to lock the app",
                        newPin: "New PIN", confirmPin: "Confirm PIN", setAndUnlock: "Set PIN & Unlock",
                        changeTitle: "Change PIN", currentPin: "Current PIN", confirmNewPin: "Confirm New PIN", savePin: "Save PIN"
                    },
                    settings: {
                        title: "Settings", companyName: "Company Name", rate: "Rate (₹ per KM)", language: "Language",
                        save: "Save Settings 💾", backupTitle: "Backup & Restore", downloadBackup: "📥 Download Backup",
                        restoreLabel: "Restore Backup (JSON File)", restoreBackup: "📤 Restore Backup",
                        invoiceTitle: "Invoice", invoiceGenerator: "🧾 Invoice Generator", invoiceHelp: "Select month and download invoice PDF.",
                        pinTitle: "PIN Lock", changePin: "🔑 Change PIN", logout: "🚪 Logout"
                    },
                    dashboard: {
                        invoiceDescription: "Generate monthly invoice directly from MongoDB trips.",
                        generateInvoicePdf: "Generate Invoice PDF", selectMonth: "Select Month",
                        totalTrips: "Total Trips", totalKm: "Total KM", entryTotal: "Entry Total", companyTotal: "Company Total",
                        todayKm: "Today KM", todayAmount: "Today Amount", netProfit: "Net Profit",
                        monthlyAnalytics: "📈 Monthly Analytics", toggleChart: "Toggle Chart 📊",
                        dailyTrend: "📅 Daily Trend", profitAnalysis: "💸 Profit Analysis", weeklyReport: "📆 Weekly Report",
                        monthlySummary: "Monthly Summary", month: "Month", trips: "Trips", km: "KM"
                    },
                    home: { subtitle: "Best Trip Management System", startEntry: "Start New Entry ➔", welcome: "Welcome Kamlesh Bhai" },
                    entry: {
                        title: "Trip Details Form", date: "Date", pickupTime: "Pickup Time", dropTime: "Drop Time",
                        tripId: "Trip ID", tripIdPlaceholder: "Manual ID", pickup: "Pickup", pickupPlaceholder: "Pickup point",
                        drop: "Drop", dropPlaceholder: "Drop point", person: "Persons", rate: "Rate",
                        otherPlus: "Other (+)", otherExpense: "Other Expense (-)", totalAmount: "TOTAL AMOUNT:",
                        save: "Save to MongoDB 💾"
                    },
                    entries: { title: "Entries List (Old to New)", route: "Route", time: "Time", otherDetails: "Other Details", total: "Total", action: "Action" },
                    company: { title: "Company Entry Report", totalRate: "Total (KM × Rate)" },
                    invoice: {
                        modalTitle: "🧾 Invoice Generator", modalHelp: "Select month and press Enter to download.", selectMonth: "Select Month",
                        monthlyTripInvoice: "Monthly Trip Invoice", invoiceMonthLabel: "Invoice Month:", generatedLabel: "Generated:",
                        totals: "Totals", expenseBreakdown: "Expense Breakdown", authorizedSignatory: "Authorised Signatory", thankYou: "Thank you."
                    },
                    edit: { title: "Edit Trip", update: "Update Trip 🔄" },
                    common: { cancel: "Cancel", downloadPdf: "Download PDF", pdf: "PDF", excel: "Excel", apply: "Apply" },
                    chart: { totalKm: "Total KM", revenue: "Revenue ₹", trips: "Trips", profit: "Profit ₹" },
                    table: { otherPlus: "Other:+₹", cngMinus: "CNG:-₹", expMinus: "Exp:-₹", editTitle: "Edit", deleteTitle: "Delete", tripsPrefix: "Trips: ", grandTotal: "Grand Total" },
                    status: { online: "✅ Back online!", offline: "📡 You're offline. Some features may be limited." },
                    toast: {
                        enter4Digits: "Please enter 4 digits", wrongPin: "Wrong PIN", pinVerifyFailed: "PIN verify failed",
                        enter4DigitsPin: "Enter 4 digits for PIN", pinMismatch: "PINs do not match", pinSetFailed: "PIN set failed", pinSet: "PIN set",
                        newPin4Digits: "New PIN must be 4 digits", newPinMismatch: "New PINs do not match", currentPinWrong: "Current PIN is wrong",
                        pinChanged: "PIN changed", pinChangeFailed: "PIN change failed",
                        appInstalled: "App installed successfully! 🎉", installNotAvailable: "Installation not available", installingApp: "Installing app...",
                        newVersion: "New version available! Refresh to update.", noChartData: "No data for chart ❌",
                        settingsSaved: "Settings Saved ✅", settingsFailed: "Failed to save settings ❌",
                        preparingExcel: "Preparing Company Excel... ⏳", noData: "No data found ❌", excelDownloaded: "Company Excel Downloaded ✅",
                        preparingBackup: "Preparing backup... ⏳", noTripsBackup: "No trips to backup ❌", backupDownloaded: "Backup downloaded: {{count}} trips ✅",
                        backupDownloadFailed: "Failed to download backup ❌", invalidFileType: "Invalid file type. Please select a JSON file ❌",
                        readingBackup: "Reading backup file... ⏳", invalidJson: "Invalid JSON format ❌",
                        invalidBackupFormat: "Invalid backup format. Expected array of trips ❌", backupEmpty: "Backup file is empty ❌",
                        invalidTripData: "Invalid trip data: {{detail}} ❌", restoreConfirm: "Restore {{count}} trips? This will add them to your database.",
                        restoringTrips: "Restoring {{count}} trips... ⏳",
                        restoredTrips: "Successfully restored {{count}} trips ✅", restoreFailed: "Restore failed: {{error}} ❌",
                        restorePartial: "Note: {{count}} trips were inserted before error.", restoreFailedGeneric: "Failed to restore backup ❌",
                        darkModeOn: "Dark Mode ON 🌙", lightModeOn: "Light Mode ☀️",
                        errorNoTripId: "Error: No trip ID provided ❌", tripsNotLoaded: "Trips not loaded yet. Please wait... ❌",
                        tripNotFound: "Trip not found ❌", tripUpdated: "Trip Updated ✅", dataSaved: "Data Saved! ✅",
                        tripDeleted: "Trip deleted successfully ✅", deleteConfirm: "Are you sure you want to delete this trip?",
                        deleteFailed: "Delete failed: {{error}} ❌", deleteError: "Error deleting trip ❌",
                        iosInstallGuide: "On iPhone: tap Share, then Add to Home Screen.",
                        pdfGenerating: "PDF Generating... ⏳", downloadComplete: "Download Complete! 📄",
                        selectInvoiceMonth: "Please select invoice month", generatingInvoice: "Generating invoice...",
                        invoiceFailed: "Failed to generate invoice", invoiceTemplateMissing: "Invoice template missing",
                        invoiceDownloaded: "Invoice downloaded ✅", invoiceGenerationFailed: "Invoice generation failed"
                    }
                }
            },
            gu: {
                translation: {
                    nav: { home: "હોમ", dashboard: "ડેશબોર્ડ", entryForm: "વિગત", entries: "એન્ટ્રી", company: "કંપની", settings: "સેટિંગ્સ" },
                    login: { required: "લૉગિન જરૂરી છે", username: "મોબાઇલ નંબર", password: "પાસવર્ડ", button: "લૉગિન", authorized: "માત્ર અધિકૃત યુઝર" },
                    install: { title: "Tripset ઇન્સ્ટોલ કરો", subtitle: "સારો અનુભવ માટે એપ ઇન્સ્ટોલ કરો", install: "ઇન્સ્ટોલ", later: "પછી" },
                    pin: {
                        enterTitle: "4 અંકનો PIN દાખલ કરો", unlock: "અનલૉક", setTitle: "PIN સેટ કરો", setSubtitle: "એપ લૉક કરવા 4 અંકનો PIN બનાવો",
                        newPin: "નવો PIN", confirmPin: "PIN કન્ફર્મ કરો", setAndUnlock: "PIN સેટ કરો અને અનલૉક કરો",
                        changeTitle: "PIN બદલો", currentPin: "હાલનો PIN", confirmNewPin: "નવો PIN કન્ફર્મ કરો", savePin: "PIN સેવ કરો"
                    },
                    settings: {
                        title: "સેટિંગ્સ", companyName: "કંપની નામ", rate: "રેટ (₹ પ્રતિ KM)", language: "ભાષા",
                        save: "સેટિંગ્સ સેવ કરો 💾", backupTitle: "બેકઅપ અને રિસ્ટોર", downloadBackup: "📥 બેકઅપ ડાઉનલોડ",
                        restoreLabel: "બેકઅપ રિસ્ટોર કરો (JSON ફાઇલ)", restoreBackup: "📤 બેકઅપ રિસ્ટોર",
                        invoiceTitle: "ઇન્વૉઇસ", invoiceGenerator: "🧾 ઇન્વૉઇસ જનરેટર", invoiceHelp: "મહિનો પસંદ કરો અને PDF ડાઉનલોડ કરો.",
                        pinTitle: "PIN લૉક", changePin: "🔑 PIN બદલો", logout: "🚪 લૉગઆઉટ"
                    },
                    dashboard: {
                        invoiceDescription: "MongoDB ટ્રિપ પરથી માસિક ઇન્વૉઇસ બનાવો.",
                        generateInvoicePdf: "ઇન્વૉઇસ PDF બનાવો", selectMonth: "મહિનો પસંદ કરો",
                        totalTrips: "કુલ ટ્રિપ", totalKm: "કુલ KM", entryTotal: "એન્ટ્રી ટોટલ", companyTotal: "કંપની ટોટલ",
                        todayKm: "આજનું KM", todayAmount: "આજની રકમ", netProfit: "શુદ્ધ નફો",
                        monthlyAnalytics: "📈 માસિક એનાલિટિક્સ", toggleChart: "ચાર્ટ બદલો 📊",
                        dailyTrend: "📅 દૈનિક ટ્રેન્ડ", profitAnalysis: "💸 નફા વિશ્લેષણ", weeklyReport: "📆 સાપ્તાહિક રિપોર્ટ",
                        monthlySummary: "માસિક સારાંશ", month: "મહિનો", trips: "ટ્રિપ", km: "KM"
                    },
                    home: { subtitle: "સર્વશ્રેષ્ઠ ટ્રિપ મેનેજમેન્ટ સિસ્ટમ", startEntry: "નવી એન્ટ્રી શરૂ કરો ➔", welcome: "સ્વાગત છે કમલેશ ભાઈ" },
                    entry: {
                        title: "ટ્રિપની વિગત ભરો", date: "તારીખ", pickupTime: "પિકઅપ સમય", dropTime: "ડ્રોપ સમય",
                        tripId: "ટ્રિપ ID", tripIdPlaceholder: "મેન્યુઅલ ID", pickup: "પિકઅપ", pickupPlaceholder: "પિકઅપ પોઈન્ટ",
                        drop: "ડ્રોપ", dropPlaceholder: "ડ્રોપ પોઈન્ટ", person: "માણસો", rate: "રેટ",
                        otherPlus: "અન્ય (+)", otherExpense: "અન્ય ખર્ચ (-)", totalAmount: "કુલ રકમ:", save: "MongoDB માં સેવ કરો 💾"
                    },
                    entries: { title: "એન્ટ્રી લિસ્ટ (જૂની થી નવી)", route: "રૂટ", time: "સમય", otherDetails: "અન્ય વિગતો", total: "ટોટલ", action: "ક્રિયા" },
                    company: { title: "કંપની એન્ટ્રી રિપોર્ટ", totalRate: "ટોટલ (KM × Rate)" },
                    invoice: {
                        modalTitle: "🧾 ઇન્વૉઇસ જનરેટર", modalHelp: "મહિનો પસંદ કરો અને Enter દબાવો.", selectMonth: "મહિનો પસંદ કરો",
                        monthlyTripInvoice: "માસિક ટ્રિપ ઇન્વૉઇસ", invoiceMonthLabel: "ઇન્વૉઇસ મહિનો:", generatedLabel: "બનાવેલ:",
                        totals: "કુલ", expenseBreakdown: "ખર્ચ વિગત", authorizedSignatory: "અધિકૃત સહી", thankYou: "આભાર."
                    },
                    edit: { title: "ટ્રિપ એડિટ કરો", update: "ટ્રિપ અપડેટ કરો 🔄" },
                    common: { cancel: "રદ્દ કરો", downloadPdf: "PDF ડાઉનલોડ", pdf: "PDF", excel: "Excel", apply: "લાગુ કરો" },
                    chart: { totalKm: "કુલ KM", revenue: "આવક ₹", trips: "ટ્રિપ", profit: "નફો ₹" },
                    table: { otherPlus: "અન્ય:+₹", cngMinus: "CNG:-₹", expMinus: "ખર્ચ:-₹", editTitle: "એડિટ", deleteTitle: "ડિલીટ", tripsPrefix: "ટ્રિપ: ", grandTotal: "ગ્રાન્ડ ટોટલ" },
                    status: { online: "✅ ફરી ઑનલાઇન", offline: "📡 તમે ઑફલાઇન છો. કેટલાક ફીચર્સ મર્યાદિત હોઈ શકે." },
                    toast: {
                        enter4Digits: "કૃપા કરીને 4 અંક નાખો", wrongPin: "ખોટો PIN", pinVerifyFailed: "PIN ચકાસણી નિષ્ફળ",
                        enter4DigitsPin: "PIN માટે 4 અંક નાખો", pinMismatch: "PIN મેળ ખાતા નથી", pinSetFailed: "PIN સેટ નિષ્ફળ", pinSet: "PIN સેટ થયું",
                        newPin4Digits: "નવો PIN 4 અંકનો હોવો જોઈએ", newPinMismatch: "નવો PIN મેળ ખાતો નથી", currentPinWrong: "હાલનો PIN ખોટો છે",
                        pinChanged: "PIN બદલાયો", pinChangeFailed: "PIN બદલવામાં નિષ્ફળ",
                        appInstalled: "એપ સફળતાપૂર્વક ઇન્સ્ટોલ થઈ! 🎉", installNotAvailable: "ઇન્સ્ટોલેશન ઉપલબ્ધ નથી", installingApp: "એપ ઇન્સ્ટોલ થઈ રહી છે...",
                        newVersion: "નવી આવૃત્તિ ઉપલબ્ધ છે! અપડેટ માટે રિફ્રેશ કરો.", noChartData: "ચાર્ટ માટે ડેટા નથી ❌",
                        settingsSaved: "સેટિંગ્સ સેવ થઈ ✅", settingsFailed: "સેટિંગ્સ સેવ નિષ્ફળ ❌",
                        preparingExcel: "કંપની Excel તૈયાર થાય છે... ⏳", noData: "ડેટા મળ્યો નથી ❌", excelDownloaded: "કંપની Excel ડાઉનલોડ થયું ✅",
                        preparingBackup: "બેકઅપ તૈયાર થાય છે... ⏳", noTripsBackup: "બેકઅપ માટે ટ્રિપ નથી ❌", backupDownloaded: "બેકઅપ ડાઉનલોડ: {{count}} ટ્રિપ ✅",
                        backupDownloadFailed: "બેકઅપ ડાઉનલોડ નિષ્ફળ ❌", invalidFileType: "અયોગ્ય ફાઇલ પ્રકાર. JSON ફાઇલ પસંદ કરો ❌",
                        readingBackup: "બેકઅપ ફાઇલ વાંચી રહ્યા છીએ... ⏳", invalidJson: "અયોગ્ય JSON ફોર્મેટ ❌",
                        invalidBackupFormat: "અયોગ્ય બેકઅપ ફોર્મેટ. ટ્રિપ એરે જરૂરી છે ❌", backupEmpty: "બેકઅપ ફાઇલ ખાલી છે ❌",
                        invalidTripData: "અયોગ્ય ટ્રિપ ડેટા: {{detail}} ❌", restoreConfirm: "{{count}} ટ્રિપ રિસ્ટોર કરશો? આ તમારા ડેટાબેઝમાં ઉમેરાશે.",
                        restoringTrips: "{{count}} ટ્રિપ રિસ્ટોર થાય છે... ⏳",
                        restoredTrips: "{{count}} ટ્રિપ સફળતાપૂર્વક રિસ્ટોર ✅", restoreFailed: "રિસ્ટોર નિષ્ફળ: {{error}} ❌",
                        restorePartial: "નોંધ: ભૂલ પહેલાં {{count}} ટ્રિપ ઇન્સર્ટ થઈ.", restoreFailedGeneric: "બેકઅપ રિસ્ટોર નિષ્ફળ ❌",
                        darkModeOn: "ડાર્ક મોડ ON 🌙", lightModeOn: "લાઇટ મોડ ☀️",
                        errorNoTripId: "ભૂલ: ટ્રિપ ID આપવામાં નથી ❌", tripsNotLoaded: "ટ્રિપ હજુ લોડ નથી. રાહ જુઓ... ❌",
                        tripNotFound: "ટ્રિપ મળી નથી ❌", tripUpdated: "ટ્રિપ અપડેટ થઈ ✅", dataSaved: "ડેટા સેવ થયું! ✅",
                        tripDeleted: "ટ્રિપ સફળતાપૂર્વક ડિલીટ ✅", deleteConfirm: "શું તમે આ ટ્રિપ ડિલીટ કરવા માંગો છો?",
                        deleteFailed: "ડિલીટ નિષ્ફળ: {{error}} ❌", deleteError: "ટ્રિપ ડિલીટ ભૂલ ❌",
                        iosInstallGuide: "iPhone પર: Share દબાવો, પછી Add to Home Screen પસંદ કરો.",
                        pdfGenerating: "PDF બને છે... ⏳", downloadComplete: "ડાઉનલોડ પૂર્ણ! 📄",
                        selectInvoiceMonth: "કૃપા કરીને ઇન્વૉઇસ મહિનો પસંદ કરો", generatingInvoice: "ઇન્વૉઇસ બને છે...",
                        invoiceFailed: "ઇન્વૉઇસ જનરેટ નિષ્ફળ", invoiceTemplateMissing: "ઇન્વૉઇસ ટેમ્પલેટ મળ્યો નથી",
                        invoiceDownloaded: "ઇન્વૉઇસ ડાઉનલોડ થયું ✅", invoiceGenerationFailed: "ઇન્વૉઇસ જનરેશન નિષ્ફળ"
                    }
                }
            },
            hi: {
                translation: {
                    nav: { home: "होम", dashboard: "डैशबोर्ड", entryForm: "विवरण", entries: "एंट्री", company: "कंपनी", settings: "सेटिंग्स" },
                    login: { required: "लॉगिन आवश्यक है", username: "मोबाइल नंबर", password: "पासवर्ड", button: "लॉगिन", authorized: "केवल अधिकृत उपयोगकर्ता" },
                    install: { title: "Tripset इंस्टॉल करें", subtitle: "बेहतर अनुभव के लिए ऐप इंस्टॉल करें", install: "इंस्टॉल", later: "बाद में" },
                    pin: {
                        enterTitle: "4 अंकों का PIN दर्ज करें", unlock: "अनलॉक", setTitle: "PIN सेट करें", setSubtitle: "ऐप लॉक करने के लिए 4 अंकों का PIN बनाएं",
                        newPin: "नया PIN", confirmPin: "PIN पुष्टि करें", setAndUnlock: "PIN सेट करें और अनलॉक करें",
                        changeTitle: "PIN बदलें", currentPin: "वर्तमान PIN", confirmNewPin: "नया PIN पुष्टि करें", savePin: "PIN सेव करें"
                    },
                    settings: {
                        title: "सेटिंग्स", companyName: "कंपनी नाम", rate: "रेट (₹ प्रति KM)", language: "भाषा",
                        save: "सेटिंग्स सेव करें 💾", backupTitle: "बैकअप और रिस्टोर", downloadBackup: "📥 बैकअप डाउनलोड",
                        restoreLabel: "बैकअप रिस्टोर करें (JSON फ़ाइल)", restoreBackup: "📤 बैकअप रिस्टोर",
                        invoiceTitle: "इनवॉइस", invoiceGenerator: "🧾 इनवॉइस जनरेटर", invoiceHelp: "महीना चुनें और PDF डाउनलोड करें।",
                        pinTitle: "PIN लॉक", changePin: "🔑 PIN बदलें", logout: "🚪 लॉगआउट"
                    },
                    dashboard: {
                        invoiceDescription: "MongoDB ट्रिप से मासिक इनवॉइस बनाएं।",
                        generateInvoicePdf: "इनवॉइस PDF बनाएं", selectMonth: "महीना चुनें",
                        totalTrips: "कुल ट्रिप", totalKm: "कुल KM", entryTotal: "एंट्री टोटल", companyTotal: "कंपनी टोटल",
                        todayKm: "आज का KM", todayAmount: "आज की राशि", netProfit: "शुद्ध लाभ",
                        monthlyAnalytics: "📈 मासिक एनालिटिक्स", toggleChart: "चार्ट बदलें 📊",
                        dailyTrend: "📅 दैनिक ट्रेंड", profitAnalysis: "💸 लाभ विश्लेषण", weeklyReport: "📆 साप्ताहिक रिपोर्ट",
                        monthlySummary: "मासिक सारांश", month: "महीना", trips: "ट्रिप", km: "KM"
                    },
                    home: { subtitle: "सर्वश्रेष्ठ ट्रिप मैनेजमेंट सिस्टम", startEntry: "नई एंट्री शुरू करें ➔", welcome: "स्वागत है कमलेश भाई" },
                    entry: {
                        title: "ट्रिप विवरण भरें", date: "तारीख", pickupTime: "पिकअप समय", dropTime: "ड्रॉप समय",
                        tripId: "ट्रिप ID", tripIdPlaceholder: "मैनुअल ID", pickup: "पिकअप", pickupPlaceholder: "पिकअप पॉइंट",
                        drop: "ड्रॉप", dropPlaceholder: "ड्रॉप पॉइंट", person: "व्यक्ति", rate: "रेट",
                        otherPlus: "अन्य (+)", otherExpense: "अन्य खर्च (-)", totalAmount: "कुल राशि:", save: "MongoDB में सेव करें 💾"
                    },
                    entries: { title: "एंट्री सूची (पुरानी से नई)", route: "रूट", time: "समय", otherDetails: "अन्य विवरण", total: "कुल", action: "एक्शन" },
                    company: { title: "कंपनी एंट्री रिपोर्ट", totalRate: "कुल (KM × Rate)" },
                    invoice: {
                        modalTitle: "🧾 इनवॉइस जनरेटर", modalHelp: "महीना चुनें और Enter दबाएं।", selectMonth: "महीना चुनें",
                        monthlyTripInvoice: "मासिक ट्रिप इनवॉइस", invoiceMonthLabel: "इनवॉइस महीना:", generatedLabel: "जनरेटेड:",
                        totals: "कुल", expenseBreakdown: "खर्च विवरण", authorizedSignatory: "अधिकृत हस्ताक्षर", thankYou: "धन्यवाद।"
                    },
                    edit: { title: "ट्रिप एडिट करें", update: "ट्रिप अपडेट करें 🔄" },
                    common: { cancel: "रद्द करें", downloadPdf: "PDF डाउनलोड", pdf: "PDF", excel: "Excel", apply: "लागू करें" },
                    chart: { totalKm: "कुल KM", revenue: "राजस्व ₹", trips: "ट्रिप", profit: "लाभ ₹" },
                    table: { otherPlus: "अन्य:+₹", cngMinus: "CNG:-₹", expMinus: "खर्च:-₹", editTitle: "एडिट", deleteTitle: "डिलीट", tripsPrefix: "ट्रिप: ", grandTotal: "ग्रैंड टोटल" },
                    status: { online: "✅ फिर से ऑनलाइन", offline: "📡 आप ऑफलाइन हैं। कुछ फीचर्स सीमित हो सकते हैं।" },
                    toast: {
                        enter4Digits: "कृपया 4 अंक दर्ज करें", wrongPin: "गलत PIN", pinVerifyFailed: "PIN सत्यापन विफल",
                        enter4DigitsPin: "PIN के लिए 4 अंक दर्ज करें", pinMismatch: "PIN मेल नहीं खाते", pinSetFailed: "PIN सेट विफल", pinSet: "PIN सेट हो गया",
                        newPin4Digits: "नया PIN 4 अंकों का होना चाहिए", newPinMismatch: "नया PIN मेल नहीं खाता", currentPinWrong: "वर्तमान PIN गलत है",
                        pinChanged: "PIN बदल गया", pinChangeFailed: "PIN बदलना विफल",
                        appInstalled: "ऐप सफलतापूर्वक इंस्टॉल हुआ! 🎉", installNotAvailable: "इंस्टॉलेशन उपलब्ध नहीं", installingApp: "ऐप इंस्टॉल हो रहा है...",
                        newVersion: "नया संस्करण उपलब्ध है! अपडेट के लिए रिफ्रेश करें।", noChartData: "चार्ट के लिए डेटा नहीं ❌",
                        settingsSaved: "सेटिंग्स सेव हो गई ✅", settingsFailed: "सेटिंग्स सेव विफल ❌",
                        preparingExcel: "कंपनी Excel तैयार हो रही है... ⏳", noData: "डेटा नहीं मिला ❌", excelDownloaded: "कंपनी Excel डाउनलोड हो गई ✅",
                        preparingBackup: "बैकअप तैयार हो रहा है... ⏳", noTripsBackup: "बैकअप के लिए ट्रिप नहीं ❌", backupDownloaded: "बैकअप डाउनलोड: {{count}} ट्रिप ✅",
                        backupDownloadFailed: "बैकअप डाउनलोड विफल ❌", invalidFileType: "अमान्य फाइल प्रकार। कृपया JSON फाइल चुनें ❌",
                        readingBackup: "बैकअप फाइल पढ़ी जा रही है... ⏳", invalidJson: "अमान्य JSON फॉर्मेट ❌",
                        invalidBackupFormat: "अमान्य बैकअप फॉर्मेट। ट्रिप एरे अपेक्षित ❌", backupEmpty: "बैकअप फाइल खाली है ❌",
                        invalidTripData: "अमान्य ट्रिप डेटा: {{detail}} ❌", restoreConfirm: "{{count}} ट्रिप रिस्टोर करें? यह आपके डेटाबेस में जुड़ेंगी।",
                        restoringTrips: "{{count}} ट्रिप रिस्टोर हो रही हैं... ⏳",
                        restoredTrips: "{{count}} ट्रिप सफलतापूर्वक रिस्टोर ✅", restoreFailed: "रिस्टोर विफल: {{error}} ❌",
                        restorePartial: "नोट: त्रुटि से पहले {{count}} ट्रिप इन्सर्ट हुईं।", restoreFailedGeneric: "बैकअप रिस्टोर विफल ❌",
                        darkModeOn: "डार्क मोड ON 🌙", lightModeOn: "लाइट मोड ☀️",
                        errorNoTripId: "त्रुटि: ट्रिप ID नहीं दी गई ❌", tripsNotLoaded: "ट्रिप अभी लोड नहीं हुई। कृपया प्रतीक्षा करें... ❌",
                        tripNotFound: "ट्रिप नहीं मिली ❌", tripUpdated: "ट्रिप अपडेट हो गई ✅", dataSaved: "डेटा सेव हो गया! ✅",
                        tripDeleted: "ट्रिप सफलतापूर्वक डिलीट ✅", deleteConfirm: "क्या आप सच में इस ट्रिप को डिलीट करना चाहते हैं?",
                        deleteFailed: "डिलीट विफल: {{error}} ❌", deleteError: "ट्रिप डिलीट त्रुटि ❌",
                        iosInstallGuide: "iPhone पर: Share दबाएं, फिर Add to Home Screen चुनें।",
                        pdfGenerating: "PDF बन रही है... ⏳", downloadComplete: "डाउनलोड पूरा! 📄",
                        selectInvoiceMonth: "कृपया इनवॉइस महीना चुनें", generatingInvoice: "इनवॉइस बन रही है...",
                        invoiceFailed: "इनवॉइस जनरेट विफल", invoiceTemplateMissing: "इनवॉइस टेम्पलेट नहीं मिला",
                        invoiceDownloaded: "इनवॉइस डाउनलोड हो गई ✅", invoiceGenerationFailed: "इनवॉइस जनरेशन विफल"
                    }
                }
            }
        };

        function t(key, options) {
            if (!window.i18next || typeof window.i18next.t !== 'function') return key;
            return window.i18next.t(key, options);
        }

        function applyTranslations() {
            document.querySelectorAll('[data-i18n]').forEach(function(el) {
                var key = el.getAttribute('data-i18n');
                if (!key) return;
                el.textContent = t(key);
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
                var key = el.getAttribute('data-i18n-placeholder');
                if (!key) return;
                el.setAttribute('placeholder', t(key));
            });

            var lang = (window.i18next && window.i18next.language) ? window.i18next.language : 'en';
            document.documentElement.lang = lang;
            var languageSelect = document.getElementById('languageSelect');
            if (languageSelect && languageSelect.value !== lang) languageSelect.value = lang;
        }

        function getSavedLanguage() {
            try {
                var saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
                if (saved && SUPPORTED_LANGUAGES.indexOf(saved) !== -1) return saved;
            } catch (e) {}
            return 'en';
        }

        function saveLanguage(lang) {
            try {
                localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
            } catch (e) {}
        }

        function initI18n() {
            if (!window.i18next) return Promise.resolve();
            var initialLang = getSavedLanguage();

            return window.i18next.init({
                lng: initialLang,
                fallbackLng: 'en',
                resources: i18nResources,
                interpolation: { escapeValue: false }
            }).then(function() {
                applyTranslations();
                var languageSelect = document.getElementById('languageSelect');
                if (languageSelect) {
                    languageSelect.value = window.i18next.language;
                    languageSelect.addEventListener('change', function(e) {
                        window.changeLanguage(e.target.value);
                    });
                }
            }).catch(function(err) {
                console.error('i18n init failed:', err);
            });
        }

        window.changeLanguage = function(lang) {
            if (!window.i18next || SUPPORTED_LANGUAGES.indexOf(lang) === -1) return;
            window.i18next.changeLanguage(lang).then(function() {
                saveLanguage(lang);
                applyTranslations();
                window.startTypingEffect();
                if (window.currentTrips) renderTables(window.currentTrips);
            }).catch(function(err) {
                console.error('changeLanguage failed:', err);
            });
        };

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
                setTimeout(showInstallPromptIfNeeded, 1800);
            }).catch(function(err) {
                console.error('loadSettings failed:', err);
                fetchTrips();
                window.startTypingEffect();
                setTimeout(showInstallPromptIfNeeded, 1800);
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
                showToast(t('toast.enter4Digits'));
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
                    showToast(t('toast.wrongPin'));
                    setTimeout(function() {
                        input.classList.remove('pin-shake');
                        setTimeout(function() { input.classList.remove('error'); }, 400);
                    }, 400);
                    return;
                }
                input.value = '';
                window.unlockScreen();
            } catch (e) {
                showToast(t('toast.pinVerifyFailed'));
            }
        };

        window.setPin = async function() {
            var inp = document.getElementById('pinSetInput');
            var conf = document.getElementById('pinSetConfirm');
            if (!inp || !conf) return;
            var a = (inp.value || '').trim();
            var b = (conf.value || '').trim();
            if (a.length !== 4 || !/^\d{4}$/.test(a)) {
                showToast(t('toast.enter4DigitsPin'));
                return;
            }
            if (a !== b) {
                showToast(t('toast.pinMismatch'));
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
                    showToast(t('toast.pinSetFailed'));
                    return;
                }
                inp.value = ''; conf.value = '';
                showToast(t('toast.pinSet'));
                window.unlockScreen();
            } catch (e) {
                showToast(t('toast.pinSetFailed'));
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
                showToast(t('toast.newPin4Digits'));
                return;
            }
            if (n !== co) {
                showToast(t('toast.newPinMismatch'));
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
                        showToast(t('toast.currentPinWrong'));
                        cur.classList.add('error', 'pin-shake');
                        setTimeout(function() { cur.classList.remove('pin-shake', 'error'); }, 400);
                        return;
                    }
                    cur.value = ''; newPin.value = ''; conf.value = '';
                    window.closeChangePinModal();
                    showToast(t('toast.pinChanged'));
                } catch (e) {
                    showToast(t('toast.pinChangeFailed'));
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
                    if (offlineText) offlineText.textContent = t('status.online');
                    setTimeout(function() {
                        banner.classList.remove('show');
                        setTimeout(function() {
                            banner.classList.remove('online');
                            if (offlineText) offlineText.textContent = t('status.offline');
                        }, 2000);
                    }, 3000);
                } else {
                    banner.classList.add('show');
                    banner.classList.remove('online');
                    if (offlineText) offlineText.textContent = t('status.offline');
                }
            }

            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);
            updateOnlineStatus();
        }

        // Install Prompt Logic (MongoDB only)
        var deferredPrompt = null;
        function isStandaloneMode() {
            return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        }
        function isIosDevice() {
            return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
        }

        function showInstallPromptIfNeeded() {
            if (window.appSettings && window.appSettings.installPromptShown) return;
            var prompt = document.getElementById('installPrompt');
            if (!prompt || isStandaloneMode()) return;
            if (deferredPrompt || isIosDevice()) {
                prompt.classList.add('show');
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
            showToast(t('toast.appInstalled'));
        });

        document.getElementById('installBtn') && document.getElementById('installBtn').addEventListener('click', function() {
            if (!deferredPrompt) {
                if (isIosDevice() && !isStandaloneMode()) {
                    showToast(t('toast.iosInstallGuide'), 5200);
                    saveInstallPromptShown();
                    return;
                }
                showToast(t('toast.installNotAvailable'));
                return;
            }
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choiceResult) {
                if (choiceResult.outcome === 'accepted') showToast(t('toast.installingApp'));
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
            initI18n().finally(function() {
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
            });
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
                        showToast(t('toast.newVersion'), 5000);
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
                { label: t('chart.trips'), data: tripsData },
                { label: t('dashboard.km'), data: kmData },
                { label: t('chart.revenue'), data: revenueData },
                { label: t('chart.profit'), data: profitData }
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
                label: t('chart.profit'),
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
                { label: t('dashboard.km'), data: kmVals, tension: 0.3 },
                { label: t('chart.revenue'), data: revVals, tension: 0.3 }
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
                    label: t('chart.totalKm'),
                    data: kmValues,
                    tension: 0.3
                },
                {
                    label: t('chart.revenue'),
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
        showToast(t('toast.noChartData'));
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
        showToast(t('toast.settingsSaved'));
    } catch (e) {
        showToast(t('toast.settingsFailed'));
    }
};


window.exportExcel = async function () {

    showToast(t('toast.preparingExcel'));

    const res = await fetch('/api/trips');
    const data = await res.json();

    if (!data.length) {
        showToast(t('toast.noData'));
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

    showToast(t('toast.excelDownloaded'));
};

// ✅ Download Backup Function
window.downloadBackup = async function() {
    try {
        showToast(t('toast.preparingBackup'));
        
        const res = await fetch('/api/trips');
        if (!res.ok) {
            throw new Error('Failed to fetch trips');
        }
        
        const data = await res.json();
        
        if (!data || data.length === 0) {
            showToast(t('toast.noTripsBackup'));
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

        showToast(t('toast.backupDownloaded', { count: data.length }));
    } catch (err) {
        console.error("Backup error:", err);
        showToast(t('toast.backupDownloadFailed'));
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
        showToast(t('toast.invalidFileType'));
        event.target.value = ''; // Reset input
        return;
    }

    try {
        showToast(t('toast.readingBackup'));
        
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
            showToast(t('toast.invalidJson'));
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
            showToast(t('toast.invalidBackupFormat'));
            event.target.value = '';
            return;
        }

        if (trips.length === 0) {
            showToast(t('toast.backupEmpty'));
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
            showToast(t('toast.invalidTripData', { detail: invalidTrips[0] }));
            event.target.value = '';
            return;
        }

        // Confirm restore
        const confirmMessage = t('toast.restoreConfirm', { count: trips.length });
        if (!confirm(confirmMessage)) {
            event.target.value = '';
            return;
        }

        showToast(t('toast.restoringTrips', { count: trips.length }));

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
            showToast(t('toast.restoredTrips', { count: result.inserted }));
            // Refresh trips list
            if (window.fetchTrips) {
                setTimeout(() => {
                    fetchTrips();
                }, 500);
            }
        } else {
            showToast(t('toast.restoreFailed', { error: result.error || 'Unknown error' }));
            if (result.inserted > 0) {
                showToast(t('toast.restorePartial', { count: result.inserted }));
            }
        }

        // Reset file input
        event.target.value = '';
    } catch (err) {
        console.error("Restore error:", err);
        showToast(t('toast.restoreFailedGeneric'));
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
    showToast(isDark ? t('toast.darkModeOn') : t('toast.lightModeOn'));
};

/* LOAD SAVED MODE - now handled inside loadSettings */
window.loadDarkMode = function() { /* No-op; loadSettings applies darkMode */ };

        window.editingId = null;


window.openEditModal = function(id) {
    if (!id) {
        console.error("Edit: No ID provided");
        showToast(t('toast.errorNoTripId'));
        return;
    }
    
    if (!window.currentTrips) {
        showToast(t('toast.tripsNotLoaded'));
        return;
    }
    
    const trip = window.currentTrips.find(t => t._id === id);
    if (!trip) {
        console.error("Edit: Trip not found with ID:", id);
        showToast(t('toast.tripNotFound'));
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
        showToast(t('toast.tripUpdated'));
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
            document.querySelectorAll('.nav-btn[data-tab]')
                .forEach(btn => {
                    btn.classList.remove('nav-btn-active');
                    btn.classList.add('nav-btn-inactive');
                });
            
            document.querySelectorAll('.nav-btn[data-tab="' + id + '"]')
                .forEach(btn => {
                    btn.classList.remove('nav-btn-inactive');
                    btn.classList.add('nav-btn-active');
                });
            
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

    document.querySelectorAll('.nav-btn[data-tab]')
        .forEach(btn => {
            btn.classList.remove('nav-btn-active');
            btn.classList.add('nav-btn-inactive');
        });

    document.querySelectorAll('.nav-btn[data-tab="' + id + '"]')
        .forEach(btn => {
            btn.classList.remove('nav-btn-inactive');
            btn.classList.add('nav-btn-active');
        });
    }

    if (id === 'entries' || id === 'company-entries' || id === 'dashboard')
        fetchTrips();

    if (id === 'home')
        window.startTypingEffect();

    if (window.innerWidth < 768) window.toggleMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

            window.startTypingEffect = function() {
                const text = t('home.welcome');
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

    const entriesMonth = document.getElementById('entriesMonthFilter')?.value;
    const companyMonth = document.getElementById('monthFilter')?.value;
    const dashMonth = document.getElementById('dashMonthFilter')?.value;

    let filtered = data;

    // ✅ ENTRIES PAGE FILTER
    if (entriesMonth && document.getElementById('entries')?.classList.contains('active')) {

        const [year, month] = entriesMonth.split('-');

        filtered = data.filter(e => {
            if (!e.date) return false;

            const parts = e.date.split('-'); // dd-mm-yyyy
            if (parts.length !== 3) return false;

            return parts[1] === month && parts[2] === year;
        });
    }

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

    window.applyEntriesMonthFilter = function() {
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
                    showToast(t('toast.dataSaved'));
                    document.getElementById('tripForm').reset();
                    window.showTab('entries');
                }
            };

            window.deleteTrip = async function(id) {
                if(!id) {
                    console.error("Delete: No ID provided");
                    showToast(t('toast.errorNoTripId'));
                    return;
                }
                
                if(!confirm(t('toast.deleteConfirm'))) return;
                
                try {
                    const res = await fetch('/api/trips/' + id, { 
                        method: 'DELETE' 
                    });
                    
                    if(res.ok) {
                        showToast(t('toast.tripDeleted'));
                fetchTrips();
                    } else {
                        const error = await res.json();
                        showToast(t('toast.deleteFailed', { error: (error.error || 'Unknown error') }));
                    }
                } catch(err) {
                    console.error("Delete error:", err);
                    showToast(t('toast.deleteError'));
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
t('table.otherPlus') + (parseFloat(e.other) || 0).toFixed(2) +
'<br/>' + t('table.cngMinus') + (parseFloat(e.cng) || 0).toFixed(2) +
'<br/>' + t('table.expMinus') + (parseFloat(e.otherExpense) || 0).toFixed(2) +
'</td>' +

'<td class="p-4 text-right font-black text-slate-900">₹' +
(parseFloat(e.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) +
'</td>' +

'<td class="p-4 text-center no-pdf">' +

'<button data-edit-id="' + (e._id || '') + '" class="text-indigo-500 hover:text-indigo-700 cursor-pointer" title="' + t('table.editTitle') + '">🖊</button>' +

'<button data-delete-id="' + (e._id || '') + '" class="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer" title="' + t('table.deleteTitle') + '">🗑️</button>' +

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
            const cngText = cng > 0 ? t('table.cngMinus') + cng.toLocaleString('en-IN') : '-';
            return '<tr><td colspan="2" class="p-4 text-xs">' + t('table.tripsPrefix') + trips + '</td><td class="p-4 text-center">-</td><td class="p-4 text-xs text-center font-black underline">' + t('table.grandTotal') + '</td><td class="p-4 font-mono">' + km.toFixed(2) + ' KM</td><td class="p-4 text-xs font-black">' + cngText + '</td><td class="p-4"></td><td class="p-4 text-right text-indigo-300 text-base">₹' + amt.toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td><td class="no-pdf"></td></tr>';
        };

        const cfHtml = (trips, km, amt) => {
            return '<tr><td colspan="2" class="p-4 text-xs">' + t('table.tripsPrefix') + trips + '</td><td class="p-4 text-center">-</td><td class="p-4 text-xs text-center font-black underline">' + t('table.grandTotal') + '</td><td class="p-4 font-mono">' + km.toFixed(2) + ' KM</td><td class="p-4 text-center">-</td><td class="p-4 text-right text-indigo-100 text-lg">₹' + amt.toLocaleString('en-IN', {minimumFractionDigits:2}) + '</td></tr>';
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


            function showToast(m, duration) {
                const t = document.getElementById('toast');
                t.innerText = m; t.classList.remove('hidden');
                setTimeout(() => t.classList.add('hidden'), duration || 3000);
            }

            window.downloadPDF = async function(id) {
                const el = document.getElementById(id);
                showToast(t('toast.pdfGenerating'));
                await html2pdf().set({ 
                    margin: 5, 
                    filename: 'Trip_Report.pdf', 
                    jsPDF: {format: 'a4', orientation: 'portrait'} 
                }).from(el).save();
                showToast(t('toast.downloadComplete'));
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
                        showToast(t('toast.selectInvoiceMonth'));
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
                            showToast(t('toast.selectInvoiceMonth'));
                            return;
                        }

                        showToast(t('toast.generatingInvoice'));

                        const res = await fetch('/api/invoice/' + month, { cache: 'no-store' });
                        if (!res.ok) {
                            showToast(t('toast.invoiceFailed'));
                            return;
                        }

                        const data = await res.json();
                        const totals = data.totals || {};
                        const companyName = data.companyName || 'Tripset';
                        const monthLabel = formatMonthLabel(data.month || month);
                        const generatedOn = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

                        const content = document.getElementById('invoiceContent');
                        if (!content) {
                            showToast(t('toast.invoiceTemplateMissing'));
                            return;
                        }

                        var html = ''
                            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px;">'
                            +   '<div>'
                            +     '<div style="font-size:22px;font-weight:900;color:#0f172a;">' + String(companyName) + '</div>'
                            +     '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + t('invoice.monthlyTripInvoice') + '</div>'
                            +   '</div>'
                            +   '<div style="text-align:right;font-size:12px;color:#64748b;">'
                            +     '<div><span style="font-weight:700;color:#0f172a;">' + t('invoice.invoiceMonthLabel') + '</span> ' + String(monthLabel) + '</div>'
                            +     '<div><span style="font-weight:700;color:#0f172a;">' + t('invoice.generatedLabel') + '</span> ' + String(generatedOn) + '</div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="border-top:1px solid #e2e8f0;margin:12px 0;"></div>'
                            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px;margin-bottom:16px;">'
                            +   '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">'
                            +     '<div style="color:#64748b;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">' + t('dashboard.trips') + '</div>'
                            +     '<div style="margin-top:10px;display:flex;justify-content:space-between;"><span>' + t('dashboard.totalTrips') + '</span><span style="font-weight:800;">' + String(totals.totalTrips || 0) + '</span></div>'
                            +     '<div style="margin-top:6px;display:flex;justify-content:space-between;"><span>' + t('dashboard.totalKm') + '</span><span style="font-weight:800;">' + String((Number(totals.totalKm) || 0).toFixed(2)) + '</span></div>'
                            +   '</div>'
                            +   '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;">'
                            +     '<div style="color:#64748b;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;">' + t('invoice.totals') + '</div>'
                            +     '<div style="margin-top:10px;display:flex;justify-content:space-between;"><span>' + t('dashboard.entryTotal') + '</span><span style="font-weight:900;color:#059669;">' + formatInr(totals.entryTotal) + '</span></div>'
                            +     '<div style="margin-top:6px;display:flex;justify-content:space-between;"><span>' + t('company.totalRate') + '</span><span style="font-weight:900;color:#f97316;">' + formatInr(totals.companyTotal) + '</span></div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:12px;">'
                            +   '<div style="background:#f8fafc;padding:10px 12px;font-weight:900;color:#0f172a;">' + t('invoice.expenseBreakdown') + '</div>'
                            +   '<div style="padding:12px;">'
                            +     '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>CNG</span><span style="font-weight:800;">' + formatInr(totals.totalCng) + '</span></div>'
                            +     '<div style="display:flex;justify-content:space-between;"><span>' + t('entry.otherExpense') + '</span><span style="font-weight:800;">' + formatInr(totals.totalOtherExpense) + '</span></div>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="margin-top:16px;border:1px solid #bbf7d0;background:#ecfdf5;border-radius:12px;padding:12px;font-size:12px;">'
                            +   '<div style="display:flex;justify-content:space-between;align-items:center;">'
                            +     '<span style="font-weight:900;color:#065f46;">Net Profit</span>'
                            +     '<span style="font-weight:900;font-size:16px;color:#064e3b;">' + formatInr(totals.netProfit) + '</span>'
                            +   '</div>'
                            + '</div>'
                            + '<div style="margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:#64748b;">'
                            +   '<div>'
                            +     '<div style="height:36px;border-bottom:1px solid #cbd5e1;width:180px;"></div>'
                            +     '<div style="margin-top:6px;">' + t('invoice.authorizedSignatory') + '</div>'
                            +   '</div>'
                            +   '<div style="text-align:right;">' + t('invoice.thankYou') + '</div>'
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

                        showToast(t('toast.invoiceDownloaded'));
                    } catch (e) {
                        console.error('INVOICE UI ERROR:', e);
                        showToast(t('toast.invoiceGenerationFailed'));
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
