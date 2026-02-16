/**
 * TRIP MANAGER - MONGODB VERSION (GRAND TOTAL UPDATED)
 * Steps to Run:
 * 1. npm install express mongoose
 * 2. node server.js
 */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

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
    } catch (err) { res.status(500).json(err); }
});

// Serve Frontend
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ટ્રિપ મેનેજમેન્ટ - MongoDB Live</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@300;400;500;600;700&family=Inter:wght@400;600;800&display=swap');
        body { font-family: 'Hind Vadodara', 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; }
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .welcome-gradient { background: linear-gradient(135deg, #4f46e5, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; transition: all 0.2s; background-color: white; }
        .input-field:focus { box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2); border-color: #6366f1; }
        .btn-primary { background-color: #4f46e5; color: white; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; transition: all 0.2s; width: 100%; cursor: pointer; }
        .nav-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; cursor: pointer; }
        .nav-btn-active { background-color: #4f46e5; color: white; }
        .nav-btn-inactive { color: #cbd5e1; }
    </style>
</head>
<body class="min-h-screen">
    <nav class="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
            <div class="text-xl font-extrabold text-indigo-400 uppercase italic tracking-tighter">Trip Manager</div>
            <div class="flex space-x-2 overflow-x-auto no-scrollbar py-2">
                <button id="btn-home" onclick="window.showTab('home')" class="nav-btn nav-btn-active">હોમ</button>
                <button id="btn-enter-detail" onclick="window.showTab('enter-detail')" class="nav-btn nav-btn-inactive">વિગત</button>
                <button id="btn-entries" onclick="window.showTab('entries')" class="nav-btn nav-btn-inactive">એન્ટ્રી</button>
                <button id="btn-company-entries" onclick="window.showTab('company-entries')" class="nav-btn nav-btn-inactive">કંપની</button>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto p-4 md:p-8">
        <div id="home" class="tab-content active py-12 text-center">
            <div class="bg-white max-w-3xl mx-auto rounded-3xl p-10 shadow-sm border border-slate-200">
                <h1 id="typing-text" class="text-4xl md:text-6xl font-extrabold welcome-gradient min-h-[4rem]"></h1>
                <p class="text-slate-500 mb-10 text-lg uppercase font-bold tracking-widest">Rate: 21 (Fixed) | MongoDB Professional</p>
                <button onclick="window.showTab('enter-detail')" class="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-indigo-700 transition">નવી એન્ટ્રી શરૂ કરો ➔</button>
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

    <script>
        let typingTimeout;

        window.formatDateToDMY = function(dateStr) {
            if(!dateStr) return "";
            const parts = dateStr.split('-');
            if(parts.length !== 3) return dateStr;
            return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
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
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('nav-btn-active'); b.classList.add('nav-btn-inactive');
            });
            const activeBtn = document.getElementById('btn-' + id);
            if(activeBtn) activeBtn.classList.add('nav-btn-active');
            if (id === 'entries' || id === 'company-entries') fetchTrips();
            if (id === 'home') window.startTypingEffect();
            window.scrollTo({top:0, behavior:'smooth'});
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

    const selectedMonth = document.getElementById('monthFilter')?.value;

    if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');

        const filtered = data.filter(e => {
            if (!e.date) return false;

            const parts = e.date.split('-');
            if (parts.length !== 3) return false;

            return parts[1] === month && parts[2] === year;
        });

        renderTables(filtered);
    } else {
        renderTables(data);
    }
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

        // ✅ ENTRY TOTAL
        gKm += km; 
        gCng += cng; 
        gAmt += amt;

        // ✅ COMPANY TOTAL (SEPARATE & SAFE)
        const companyValue = (parseFloat(e.km || 0)) * 21;
        gcAmt += companyValue;

        const base = \`
            <td class="p-4 font-bold text-slate-800 font-mono text-xs">\${e.date}</td>
            <td class="p-4 font-black text-indigo-600 uppercase font-mono">\${e.tripId}</td>
            <td class="p-4 text-center font-bold">\${e.person}</td>
            <td class="p-4 text-[10px] leading-tight font-semibold">🏁 \${e.pickup}<br>📍 \${e.drop}</td>
            <td class="p-4 font-bold font-mono">\${km.toFixed(2)} KM</td>
            <td class="p-4 text-[10px] font-black text-slate-500 uppercase font-mono">\${e.pickupTime} - \${e.dropTime}</td>
        \`;

        // ENTRY TABLE
        lBody.innerHTML += \`
            <tr class="hover:bg-slate-50 border-b">
                \${base}
                <td class="p-4 text-[9px] font-bold">
                    Other:+₹\${e.other}<br>
                    CNG:-₹\${e.cng}<br>
                    Exp:-₹\${e.otherExpense}
                </td>
                <td class="p-4 text-right font-black text-slate-900">
                    ₹\${amt.toLocaleString('en-IN', {minimumFractionDigits:2})}
                </td>
                <td class="p-4 text-center no-pdf">
                    <button onclick="window.deleteTrip('\${e._id}')" class="text-rose-400">🗑️</button>
                </td>
            </tr>\`;

        // COMPANY TABLE
        cBody.innerHTML += \`
            <tr class="hover:bg-indigo-50 border-b">
                \${base}
                <td class="p-4 text-right font-black text-indigo-900 text-base">
                    ₹\${companyValue.toLocaleString('en-IN', {minimumFractionDigits:2})}
                </td>
            </tr>\`;
    });

    // ENTRY FOOTER
    const fHtml = (trips, km, cng, amt) => \`
        <tr>
            <td colspan="2" class="p-4 text-xs">Trips: \${trips}</td>
            <td class="p-4 text-center">-</td>
            <td class="p-4 text-xs text-center font-black underline">Grand Total</td>
            <td class="p-4 font-mono">\${km.toFixed(2)} KM</td>
            <td class="p-4 text-[10px] font-black">
                \${cng > 0 ? 'CNG:-₹'+cng.toLocaleString('en-IN') : '-'}
            </td>
            <td class="p-4"></td>
            <td class="p-4 text-right text-indigo-300 text-base">
                ₹\${amt.toLocaleString('en-IN', {minimumFractionDigits:2})}
            </td>
            <td class="no-pdf"></td>
        </tr>\`;

    // COMPANY FOOTER (✅ FIXED)
    const cfHtml = (trips, km, amt) => \`
        <tr>
            <td colspan="2" class="p-4 text-xs">Trips: \${trips}</td>
            <td class="p-4 text-center">-</td>
            <td class="p-4 text-xs text-center font-black underline">Grand Total</td>
            <td class="p-4 font-mono">\${km.toFixed(2)} KM</td>
            <td class="p-4 text-center">-</td>
            <td class="p-4 text-right text-indigo-100 text-lg">
                ₹\${amt.toLocaleString('en-IN', {minimumFractionDigits:2})}
            </td>
        </tr>\`;

    lFoot.innerHTML = fHtml(data.length, gKm, gCng, gAmt);
    cFoot.innerHTML = cfHtml(data.length, gKm, gcAmt);  // ✅ ONLY COMPANY TOTAL
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

        window.onload = () => { fetchTrips(); window.startTypingEffect(); }
    </script>
</body>
</html>
    `);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server chalu thai gayu che: http://localhost:${PORT} 🚀`);
}); 