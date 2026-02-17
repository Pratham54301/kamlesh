    /**
     * Tripset
 - MONGODB VERSION (GRAND TOTAL UPDATED)
     * Steps to Run:
     * 1. npm install express mongoose
     * 2. node server.js
     */

    const express = require('express');
    const mongoose = require('mongoose');
    const path = require('path');

    const app = express();
    app.use(express.json());
    app.use(express.static(__dirname));


    // --- MONGODB CONNECTION ---
    const mongoURI = "mongodb+srv://vedteic:Pratham%4054301@vedteix.yby9dng.mongodb.net/tripkamlesh-db";

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

    // API Routes - OLD ENTRIES FIRST (Sort 1)
    app.get('/api/trips', async (req, res) => {
        try {
            const trips = await Trip.find().sort({ createdAt: 1 });
            res.json(trips);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/trips', async (req, res) => {
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

   app.delete('/api/trips/:id', async (req, res) => {
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


    // API: Update Trip
app.put('/api/trips/:id', async (req, res) => {
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


    // Serve Frontend
    app.get('/', (req, res) => {
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
        res.send(`
    <!DOCTYPE html>
    <html lang="gu">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ટ્રિપ મેનેજમેન્ટ - MongoDB Live</title>
        <link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#F97316">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="mobile-web-app-capable" content="yes">



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

        </style>
    </head>
   
    <body class="min-h-screen">
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
        </div>
    </div>
</div>

         <div id="dashboard" class="tab-content mt-6">
         <div class="mb-6 flex items-center gap-3">
    <label class="text-xs font-bold uppercase text-slate-500">
        Select Month
    </label>

    <input type="month"
           id="dashMonthFilter"
           onchange="fetchTrips()"
           class="px-3 py-2 border rounded-lg font-bold">
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
                            <div><label class="text-xs font-bold uppercase text-slate-500">Rate</label><input type="number" value="21" readonly class="input-field bg-slate-100 font-bold"></div>
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
                                <th class="p-4 text-right">ટોટલ (KM*21)</th>
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

        <script>
        window.onerror = function(msg, src, line, col, err) {
    console.log("JS ERROR:", msg, "at line:", line);
};
console.log("SCRIPT LOADED ✅");

        let kmChartInstance = null;
let currentChartType = 'line';
let dailyChartInstance = null;
let profitChartInstance = null;
let weeklyChartInstance = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("SW Registered ✅"));
}


function renderWeeklyChart(data) {

    const monthInput = document.getElementById('dashMonthFilter');
    if (!monthInput?.value) return;

    const [year, month] = monthInput.value.split('-');
    const rate = parseFloat(localStorage.getItem('trip_rate')) || 21;

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

    const rate = parseFloat(localStorage.getItem('trip_rate')) || 21;

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


        // ✅ Load Settings
window.loadSettings = function() {
    const savedRate = localStorage.getItem('trip_rate');
    const savedCompany = localStorage.getItem('trip_company');

    if(savedRate) document.getElementById('rateSetting').value = savedRate;
    else document.getElementById('rateSetting').value = 21;

    if(savedCompany) document.getElementById('companyName').value = savedCompany;
};

// ✅ Save Settings
window.saveSettings = function() {
    const rate = document.getElementById('rateSetting').value || 21;
    const company = document.getElementById('companyName').value || '';

    localStorage.setItem('trip_rate', rate);
    localStorage.setItem('trip_company', company);

    showToast("Settings Saved ✅");
};


window.exportExcel = async function () {

    showToast("Preparing Company Excel... ⏳");

    const res = await fetch('/api/trips');
    const data = await res.json();

    if (!data.length) {
        showToast("No data found ❌");
        return;
    }

    const excelData = data.map(e => {
        const km = parseFloat(e.km || 0);
        return {
            Date: e.date,
            TripID: e.tripId,
            Pickup: e.pickup,
            Drop: e.drop,
            Person: e.person,
            KM: km,
            Rate: 21,
            CompanyTotal: (km * 21).toFixed(2)
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Company Report");

    XLSX.writeFile(wb, "Company_Report.xlsx");

    showToast("Company Excel Downloaded ✅");
};


        /* DARK MODE TOGGLE */
window.toggleDarkMode = function() {
    document.body.classList.toggle('dark');

    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark ? 'on' : 'off');

    showToast(isDark ? "Dark Mode ON 🌙" : "Light Mode ☀️");
};

/* LOAD SAVED MODE */
window.loadDarkMode = function() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'on') {
        document.body.classList.add('dark');
    }
};

        window.editingId = null;


window.openEditModal = function(id) {
 if (!window.currentTrips) {   // ✅ FIRST CHECK
        showToast("Trips not loaded ❌");
        return;
    }
console.log("Edit clicked:", id); 
    const trip = window.currentTrips.find(t => t._id === id);
    if (!trip) return;
   


    document.getElementById('editModal').classList.remove('hidden');

    document.getElementById('e-date').value = convertDMYtoYMD(trip.date);
    document.getElementById('e-tripId').value = trip.tripId;
    document.getElementById('e-pickup').value = trip.pickup;
    document.getElementById('e-drop').value = trip.drop;
    document.getElementById('e-person').value = trip.person;
    document.getElementById('e-km').value = trip.km;
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

    const total = (km * 21 + other) - cng - exp;

    document.getElementById('e-total').innerText =
        "₹ " + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
window.updateTrip = async function() {
    if (!window.editingId) return;

    const km = parseFloat(document.getElementById('e-km').value) || 0;
    const other = parseFloat(document.getElementById('e-other').value) || 0;
    const cng = parseFloat(document.getElementById('e-cng').value) || 0;
    const exp = parseFloat(document.getElementById('e-exp').value) || 0;

    const total = (km * 21 + other) - cng - exp;

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
                const total = (km * 21 + other) - cng - otherExp;
                document.getElementById('totalDisplay').innerText = "₹ " + total.toLocaleString('en-IN', {minimumFractionDigits: 2});
            };

           window.showTab = function(id) {

    document.querySelectorAll('.tab-content')
        .forEach(c => c.classList.remove('active'));

    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.nav-btn')
        .forEach(btn => {
            btn.classList.remove('nav-btn-active');
            btn.classList.add('nav-btn-inactive');
        });

    const activeBtn = document.getElementById('btn-' + id);

    if (activeBtn) {
        activeBtn.classList.remove('nav-btn-inactive');
        activeBtn.classList.add('nav-btn-active');
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
                const totalVal = (km * 21 + other) - cng - otherExp;

                const payload = {
                    date: window.formatDateToDMY(document.getElementById('date').value),
                    pickupTime: document.getElementById('pickupTime').value,
                    dropTime: document.getElementById('dropTime').value,
                    tripId: document.getElementById('tripId').value,
                    pickup: document.getElementById('pickup').value,
                    drop: document.getElementById('drop').value,
                    person: parseInt(document.getElementById('person').value) || 0,
                    km: km, rate: 21, other: other, cng: cng, otherExpense: otherExp,
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
                if(!confirm("Delete?")) return;
                await fetch('/api/trips/'+id, { method: 'DELETE' });
                fetchTrips();
            };

  function updateDashboard(data) {
    let totalTrips = data.length;
    let totalKM = 0;
    let entryTotal = 0;
    let companyTotal = 0;
    let todayKM = 0;
    let todayAmt = 0;

    const today = new Date().toLocaleDateString('en-GB').split('/').join('-');

    data.forEach(e => {
        const km = parseFloat(e.km || 0);
        const amt = parseFloat(e.total || 0);

        totalKM += km;
        entryTotal += amt;
        companyTotal += km * 21;

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
}

function updateMonthlySummary(data) {
    const monthInput = document.getElementById('dashMonthFilter');

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
            company += k * 21;
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

        if (id.toLowerCase().includes('total') || id.toLowerCase().includes('amt')) {
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

            const companyValue = (parseFloat(e.km || 0)) * 21;
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

'<button onclick="window.openEditModal(' + JSON.stringify(e._id) + ')" class="text-indigo-500">🖊</button>' +

'<button onclick="window.deleteTrip(' + JSON.stringify(e._id) + ')" class="text-rose-400 ml-2">🗑️</button>' +

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

   window.onload = () => {

    window.loadDarkMode();
    window.loadSettings();

    // ✅ DEFAULT CURRENT MONTH SET (Dashboard)
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    const dashFilter = document.getElementById('dashMonthFilter');
    if (dashFilter) dashFilter.value = currentMonth;

    fetchTrips();
    window.startTypingEffect();
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