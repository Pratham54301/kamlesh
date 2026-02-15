/**
 * TRIP MANAGER - MONGODB VERSION (DEPLOYMENT READY)
 * Commands to run locally:
 * 1. npm init -y
 * 2. npm install express mongoose
 * 3. node server.js
 */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// --- MONGODB CONNECTION STRING ---
const mongoURI = "mongodb+srv://vedteic:Pratham%4054301@vedteix.yby9dng.mongodb.net/tripkamlesh-db";

mongoose.connect(mongoURI)
    .then(() => console.log("Kamlesh Bhai, MongoDB sathe connection thai gayu che! ✅"))
    .catch(err => console.error("Connection ma bhul che: ", err));

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
    rate: Number,
    other: Number,
    cng: Number,
    otherExpense: Number,
    total: String,
    createdAt: { type: Date, default: Date.now }
});

const Trip = mongoose.model('Trip', tripSchema);

// API Routes
app.get('/api/trips', async (req, res) => {
    try {
        const trips = await Trip.find().sort({ createdAt: -1 });
        res.json(trips);
    } catch (err) { res.status(500).json(err); }
});

app.post('/api/trips', async (req, res) => {
    try {
        const count = await Trip.countDocuments();
        if (count >= 10000) {
            const oldest = await Trip.find().sort({ createdAt: 1 }).limit(1);
            if (oldest.length > 0) {
                await Trip.deleteOne({ _id: oldest[0]._id });
            }
        }
        const newTrip = new Trip(req.body);
        await newTrip.save();
        res.json(newTrip);
    } catch (err) { res.status(500).json(err); }
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
        .teddy-container { animation: teddyFloat 4s ease-in-out infinite; }
        @keyframes teddyFloat { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-8px) rotate(3deg); } }
        .cursor { display: inline-block; width: 3px; background-color: #4f46e5; margin-left: 4px; animation: blink 0.8s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .welcome-gradient { background: linear-gradient(135deg, #4f46e5, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; transition: all 0.2s; background-color: white; }
        .btn-primary { background-color: #4f46e5; color: white; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.5rem; transition: all 0.2s; width: 100%; }
        .nav-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
        .nav-btn-active { background-color: #4f46e5; color: white; }
        .nav-btn-inactive { color: #cbd5e1; }
    </style>
</head>
<body class="min-h-screen">
    <nav class="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
            <div class="text-xl font-extrabold text-indigo-400">TRIP MANAGER</div>
            <div class="flex space-x-2 overflow-x-auto">
                <button id="btn-home" onclick="showTab('home')" class="nav-btn nav-btn-active">હોમ</button>
                <button id="btn-enter-detail" onclick="showTab('enter-detail')" class="nav-btn nav-btn-inactive">વિગત</button>
                <button id="btn-entries" onclick="showTab('entries')" class="nav-btn nav-btn-inactive">એન્ટ્રી</button>
                <button id="btn-company-entries" onclick="showTab('company-entries')" class="nav-btn nav-btn-inactive">કંપની</button>
            </div>
        </div>
    </nav>

    <div class="max-w-7xl mx-auto p-4 md:p-8">
        <div id="home" class="tab-content active py-12 text-center">
            <div class="bg-white max-w-3xl mx-auto rounded-3xl p-10 shadow-sm border border-slate-200">
                <div class="teddy-container mb-8 inline-block">
                    <svg width="120" height="120" viewBox="0 0 200 200"><circle cx="60" cy="60" r="30" fill="#92400e" /><circle cx="140" cy="60" r="30" fill="#92400e" /><circle cx="100" cy="110" r="75" fill="#b45309" /><circle cx="75" cy="100" r="8" fill="#0f172a" /><circle cx="125" cy="100" r="8" fill="#0f172a" /><ellipse cx="100" cy="135" rx="28" ry="22" fill="#fde68a" /><circle cx="100" cy="125" r="7" fill="#0f172a" /><path d="M 85 145 Q 100 162 115 145" stroke="#0f172a" stroke-width="3" fill="none" stroke-linecap="round" /></svg>
                </div>
                <h1 id="typing-text" class="text-4xl md:text-6xl font-extrabold welcome-gradient min-h-[4rem]"></h1>
                <p class="text-slate-500 mb-10 text-lg">Fixed Rate: 21 | LIVE MONGODB</p>
                <button onclick="showTab('enter-detail')" class="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg">નવી એન્ટ્રી ➔</button>
            </div>
        </div>

        <div id="enter-detail" class="tab-content max-w-3xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                <h2 class="text-2xl font-extrabold mb-6 border-b pb-4">ટ્રિપની વિગત ભરો</h2>
                <form id="tripForm" class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label class="text-xs font-bold uppercase">તારીખ</label><input type="date" id="date" required class="input-field"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-xs font-bold uppercase">Pickup</label><input type="time" id="pickupTime" required class="input-field"></div>
                        <div><label class="text-xs font-bold uppercase">Drop</label><input type="time" id="dropTime" required class="input-field"></div>
                    </div>
                    <div class="md:col-span-2"><label class="text-xs font-bold uppercase">ટ્રિપ આઈડી</label><input type="text" id="tripId" placeholder="Manual ID" required class="input-field font-mono"></div>
                    <div><label class="text-xs font-bold uppercase">ચઢવાનું</label><input type="text" id="pickup" list="locationList" required class="input-field"></div>
                    <div><label class="text-xs font-bold uppercase">ઉતરવાનું</label><input type="text" id="drop" list="locationList" required class="input-field"></div>
                    <div><label class="text-xs font-bold uppercase">માણસો</label><input type="number" id="person" required class="input-field"></div>
                    <div><label class="text-xs font-bold uppercase">KM</label><input type="number" id="km" step="0.01" required oninput="calculateTotal()" class="input-field"></div>
                    <div><label class="text-xs font-bold uppercase">Rate</label><input type="number" id="rate" value="21" readonly class="input-field bg-slate-100 font-bold"></div>
                    <div><label class="text-xs font-bold uppercase">અન્ય (+)</label><input type="number" id="other" step="0.01" value="0" oninput="calculateTotal()" class="input-field"></div>
                    <div><label class="text-xs font-bold uppercase">CNG (-)</label><input type="number" id="cng" step="0.01" value="0" oninput="calculateTotal()" class="input-field"></div>
                    <div class="md:col-span-2"><label class="text-xs font-bold uppercase">ખર્ચ (-)</label><input type="number" id="otherExpense" step="0.01" value="0" oninput="calculateTotal()" class="input-field bg-rose-50"></div>
                    <div class="md:col-span-2 bg-slate-900 p-6 rounded-xl flex justify-between items-center text-white"><span class="text-slate-400">TOTAL:</span><span id="totalDisplay" class="text-3xl font-black">₹ 0.00</span></div>
                    <button type="button" onclick="saveToMongo()" class="md:col-span-2 btn-primary py-4 text-lg">Save to MongoDB 💾</button>
                </form>
            </div>
        </div>

        <div id="entries" class="tab-content">
            <div id="pdf-area-normal" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-6 flex justify-between items-center bg-slate-50">
                    <h2 class="text-xl font-extrabold uppercase">બધી એન્ટ્રીઓ</h2>
                    <button onclick="downloadPDF('pdf-area-normal')" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">📥 PDF</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
                            <tr><th class="p-4">તારીખ</th><th class="p-4">ID</th><th class="p-4">માણસો</th><th class="p-4">રૂટ</th><th class="p-4">KM</th><th class="p-4">સમય</th><th class="p-4 text-right">ટોટલ</th><th class="p-4"></th></tr>
                        </thead>
                        <tbody id="entriesTableBody" class="divide-y"></tbody>
                        <tfoot id="entriesFooter"></tfoot>
                    </table>
                </div>
            </div>
        </div>

        <div id="company-entries" class="tab-content">
            <div id="pdf-area-company" class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="p-6 flex justify-between items-center bg-indigo-900 text-white">
                    <h2 class="text-xl font-extrabold uppercase">કંપની એન્ટ્રી</h2>
                    <button onclick="downloadPDF('pdf-area-company')" class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold shadow-md">📁 PDF</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                            <tr><th class="p-4">તારીખ</th><th class="p-4">ID</th><th class="p-4">માણસો</th><th class="p-4">રૂટ</th><th class="p-4">KM</th><th class="p-4">સમય</th><th class="p-4 text-right">ટોટલ</th><th class="p-4"></th></tr>
                        </thead>
                        <tbody id="companyTableBody" class="divide-y"></tbody>
                        <tfoot id="companyFooter"></tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <datalist id="locationList">
        <option value="અખબારનગર"> <option value="અંબાવાડી"> <option value="બોપલ"> <option value="ચાંદખેડા"> <option value="ગોટા"> <option value="ઇસનપુર"> <option value="નિકોલ"> <option value="સેટેલાઇટ"> <option value="થલતેજ"> <option value="વસ્ત્રાપુર"> <option value="સરગાસણ">
    </datalist>

    <div id="toast" class="hidden fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-xl shadow-2xl z-[100] font-bold"></div>

    <script>
        let typingTimeout;

        function formatDateToDMY(dateStr) {
            if(!dateStr) return "";
            const [y, m, d] = dateStr.split('-');
            return \`\${d}-\\${m}-\\${y}\`;
        }

        async function fetchTrips() {
            try {
                const res = await fetch('/api/trips');
                const data = await res.json();
                renderTables(data);
            } catch(e) { console.error(e); }
        }

        async function saveToMongo() {
            const form = document.getElementById('tripForm');
            if(!form.checkValidity()) { form.reportValidity(); return; }

            const km = parseFloat(document.getElementById('km').value) || 0;
            const other = parseFloat(document.getElementById('other').value) || 0;
            const cng = parseFloat(document.getElementById('cng').value) || 0;
            const otherExp = parseFloat(document.getElementById('otherExpense').value) || 0;
            const total = (km * 21 + other) - cng - otherExp;

            const entry = {
                date: formatDateToDMY(document.getElementById('date').value),
                pickupTime: document.getElementById('pickupTime').value,
                dropTime: document.getElementById('dropTime').value,
                tripId: document.getElementById('tripId').value,
                pickup: document.getElementById('pickup').value,
                drop: document.getElementById('drop').value,
                person: document.getElementById('person').value,
                km, rate: 21, other, cng, otherExpense: otherExp,
                total: total.toFixed(2)
            };

            const res = await fetch('/api/trips', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(entry)
            });
            if(res.ok) { showToast("Saved! ✅"); fetchTrips(); showTab('entries'); form.reset(); calculateTotal(); }
        }

        async function deleteTrip(id) {
            if(!confirm("Delete?")) return;
            await fetch('/api/trips/'+id, { method: 'DELETE' });
            fetchTrips();
        }

        function renderTables(data) {
            const tbody = document.getElementById('entriesTableBody');
            const cbody = document.getElementById('companyTableBody');
            const foot = document.getElementById('entriesFooter');
            const cfoot = document.getElementById('companyFooter');
            if(!tbody) return;
            tbody.innerHTML = ''; cbody.innerHTML = '';
            
            let gKm = 0, gCng = 0, gAmt = 0, gcAmt = 0;

            data.forEach(e => {
                gKm += parseFloat(e.km); gCng += parseFloat(e.cng); gAmt += parseFloat(e.total);
                const cTotal = e.km * 21; gcAmt += cTotal;

                tbody.innerHTML += \`
                    <tr class="hover:bg-slate-50">
                        <td class="p-4 font-bold text-slate-800">\${e.date}</td>
                        <td class="p-4 font-bold text-indigo-600 uppercase">\${e.tripId}</td>
                        <td class="p-4 text-center font-bold">\${e.person}</td>
                        <td class="p-4 text-[10px] leading-tight font-semibold">🏁 \${e.pickup}<br>📍 \${e.drop}</td>
                        <td class="p-4 font-bold">\${e.km} KM</td>
                        <td class="p-4 text-[10px] uppercase font-black text-slate-500">\${e.pickupTime} - \${e.dropTime}</td>
                        <td class="p-4 font-black text-right text-slate-900">₹\${parseFloat(e.total).toLocaleString('en-IN')}</td>
                        <td class="p-4 text-center"><button onclick="deleteTrip('\${e._id}')" class="text-rose-400">🗑️</button></td>
                    </tr>\`;

                cbody.innerHTML += \`
                    <tr class="hover:bg-indigo-50">
                        <td class="p-4 font-bold text-slate-800">\${e.date}</td>
                        <td class="p-4 font-bold text-slate-600 uppercase">\${e.tripId}</td>
                        <td class="p-4 text-center font-bold">\${e.person}</td>
                        <td class="p-4 text-[10px] leading-tight font-semibold">In: \${e.pickup}<br>Out: \${e.drop}</td>
                        <td class="p-4 font-bold">\${e.km} KM</td>
                        <td class="p-4 text-[10px] uppercase font-black text-slate-500">\${e.pickupTime} - \${e.dropTime}</td>
                        <td class="p-4 font-black text-right text-base text-slate-900">₹\${cTotal.toLocaleString('en-IN')}</td>
                        <td class="p-4 text-center"><button onclick="deleteTrip('\${e._id}')" class="text-rose-400">🗑️</button></td>
                    </tr>\`;
            });

            foot.innerHTML = \`<tr class="bg-slate-900 text-white font-bold"><td colspan="2" class="p-4 text-xs">Trips: \${data.length}</td><td class="p-4 text-center">-</td><td class="p-4 text-xs tracking-widest uppercase">Total</td><td class="p-4">\${gKm.toFixed(2)} KM</td><td class="p-4 text-[10px]">CNG: -₹\${gCng}</td><td class="p-4 text-right text-indigo-300">₹\${gAmt.toLocaleString('en-IN')}</td><td></td></tr>\`;
            cfoot.innerHTML = \`<tr class="bg-indigo-900 text-white font-bold"><td colspan="2" class="p-4 text-xs">Trips: \${data.length}</td><td class="p-4 text-center">-</td><td class="p-4 text-xs tracking-widest uppercase">Total</td><td class="p-4 font-bold">\${gKm.toFixed(2)} KM</td><td class="p-4 text-center">-</td><td class="p-4 text-right text-indigo-100">₹\${gcAmt.toLocaleString('en-IN')}</td><td></td></tr>\`;
        }

        function showTab(id) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('nav-btn-active'); b.classList.add('nav-btn-inactive');
            });
            document.getElementById('btn-' + id).classList.add('nav-btn-active');
            if (id === 'home') startTypingEffect();
        }

        function calculateTotal() {
            const km = parseFloat(document.getElementById('km').value) || 0;
            const other = parseFloat(document.getElementById('other').value) || 0;
            const cng = parseFloat(document.getElementById('cng').value) || 0;
            const otherExp = parseFloat(document.getElementById('otherExpense').value) || 0;
            const total = (km * 21 + other) - cng - otherExp;
            document.getElementById('totalDisplay').innerText = "₹ " + total.toLocaleString('en-IN', {minimumFractionDigits: 2});
        }

        function startTypingEffect() {
            const text = "Welcome Kamlesh Bhai";
            const target = document.getElementById('typing-text');
            if(!target) return;
            target.innerHTML = "";
            let i = 0;
            if(typingTimeout) clearTimeout(typingTimeout);
            const type = () => {
                if (i < text.length) {
                    target.innerHTML += text.charAt(i); i++;
                    typingTimeout = setTimeout(type, 120);
                }
            };
            type();
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            if(!toast) return;
            toast.innerText = msg; toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }

        async function downloadPDF(areaId) {
            const element = document.getElementById(areaId);
            const opt = { margin: 5, filename: 'Kamlesh_Trip_Report.pdf', jsPDF: {orientation: 'portrait'} };
            await html2pdf().set(opt).from(element).save();
        }

        window.onload = () => { fetchTrips(); startTypingEffect(); }
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
 const PORT = 3000;

console.log(`Server chalu thai gayu che: http://localhost:${PORT}`);


});