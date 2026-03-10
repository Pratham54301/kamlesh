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
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Session (must be before routes that use it)
    const mongoURI = process.env.MONGO_URI || "mongodb+srv://vedteic:Pratham%4054301@vedteix.yby9dng.mongodb.net/tripkamlesh-db";
    const AUTH_ACCOUNTS = Object.freeze([
        {
            username: '9033337363',
            password: '9033337363',
            userKey: 'kamlesh',
            displayName: 'Kamlesh',
            dbFolder: 'kamlesh',
            dbName: process.env.KAMLESH_DB_NAME || 'kamlesh',
            legacyDbName: process.env.KAMLESH_LEGACY_DB_NAME || 'tripkamlesh-db'
        },
        {
            username: '7777967668',
            password: '7777967668',
            userKey: 'pratham',
            displayName: 'Pratham',
            dbFolder: 'pratham',
            dbName: process.env.PRATHAM_DB_NAME || 'pratham',
            legacyDbName: ''
        }
    ]);
    const ACCOUNT_BY_KEY = new Map(AUTH_ACCOUNTS.map((account) => [account.userKey, account]));
    const DEFAULT_ACCOUNT = AUTH_ACCOUNTS[0];

function getAccountDisplayName(account) {
    return String((account && account.displayName) || DEFAULT_ACCOUNT.displayName || 'Kamlesh').trim() || 'Kamlesh';
}

function applyAccountNameBranding(html, account) {
    const displayName = getAccountDisplayName(account);
    const lowerDisplayName = displayName.toLowerCase();
    const brandedName = `Trip${displayName}`;
    const brandedLowerName = brandedName.toLowerCase();
    return String(html || '')
        .replace(/Kamlashbhai/g, `${displayName}bhai`)
        .replace(/Tripkamlesh/g, brandedName)
        .replace(/tripkamlesh/g, brandedLowerName)
        .replace(/કમલેશ/g, displayName)
        .replace(/कमलेश/g, displayName)
        .replace(/\bKamlesh\b/g, displayName)
        .replace(/\bkamlesh\b/g, lowerDisplayName);
}

const PWA_ASSET_VERSION = process.env.PWA_ASSET_VERSION || '20260310c';
    
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
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(path.join(__dirname, 'manifest.json'));
    });

    app.get('/sw.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Service-Worker-Allowed', '/');
        res.sendFile(path.join(__dirname, 'sw.js'));
    });

    app.get('/favicon.ico', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        res.sendFile(path.join(__dirname, 'favicon.ico'));
    });

    app.get('/icon-192.png', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        res.sendFile(path.join(__dirname, 'icon-192.png'));
    });

    app.get('/icon-512.png', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        res.sendFile(path.join(__dirname, 'icon-512.png'));
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

    const tripInvoiceSchema = new mongoose.Schema(
        {
            tripId: { type: String, default: '' },
            tripDbId: { type: String, default: '' },
            userKey: { type: String, default: '' },
            invoiceMonth: { type: String, default: '' },
            companyName: { type: String, default: '' },
            vehicleNumber: { type: String, default: '' },
            route: { type: String, default: '' },
            invoiceNumber: { type: String, default: '' },
            date: { type: String, default: '' },
            total: { type: Number, default: 0 },
            pdfPath: { type: String, default: '' },
            pdfReady: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        },
        { collection: 'tripset_trip_invoices', versionKey: false }
    );

    // App settings (stored in MongoDB only - no localStorage)
    const appSettingsSchema = new mongoose.Schema(
        {
            key: { type: String, unique: true, required: true },
            companyName: { type: String, default: 'Tripset' },
            rate: { type: Number, default: 21 },
            language: { type: String, default: 'en' },
            darkMode: { type: String, default: 'off', enum: ['on', 'off'] },
            installPromptShown: { type: Boolean, default: false },
            invoiceLogoUrl: { type: String, default: '/icon-512.png' },
            invoiceCustomerName: { type: String, default: 'Walk-in Customer' },
            invoiceCustomerContact: { type: String, default: '' },
            invoiceTaxPercent: { type: Number, default: 0 },
            invoicePaymentStatus: {
                type: String,
                default: 'Pending',
                enum: ['Pending', 'Paid', 'Partially Paid', 'Unpaid']
            }
        },
        { collection: 'tripset_settings', versionKey: false }
    );

const userProfileSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, required: true },
        name: { type: String, required: true },
        mobileNumber: { type: String, required: true },
        vehicleNumber: { type: String, required: true },
        email: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_user_profile', versionKey: false }
);

const signupUserSchema = new mongoose.Schema(
    {
        userKey: { type: String, unique: true, required: true },
        name: { type: String, required: true },
        mobileNumber: { type: String, unique: true, required: true },
        vehicleNumber: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        passwordHash: { type: String, required: true },
        dbFolder: { type: String, required: true },
        dbName: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        isBlocked: { type: Boolean, default: false },
        blockedAt: { type: Date, default: null }
    },
    {
        collection: 'tripset_users',
        versionKey: false,
        timestamps: true
    }
);

const SignupUser = mongoose.models.SignupUser || mongoose.model('SignupUser', signupUserSchema);
const adminActivitySchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        actor: { type: String, default: '' },
        targetUserKey: { type: String, default: '' },
        message: { type: String, default: '' },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_admin_activity', versionKey: false }
);
const AdminActivity = mongoose.models.AdminActivity || mongoose.model('AdminActivity', adminActivitySchema);
const adminAnnouncementSchema = new mongoose.Schema(
    {
        title: { type: String, default: '' },
        message: { type: String, required: true },
        defaultLanguage: { type: String, default: 'en' },
        translations: { type: mongoose.Schema.Types.Mixed, default: {} },
        targetType: { type: String, default: 'all' },
        targetUserKeys: { type: [String], default: [] },
        targetCompanyNames: { type: [String], default: [] },
        startsAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, default: null },
        status: { type: String, default: 'active' },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_admin_announcements', versionKey: false }
);
const AdminAnnouncement = mongoose.models.AdminAnnouncement || mongoose.model('AdminAnnouncement', adminAnnouncementSchema);
const adminFeatureSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, required: true },
        signupEnabled: { type: Boolean, default: true },
        pdfEnabled: { type: Boolean, default: true },
        excelEnabled: { type: Boolean, default: true },
        maintenanceEnabled: { type: Boolean, default: false },
        updatedAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_admin_features', versionKey: false }
);
const AdminFeature = mongoose.models.AdminFeature || mongoose.model('AdminFeature', adminFeatureSchema);
const adminNotificationSchema = new mongoose.Schema(
    {
        type: { type: String, required: true },
        title: { type: String, default: '' },
        message: { type: String, default: '' },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_admin_notifications', versionKey: false }
);
const AdminNotification = mongoose.models.AdminNotification || mongoose.model('AdminNotification', adminNotificationSchema);
const systemErrorSchema = new mongoose.Schema(
    {
        level: { type: String, default: 'error' },
        source: { type: String, default: '' },
        message: { type: String, default: '' },
        stack: { type: String, default: '' },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now }
    },
    { collection: 'tripset_system_errors', versionKey: false }
);
const SystemErrorLog = mongoose.models.SystemErrorLog || mongoose.model('SystemErrorLog', systemErrorSchema);

const SIGNUP_PASSWORD_SALT_ROUNDS = Math.max(8, Number(process.env.SIGNUP_PASSWORD_SALT_ROUNDS) || 10);
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'Admin@giftcity').trim();
const ADMIN_PASSWORD_HASH = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
const dbContextCache = new Map();
const legacyMigrationCache = new Map();
const ACCOUNT_BY_USERNAME = new Map(AUTH_ACCOUNTS.map((account) => [account.username, account]));
const SUPPORTED_APP_LANGUAGES = ['en', 'gu', 'hi'];

function normalizeDigitString(value) {
    const raw = String(value == null ? '' : value).trim();
    let out = '';
    for (const ch of raw) {
        const cp = ch.codePointAt(0);
        if (cp >= 48 && cp <= 57) { out += ch; continue; } // 0-9
        if (cp >= 0x0660 && cp <= 0x0669) { out += String(cp - 0x0660); continue; } // Arabic-Indic
        if (cp >= 0x06F0 && cp <= 0x06F9) { out += String(cp - 0x06F0); continue; } // Extended Arabic-Indic
        if (cp >= 0x0966 && cp <= 0x096F) { out += String(cp - 0x0966); continue; } // Devanagari
        if (cp >= 0x09E6 && cp <= 0x09EF) { out += String(cp - 0x09E6); continue; } // Bengali
        if (cp >= 0x0AE6 && cp <= 0x0AEF) { out += String(cp - 0x0AE6); continue; } // Gujarati
        if (cp >= 0xFF10 && cp <= 0xFF19) { out += String(cp - 0xFF10); continue; } // Full-width
    }
    return out;
}

function normalizePersonName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function normalizeMobileNumber(mobileNumber) {
    const digits = normalizeDigitString(mobileNumber);
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.slice(2);
    }
    return digits;
}

function normalizeVehicleNumber(vehicleNumber) {
    return String(vehicleNumber || '').trim().replace(/\s+/g, '').toUpperCase();
}

function normalizeLanguageCode(language) {
    const code = String(language || '').trim().toLowerCase();
    return SUPPORTED_APP_LANGUAGES.includes(code) ? code : 'en';
}

function normalizeCompanyToken(name) {
    return String(name || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

function isValidMobileNumber(mobileNumber) {
    return /^\d{10}$/.test(normalizeMobileNumber(mobileNumber));
}

function isValidVehicleNumber(vehicleNumber) {
    return /^[A-Z0-9-]{6,20}$/.test(normalizeVehicleNumber(vehicleNumber));
}

function makeSafeToken(input, fallback) {
    const token = String(input || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24);
    return token || fallback;
}

function buildUserStorageInfo(name, mobileNumber) {
    const nameToken = makeSafeToken(name, 'user');
    const mobileToken = normalizeMobileNumber(mobileNumber).slice(-10);
    const randomToken = crypto.randomBytes(4).toString('hex');
    return {
        userKey: (`user_${nameToken}_${mobileToken}_${randomToken}`).slice(0, 63),
        dbFolder: (`${nameToken}_${mobileToken.slice(-4)}`).slice(0, 32),
        dbName: (`tripset_${nameToken}_${mobileToken}_${randomToken}`).slice(0, 63)
    };
}

function getSignupAccountFromSession(req) {
    const session = req && req.session ? req.session : null;
    if (!session || !session.isDynamicUser) return null;

    const userKey = String(session.authUserKey || '').trim();
    const username = String(session.authUsername || '').trim();
    const displayName = normalizePersonName(session.displayName || '');
    const dbFolder = String(session.dbFolder || '').trim();
    const dbName = String(session.dbName || '').trim();

    if (!userKey || !username || !displayName || !dbFolder || !dbName) return null;

    return {
        userKey,
        username,
        displayName,
        dbFolder,
        dbName,
        legacyDbName: '',
        isDynamicUser: true
    };
}

function getAccountFromSignupUser(userDoc) {
    if (!userDoc) return null;
    return {
        userKey: String(userDoc.userKey || '').trim(),
        username: String(userDoc.mobileNumber || '').trim(),
        displayName: normalizePersonName(userDoc.name || ''),
        dbFolder: String(userDoc.dbFolder || '').trim(),
        dbName: String(userDoc.dbName || '').trim(),
        legacyDbName: '',
        isDynamicUser: true
    };
}

function findDefaultAccountByUsername(username) {
    const key = String(username || '').trim();
    return ACCOUNT_BY_USERNAME.get(key) || null;
}

function findDefaultAccountByCredentials(username, password) {
    const account = findDefaultAccountByUsername(username);
    if (!account) return null;
    return account.password === String(password || '').trim() ? account : null;
}

function isDefaultAccount(account) {
    if (!account) return false;
    return ACCOUNT_BY_KEY.has(String(account.userKey || '').trim());
}

function setSessionAccount(req, account) {
    req.session.isAuthenticated = true;
    req.session.authUserKey = account.userKey;
    req.session.authUsername = account.username;
    req.session.displayName = getAccountDisplayName(account);
    req.session.dbFolder = account.dbFolder;
    req.session.dbName = account.dbName;
    req.session.isDynamicUser = !!account.isDynamicUser;
}

function clearSessionAccount(req) {
    if (!req || !req.session) return;
    req.session.isAuthenticated = false;
    req.session.authUserKey = '';
    req.session.authUsername = '';
    req.session.displayName = '';
    req.session.dbFolder = '';
    req.session.dbName = '';
    req.session.isDynamicUser = false;
}

function resolveSessionAccount(req) {
    if (!req.session || !req.session.isAuthenticated) return null;

    const sessionKey = String(req.session.authUserKey || '').trim();
    const sessionUsername = String(req.session.authUsername || '').trim();
    let account = ACCOUNT_BY_KEY.get(sessionKey) || null;
    if (!account) account = getSignupAccountFromSession(req);
    if (!account) account = findDefaultAccountByUsername(sessionUsername);

    if (!account) {
        clearSessionAccount(req);
        return null;
    }
    setSessionAccount(req, account);
    return account;
}

async function findActiveSignupUserByMobile(mobileNumber) {
    const mobile = normalizeMobileNumber(mobileNumber);
    if (!isValidMobileNumber(mobile)) return null;
    return SignupUser.findOne({ mobileNumber: mobile, isActive: true });
}

function validateSignupPayload(payload) {
    const name = normalizePersonName(payload && payload.name);
    const mobileNumber = normalizeMobileNumber(payload && payload.mobileNumber);
    const vehicleNumber = normalizeVehicleNumber(payload && payload.vehicleNumber);
    const email = normalizeEmail(payload && payload.email);
    const password = String((payload && payload.password) || '').trim();
    const confirmPassword = String((payload && payload.confirmPassword) || '').trim();

    if (!name || !mobileNumber || !vehicleNumber || !email || !password || !confirmPassword) {
        return { error: 'All fields are required' };
    }
    if (name.length < 2 || name.length > 60) {
        return { error: 'Name must be between 2 and 60 characters' };
    }
    if (!isValidMobileNumber(mobileNumber)) {
        return { error: 'Mobile number must be exactly 10 digits' };
    }
    if (!isValidVehicleNumber(vehicleNumber)) {
        return { error: 'Vehicle number is invalid' };
    }
    if (!isValidEmail(email)) {
        return { error: 'Email ID is invalid' };
    }
    if (password.length < 6) {
        return { error: 'Password must be at least 6 characters' };
    }
    if (password !== confirmPassword) {
        return { error: 'Password and confirm password do not match' };
    }
    if (findDefaultAccountByUsername(mobileNumber)) {
        return { error: 'This mobile number is already reserved. Please use login.' };
    }

    return {
        value: {
            name,
            mobileNumber,
            vehicleNumber,
            email,
            password
        }
    };
}

function getSignupConflictMessage(err) {
    if (!err || err.code !== 11000) return '';
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    if (!keys.length) return 'Account already exists';
    if (keys[0] === 'mobileNumber') return 'This mobile number is already registered';
    if (keys[0] === 'email') return 'This email ID is already registered';
    if (keys[0] === 'userKey') return 'Unable to create account. Please try again';
    return 'Account already exists';
}

function resolveAdminSession(req) {
    if (!req || !req.session) return null;
    if (!req.session.adminAuthenticated) return null;
    const username = String(req.session.adminUsername || '').trim();
    if (!username || username !== ADMIN_USERNAME) return null;
    return { username };
}

function setAdminSession(req) {
    if (!req || !req.session) return;
    req.session.adminAuthenticated = true;
    req.session.adminUsername = ADMIN_USERNAME;
}

function clearAdminSession(req) {
    if (!req || !req.session) return;
    req.session.adminAuthenticated = false;
    req.session.adminUsername = '';
}

async function validateAdminCredentials(username, password) {
    const normalizedUser = String(username || '').trim();
    const normalizedPass = String(password || '').trim();
    if (!normalizedUser || !normalizedPass) return false;
    if (normalizedUser !== ADMIN_USERNAME) return false;
    if (ADMIN_PASSWORD_HASH) {
        try {
            return await bcrypt.compare(normalizedPass, ADMIN_PASSWORD_HASH);
        } catch (err) {
            return false;
        }
    }
    return normalizedPass === ADMIN_PASSWORD;
}

async function recordAdminActivity(event) {
    try {
        const payload = event || {};
        await AdminActivity.create({
            type: String(payload.type || 'system_event'),
            actor: String(payload.actor || 'system'),
            targetUserKey: String(payload.targetUserKey || ''),
            message: String(payload.message || ''),
            meta: payload.meta || {},
            createdAt: new Date()
        });
    } catch (err) {
        console.warn('Admin activity logging warning:', err.message);
    }
}

const DEFAULT_ADMIN_FEATURE_FLAGS = Object.freeze({
    signupEnabled: true,
    pdfEnabled: true,
    excelEnabled: true,
    maintenanceEnabled: false
});

async function getAdminFeatureFlags() {
    let doc = await AdminFeature.findOne({ key: 'singleton' }).lean();
    if (!doc) {
        doc = await AdminFeature.create({
            key: 'singleton',
            signupEnabled: true,
            pdfEnabled: true,
            excelEnabled: true,
            maintenanceEnabled: false,
            updatedAt: new Date()
        });
        doc = doc.toObject ? doc.toObject() : doc;
    }
    return {
        signupEnabled: doc.signupEnabled !== false,
        pdfEnabled: doc.pdfEnabled !== false,
        excelEnabled: doc.excelEnabled !== false,
        maintenanceEnabled: doc.maintenanceEnabled === true,
        updatedAt: doc.updatedAt || null
    };
}

async function updateAdminFeatureFlags(input) {
    const payload = input || {};
    const nextFlags = {
        signupEnabled: payload.signupEnabled !== false,
        pdfEnabled: payload.pdfEnabled !== false,
        excelEnabled: payload.excelEnabled !== false,
        maintenanceEnabled: payload.maintenanceEnabled === true
    };
    await AdminFeature.updateOne(
        { key: 'singleton' },
        {
            key: 'singleton',
            signupEnabled: nextFlags.signupEnabled,
            pdfEnabled: nextFlags.pdfEnabled,
            excelEnabled: nextFlags.excelEnabled,
            maintenanceEnabled: nextFlags.maintenanceEnabled,
            updatedAt: new Date()
        },
        { upsert: true }
    );
    return nextFlags;
}

async function isMaintenanceModeEnabled() {
    const flags = await getAdminFeatureFlags();
    return flags.maintenanceEnabled === true;
}

function isAnnouncementCurrentlyActive(item, now) {
    const row = item || {};
    const current = now instanceof Date ? now : new Date();
    if (row.isActive === false) return false;
    if (String(row.status || 'active').trim().toLowerCase() === 'expired') return false;
    const startsAt = row.startsAt ? new Date(row.startsAt) : null;
    const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
    if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > current.getTime()) return false;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < current.getTime()) return false;
    return true;
}

function getLocalizedAnnouncementContent(item, language) {
    const lang = normalizeLanguageCode(language);
    const defaultLanguage = normalizeLanguageCode(item && item.defaultLanguage);
    const translations = (item && item.translations && typeof item.translations === 'object') ? item.translations : {};
    const defaultEntry = translations[defaultLanguage] && typeof translations[defaultLanguage] === 'object' ? translations[defaultLanguage] : {};
    const selectedEntry = translations[lang] && typeof translations[lang] === 'object' ? translations[lang] : {};
    return {
        language: lang,
        title: String(selectedEntry.title || defaultEntry.title || item.title || '').trim(),
        message: String(selectedEntry.message || defaultEntry.message || item.message || '').trim()
    };
}

function announcementMatchesTarget(item, userKey, companyName) {
    const targetType = String((item && item.targetType) || 'all').trim().toLowerCase() || 'all';
    if (targetType === 'selected_users') {
        const allowedUsers = Array.isArray(item && item.targetUserKeys) ? item.targetUserKeys.map((value) => String(value || '').trim()) : [];
        return allowedUsers.includes(String(userKey || '').trim());
    }
    if (targetType === 'selected_company_users') {
        const allowedCompanies = Array.isArray(item && item.targetCompanyNames)
            ? item.targetCompanyNames.map((value) => normalizeCompanyToken(value))
            : [];
        return allowedCompanies.includes(normalizeCompanyToken(companyName));
    }
    return true;
}

async function getAdminAnnouncements(includeInactive, limit) {
    const query = includeInactive ? {} : { isActive: true };
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    let items = await AdminAnnouncement.find(query).sort({ createdAt: -1 }).limit(includeInactive ? safeLimit : safeLimit * 3).lean();
    if (!includeInactive) {
        const now = new Date();
        items = items.filter((item) => isAnnouncementCurrentlyActive(item, now));
    }
    return items.slice(0, safeLimit);
}

async function getAnnouncementsForAccount(account, language, limit) {
    const safeAccount = account || null;
    if (!safeAccount) return [];
    const context = getDbContextByName(safeAccount.dbName);
    await ensureLegacyDataMigrated(safeAccount, context);
    const settings = await getSettings(context.AppSettings, safeAccount);
    const userLanguage = normalizeLanguageCode(language || settings.language || 'en');
    const companyName = String((settings && settings.companyName) || getAccountDisplayName(safeAccount)).trim();
    const items = await getAdminAnnouncements(false, Math.max(10, Number(limit) || 10));
    return items
        .filter((item) => announcementMatchesTarget(item, safeAccount.userKey, companyName))
        .map((item) => {
            const localized = getLocalizedAnnouncementContent(item, userLanguage);
            return {
                _id: String(item && item._id ? item._id : ''),
                title: localized.title,
                message: localized.message,
                language: localized.language,
                defaultLanguage: normalizeLanguageCode(item && item.defaultLanguage),
                targetType: String((item && item.targetType) || 'all'),
                status: String((item && item.status) || 'active'),
                createdAt: item && item.createdAt ? item.createdAt : null,
                updatedAt: item && item.updatedAt ? item.updatedAt : null,
                startsAt: item && item.startsAt ? item.startsAt : null,
                expiresAt: item && item.expiresAt ? item.expiresAt : null
            };
        });
}

function buildAdminAnnouncementPayload(body) {
    const input = body || {};
    const defaultLanguage = normalizeLanguageCode(input.language || input.defaultLanguage);
    const translationsInput = (input.translations && typeof input.translations === 'object') ? input.translations : {};
    const nextTranslations = {};
    SUPPORTED_APP_LANGUAGES.forEach((lang) => {
        const source = (translationsInput[lang] && typeof translationsInput[lang] === 'object') ? translationsInput[lang] : {};
        const title = String(source.title || '').trim();
        const message = String(source.message || '').trim();
        if (title || message) {
            nextTranslations[lang] = { title, message };
        }
    });

    const title = String(input.title || '').trim();
    const message = String(input.message || '').trim();
    if (!message) {
        throw new Error('Announcement message is required');
    }
    nextTranslations[defaultLanguage] = {
        title: String((nextTranslations[defaultLanguage] && nextTranslations[defaultLanguage].title) || title || '').trim(),
        message: String((nextTranslations[defaultLanguage] && nextTranslations[defaultLanguage].message) || message || '').trim()
    };

    const targetTypeRaw = String(input.targetType || 'all').trim().toLowerCase();
    const targetType = ['all', 'selected_users', 'selected_company_users'].includes(targetTypeRaw) ? targetTypeRaw : 'all';
    const targetUserKeys = Array.isArray(input.targetUserKeys)
        ? input.targetUserKeys.map((value) => String(value || '').trim()).filter(Boolean)
        : [];
    const targetCompanyNames = Array.isArray(input.targetCompanyNames)
        ? input.targetCompanyNames.map((value) => String(value || '').trim()).filter(Boolean)
        : [];
    const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const parsedStartsAt = Number.isNaN(startsAt.getTime()) ? new Date() : startsAt;
    const parsedExpiresAt = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
    const statusRaw = String(input.status || (input.isActive === false ? 'expired' : 'active')).trim().toLowerCase();
    const status = statusRaw === 'expired' ? 'expired' : 'active';
    return {
        title,
        message,
        defaultLanguage,
        translations: nextTranslations,
        targetType,
        targetUserKeys,
        targetCompanyNames,
        startsAt: parsedStartsAt,
        expiresAt: parsedExpiresAt,
        status,
        isActive: input.isActive !== false && status === 'active'
    };
}

async function recordAdminNotification(payload) {
    try {
        const input = payload || {};
        await AdminNotification.create({
            type: String(input.type || 'system'),
            title: String(input.title || 'System Notification'),
            message: String(input.message || ''),
            meta: input.meta || {},
            isRead: false,
            createdAt: new Date()
        });
    } catch (err) {
        console.warn('Admin notification logging warning:', err.message);
    }
}

async function recordSystemError(source, error, meta, level) {
    try {
        const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
        const entry = await SystemErrorLog.create({
            level: String(level || 'error'),
            source: String(source || 'system'),
            message: String(errObj.message || 'Unknown error'),
            stack: String(errObj.stack || ''),
            meta: meta || {},
            createdAt: new Date()
        });
        await recordAdminNotification({
            type: 'system_error',
            title: 'System Error',
            message: `${String(source || 'system')}: ${String(errObj.message || 'Unknown error')}`,
            meta: { errorId: String(entry && entry._id ? entry._id : ''), source: String(source || 'system') }
        });
    } catch (logErr) {
        console.warn('System error logging warning:', logErr.message);
    }
}

async function maybeCreateNotificationForActivity(payload) {
    const type = String((payload && payload.type) || '').trim();
    if (!type) return;
    if (type === 'new_user_registration') {
        await recordAdminNotification({
            type,
            title: 'New User Registration',
            message: String((payload && payload.message) || 'New user registered'),
            meta: payload.meta || {}
        });
    } else if (type === 'company_created') {
        await recordAdminNotification({
            type,
            title: 'New Company Created',
            message: String((payload && payload.message) || 'Company created by user'),
            meta: payload.meta || {}
        });
    } else if (type === 'entry_created') {
        await recordAdminNotification({
            type,
            title: 'Entry Created',
            message: String((payload && payload.message) || 'Trip entry created'),
            meta: payload.meta || {}
        });
    }
}

const originalRecordAdminActivity = recordAdminActivity;
recordAdminActivity = async function(event) {
    const payload = event || {};
    await originalRecordAdminActivity(payload);
    if (!(payload && payload.meta && payload.meta.suppressNotification)) {
        await maybeCreateNotificationForActivity(payload);
    }
};

function getPrimaryActivityUserKey(log) {
    if (!log) return '';
    const actor = String(log.actor || '').trim();
    const target = String(log.targetUserKey || '').trim();
    if (actor && actor !== ADMIN_USERNAME && actor !== 'system' && !actor.startsWith('system:')) return actor;
    if (target) return target;
    return actor;
}

async function enrichAdminActivityLogs(logs) {
    const accountRefs = await getAllAccountsForAdmin();
    const byKey = new Map();
    accountRefs.forEach((item) => {
        const key = String((item.account && item.account.userKey) || '').trim();
        if (!key) return;
        byKey.set(key, {
            name: item.signupUser ? String(item.signupUser.name || '').trim() : getAccountDisplayName(item.account),
            companyName: '',
            vehicleNumber: item.signupUser ? String(item.signupUser.vehicleNumber || '').trim() : ''
        });
    });
    await Promise.all(accountRefs.map(async (item) => {
        const key = String((item.account && item.account.userKey) || '').trim();
        if (!key) return;
        try {
            const context = getDbContextByName(item.account.dbName);
            await ensureLegacyDataMigrated(item.account, context);
            const settings = await context.AppSettings.findOne({ key: 'singleton' }).lean();
            const existing = byKey.get(key) || {};
            existing.companyName = String((settings && settings.companyName) || existing.name || '').trim();
            byKey.set(key, existing);
        } catch (err) {}
    }));
    return (logs || []).map((log) => {
        const userKey = getPrimaryActivityUserKey(log);
        const accountMeta = byKey.get(userKey) || {};
        return {
            ...log,
            userKey,
            userName: String(accountMeta.name || userKey || ''),
            companyName: String(accountMeta.companyName || ''),
            vehicleNumber: String(accountMeta.vehicleNumber || '')
        };
    });
}

function generateTemporaryPassword() {
    return `Trip${crypto.randomInt(100000, 999999)}`;
}

async function getCompanyOptionsForAdmin() {
    const overviews = await Promise.all((await getAllAccountsForAdmin()).map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser)));
    return overviews
        .map((item) => ({
            userKey: String(item.userKey || ''),
            companyName: String(item.companyName || '').trim(),
            ownerName: String(item.name || '').trim(),
            vehicleNumber: String(item.vehicleNumber || '').trim()
        }))
        .filter((item) => !!item.companyName)
        .sort((a, b) => String(a.companyName).localeCompare(String(b.companyName)));
}

async function buildAdminStorageUsage(limit) {
    const safeLimit = Math.min(100, Math.max(10, Number(limit) || 50));
    const accountRefs = await getAllAccountsForAdmin();
    const rows = [];
    for (const ref of accountRefs) {
        const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        let approxBytes = 0;
        try {
            const stats = await context.db.db.stats();
            approxBytes = Number(stats && stats.dataSize ? stats.dataSize : 0);
        } catch (err) {
            const [trips, settings, profile, tripInvoices] = await Promise.all([
                context.Trip.countDocuments(),
                context.AppSettings.countDocuments(),
                context.UserProfile.countDocuments(),
                context.TripInvoice.countDocuments()
            ]);
            approxBytes = Number((trips * 1400) + (settings * 1800) + (profile * 900) + (tripInvoices * 650));
        }
        rows.push({
            userKey: overview.userKey,
            name: overview.name,
            companyName: overview.companyName,
            vehicleNumber: overview.vehicleNumber,
            totalEntries: overview.totalEntries,
            approxBytes
        });
    }
    return rows.sort((a, b) => Number(b.approxBytes || 0) - Number(a.approxBytes || 0)).slice(0, safeLimit);
}

async function buildVehiclePerformanceStats(limit) {
    const safeLimit = Math.min(100, Math.max(5, Number(limit) || 25));
    const accountRefs = await getAllAccountsForAdmin();
    const rows = [];
    for (const ref of accountRefs) {
        const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        const trips = await context.Trip.find().lean();
        const totalKm = trips.reduce((sum, trip) => sum + Number(trip && trip.km ? trip.km : 0), 0);
        const totalRevenue = trips.reduce((sum, trip) => sum + Number(trip && trip.total ? trip.total : 0), 0);
        const totalProfit = trips.reduce((sum, trip) => sum + (Number(trip && trip.total ? trip.total : 0) - Number(trip && trip.cng ? trip.cng : 0) - Number(trip && trip.otherExpense ? trip.otherExpense : 0)), 0);
        rows.push({
            userKey: overview.userKey,
            userName: overview.name,
            vehicleNumber: overview.vehicleNumber,
            companyName: overview.companyName,
            totalTrips: trips.length,
            totalKm,
            totalRevenue,
            totalProfit
        });
    }
    return rows
        .filter((item) => !!String(item.vehicleNumber || '').trim())
        .sort((a, b) => Number(b.totalProfit || 0) - Number(a.totalProfit || 0))
        .slice(0, safeLimit);
}

async function buildRouteAnalytics(limit) {
    const safeLimit = Math.min(100, Math.max(5, Number(limit) || 25));
    const accountRefs = await getAllAccountsForAdmin();
    const routeMap = new Map();
    for (const ref of accountRefs) {
        const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        const trips = await context.Trip.find().lean();
        trips.forEach((trip) => {
            const route = [String(trip && trip.pickup || '').trim(), String(trip && trip.drop || '').trim()].filter(Boolean).join(' -> ') || 'Unknown Route';
            const current = routeMap.get(route) || {
                route,
                totalTrips: 0,
                totalRevenue: 0,
                totalKm: 0,
                users: new Set(),
                companies: new Set()
            };
            current.totalTrips += 1;
            current.totalRevenue += Number(trip && trip.total ? trip.total : 0);
            current.totalKm += Number(trip && trip.km ? trip.km : 0);
            current.users.add(String(overview.userKey || ''));
            current.companies.add(String(overview.companyName || ''));
            routeMap.set(route, current);
        });
    }
    return Array.from(routeMap.values())
        .map((item) => ({
            route: item.route,
            totalTrips: item.totalTrips,
            totalRevenue: item.totalRevenue,
            totalKm: item.totalKm,
            totalUsers: item.users.size,
            totalCompanies: item.companies.size
        }))
        .sort((a, b) => Number(b.totalTrips || 0) - Number(a.totalTrips || 0))
        .slice(0, safeLimit);
}

async function buildProfitAnalytics() {
    const accountRefs = await getAllAccountsForAdmin();
    const monthlyMap = new Map();
    const companyMap = new Map();
    const userMap = new Map();
    let overallProfit = 0;
    let overallRevenue = 0;
    let totalTrips = 0;
    for (const ref of accountRefs) {
        const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        const trips = await context.Trip.find().lean();
        trips.forEach((trip) => {
            const revenue = Number(trip && trip.total ? trip.total : 0);
            const cng = Number(trip && trip.cng ? trip.cng : 0);
            const otherExpense = Number(trip && trip.otherExpense ? trip.otherExpense : 0);
            const profit = revenue - cng - otherExpense;
            overallProfit += profit;
            overallRevenue += revenue;
            totalTrips += 1;
            const createdAt = trip && trip.createdAt ? new Date(trip.createdAt) : null;
            const monthKey = createdAt && !Number.isNaN(createdAt.getTime())
                ? `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}`
                : 'Unknown';
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + profit);
            companyMap.set(overview.companyName, (companyMap.get(overview.companyName) || 0) + profit);
            const existingUser = userMap.get(overview.userKey) || { userKey: overview.userKey, userName: overview.name, totalTrips: 0, totalProfit: 0 };
            existingUser.totalTrips += 1;
            existingUser.totalProfit += profit;
            userMap.set(overview.userKey, existingUser);
        });
    }
    return {
        overallProfit,
        overallRevenue,
        totalTrips,
        averageProfitPerTrip: totalTrips ? overallProfit / totalTrips : 0,
        monthlyProfit: Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, profit]) => ({ month, profit })),
        companyProfit: Array.from(companyMap.entries()).map(([companyName, profit]) => ({ companyName, profit })).sort((a, b) => b.profit - a.profit).slice(0, 20),
        leaderboard: Array.from(userMap.values()).sort((a, b) => Number(b.totalProfit || 0) - Number(a.totalProfit || 0)).slice(0, 20)
    };
}

async function buildSystemInsights() {
    const accountRefs = await getAllAccountsForAdmin();
    const hourMap = new Map();
    const routeRows = await buildRouteAnalytics(10);
    let mostActiveUser = null;
    let mostActiveCompany = null;
    const overviews = [];
    for (const ref of accountRefs) {
        const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
        overviews.push(overview);
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        const trips = await context.Trip.find().lean();
        trips.forEach((trip) => {
            const createdAt = trip && trip.createdAt ? new Date(trip.createdAt) : null;
            if (createdAt && !Number.isNaN(createdAt.getTime())) {
                const hourKey = String(createdAt.getHours()).padStart(2, '0');
                hourMap.set(hourKey, (hourMap.get(hourKey) || 0) + 1);
            }
        });
    }
    const rankedUsers = overviews.slice().sort((a, b) => Number(b.totalEntries || 0) - Number(a.totalEntries || 0));
    if (rankedUsers.length) mostActiveUser = { userKey: rankedUsers[0].userKey, name: rankedUsers[0].name, totalTrips: rankedUsers[0].totalTrips };
    const rankedCompanies = overviews.slice().sort((a, b) => Number(b.totalEntries || 0) - Number(a.totalEntries || 0));
    if (rankedCompanies.length) mostActiveCompany = { companyName: rankedCompanies[0].companyName, totalTrips: rankedCompanies[0].totalTrips };
    const peakTripHours = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count })).sort((a, b) => b.count - a.count).slice(0, 6);
    return {
        peakTripHours,
        mostActiveUser,
        mostActiveCompany,
        mostUsedRoute: routeRows[0] || null,
        mostActiveUsers: rankedUsers.slice(0, 5).map((item) => ({ userKey: item.userKey, name: item.name, totalTrips: item.totalTrips }))
    };
}

function detectSmartTripAlerts(trip, overview) {
    const alerts = [];
    const revenue = Number(trip && trip.total ? trip.total : 0);
    const profit = revenue - Number(trip && trip.cng ? trip.cng : 0) - Number(trip && trip.otherExpense ? trip.otherExpense : 0);
    const km = Number(trip && trip.km ? trip.km : 0);
    if (profit < 50) {
        alerts.push({ title: 'Very Low Profit Trip', message: `Low profit detected for ${String(trip && trip.tripId || 'trip')}`, meta: { profit, tripId: String(trip && trip.tripId || ''), userKey: String(overview && overview.userKey || '') } });
    }
    if (km <= 0 || km > 1000) {
        alerts.push({ title: 'Invalid Kilometer Entry', message: `Suspicious KM value detected for ${String(trip && trip.tripId || 'trip')}`, meta: { km, tripId: String(trip && trip.tripId || ''), userKey: String(overview && overview.userKey || '') } });
    }
    return alerts;
}

function toInvoiceMonthValue(dateLike) {
    const dt = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 7);
    return dt.toISOString().slice(0, 7);
}

function getTripInvoiceMonth(trip) {
    const rawDate = String((trip && trip.date) || '').trim();
    if (/^\d{4}-\d{2}/.test(rawDate)) {
        return rawDate.slice(0, 7);
    }
    const dayFirstMatch = rawDate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (dayFirstMatch) {
        return `${dayFirstMatch[3]}-${String(dayFirstMatch[2]).padStart(2, '0')}`;
    }
    return toInvoiceMonthValue(trip && trip.createdAt ? trip.createdAt : Date.now());
}

function buildTripRouteLabel(trip) {
    const pickup = String((trip && trip.pickup) || '').trim();
    const drop = String((trip && trip.drop) || '').trim();
    return [pickup, drop].filter(Boolean).join(' -> ') || 'Trip Service';
}

function buildTripInvoiceNumber(invoiceMonth, trip) {
    const monthToken = String(invoiceMonth || '').replace(/[^0-9]/g, '').slice(0, 6) || new Date().toISOString().slice(0, 7).replace('-', '');
    const tripToken = makeSafeToken(String((trip && (trip.tripId || trip._id)) || 'trip'), 'trip')
        .replace(/_/g, '')
        .toUpperCase()
        .slice(-8) || 'TRIP';
    return `INV-${monthToken}-${tripToken}`;
}

async function upsertTripInvoiceRecord(context, account, settings, trip, overview) {
    if (!context || !context.TripInvoice || !trip) return null;
    const invoiceMonth = getTripInvoiceMonth(trip);
    const tripDbId = String((trip && trip._id) || '').trim();
    const createdAt = (trip && trip.createdAt) ? new Date(trip.createdAt) : new Date();
    const fallbackDate = Number.isNaN(createdAt.getTime()) ? new Date().toISOString().slice(0, 10) : createdAt.toISOString().slice(0, 10);
    const payload = {
        tripId: String((trip && trip.tripId) || '').trim() || tripDbId,
        tripDbId,
        userKey: String((account && account.userKey) || '').trim(),
        invoiceMonth,
        companyName: String((settings && settings.companyName) || (overview && overview.companyName) || getAccountDisplayName(account)).trim(),
        vehicleNumber: String((overview && overview.vehicleNumber) || '').trim(),
        route: buildTripRouteLabel(trip),
        invoiceNumber: buildTripInvoiceNumber(invoiceMonth, trip),
        date: String((trip && trip.date) || '').trim() || fallbackDate,
        total: Number((trip && trip.total) || 0),
        pdfPath: '',
        pdfReady: false,
        createdAt,
        updatedAt: new Date()
    };
    const filter = tripDbId
        ? { tripDbId }
        : {
            tripId: payload.tripId,
            invoiceMonth: payload.invoiceMonth,
            date: payload.date
        };
    await context.TripInvoice.updateOne(filter, payload, { upsert: true });
    return payload;
}

async function syncTripInvoiceRecords(context, account, settings, trips, overview) {
    if (!context || !context.TripInvoice) return [];
    const rows = Array.isArray(trips) ? trips : [];
    const synced = [];
    for (const trip of rows) {
        const record = await upsertTripInvoiceRecord(context, account, settings, trip, overview);
        if (record) synced.push(record);
    }
    return synced;
}

async function buildAdminSecuritySummary() {
    const since = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const failedEvents = await SystemErrorLog.find({
        createdAt: { $gte: since },
        source: { $in: ['auth_login_failure', 'auth_login_blocked', 'auth_login_validation'] }
    }).sort({ createdAt: -1 }).limit(200).lean();
    const blockedEvents = failedEvents.filter((item) => String(item.source || '') === 'auth_login_blocked');
    const grouped = new Map();
    failedEvents.forEach((item) => {
        const username = String((item.meta && (item.meta.username || item.meta.userKey)) || 'unknown').trim() || 'unknown';
        grouped.set(username, (grouped.get(username) || 0) + 1);
    });
    const suspicious = Array.from(grouped.entries())
        .filter((entry) => entry[1] >= 3)
        .map(([username, count]) => ({ username, failedAttempts: count }))
        .sort((a, b) => b.failedAttempts - a.failedAttempts)
        .slice(0, 10);
    return {
        windowStart: since.toISOString(),
        failedLoginAttempts: failedEvents.length,
        blockedLoginAttempts: blockedEvents.length,
        suspiciousActivity: suspicious,
        recentFailures: failedEvents.slice(0, 20)
    };
}

async function buildAdminHealthSnapshot() {
    const startedAt = new Date(Date.now() - Math.floor(process.uptime() * 1000));
    const memory = process.memoryUsage();
    const before = Date.now();
    let dbStatus = 'disconnected';
    let dbLatencyMs = null;
    try {
        dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        await mongoose.connection.db.admin().ping();
        dbLatencyMs = Date.now() - before;
    } catch (err) {
        dbStatus = 'error';
        dbLatencyMs = Date.now() - before;
    }
    return {
        serverStatus: 'online',
        databaseStatus: dbStatus,
        apiStatus: 'online',
        uptimeSeconds: Math.floor(process.uptime()),
        startedAt: startedAt.toISOString(),
        dbLatencyMs,
        memory: {
            rss: Number(memory.rss || 0),
            heapUsed: Number(memory.heapUsed || 0),
            heapTotal: Number(memory.heapTotal || 0)
        }
    };
}

async function runAdminGlobalSearch(query, limit) {
    const search = String(query || '').trim().toLowerCase();
    if (!search) {
        return { users: [], companies: [], entries: [] };
    }
    const safeLimit = Math.min(50, Math.max(5, Number(limit) || 15));
    const [users, companies, entriesPayload] = await Promise.all([
        (async () => {
            const overviews = await Promise.all((await getAllAccountsForAdmin()).map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser)));
            return overviews.filter((item) => [item.userKey, item.name, item.mobileNumber, item.vehicleNumber, item.email, item.companyName].join(' ').toLowerCase().includes(search)).slice(0, safeLimit);
        })(),
        (async () => {
            const options = await getCompanyOptionsForAdmin();
            return options.filter((item) => [item.companyName, item.ownerName, item.userKey, item.vehicleNumber].join(' ').toLowerCase().includes(search)).slice(0, safeLimit);
        })(),
        (async () => {
            const accountRefs = await getAllAccountsForAdmin();
            const collected = [];
            for (const ref of accountRefs) {
                const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
                const context = getDbContextByName(ref.account.dbName);
                await ensureLegacyDataMigrated(ref.account, context);
                const trips = await context.Trip.find().sort({ createdAt: -1 }).limit(120).lean();
                trips.forEach((trip) => {
                    const row = {
                        userKey: overview.userKey,
                        userName: overview.name,
                        vehicleNumber: overview.vehicleNumber,
                        companyName: overview.companyName,
                        entryId: String(trip._id || ''),
                        tripId: String(trip.tripId || ''),
                        date: String(trip.date || ''),
                        pickup: String(trip.pickup || ''),
                        drop: String(trip.drop || ''),
                        total: String(trip.total || ''),
                        createdAt: trip.createdAt || null
                    };
                    if ([row.userKey, row.userName, row.vehicleNumber, row.companyName, row.tripId, row.pickup, row.drop, row.date].join(' ').toLowerCase().includes(search)) {
                        collected.push(row);
                    }
                });
            }
            return collected.slice(0, safeLimit);
        })()
    ]);
    return { users, companies, entries: entriesPayload };
}

async function buildSystemBackupPayload() {
    const accountRefs = await getAllAccountsForAdmin();
    const [features, announcements, activities, notifications, errors, users] = await Promise.all([
        getAdminFeatureFlags(),
        AdminAnnouncement.find().sort({ createdAt: -1 }).lean(),
        AdminActivity.find().sort({ createdAt: -1 }).lean(),
        AdminNotification.find().sort({ createdAt: -1 }).lean(),
        SystemErrorLog.find().sort({ createdAt: -1 }).lean(),
        SignupUser.find().lean()
    ]);
    const accounts = [];
    for (const ref of accountRefs) {
        const context = getDbContextByName(ref.account.dbName);
        await ensureLegacyDataMigrated(ref.account, context);
        const [trips, settings, profile, tripInvoices] = await Promise.all([
            context.Trip.find().lean(),
            context.AppSettings.find().lean(),
            context.UserProfile.find().lean(),
            context.TripInvoice.find().lean()
        ]);
        accounts.push({
            userKey: String(ref.account.userKey || ''),
            dbName: String(ref.account.dbName || ''),
            dbFolder: String(ref.account.dbFolder || ''),
            isDefaultUser: !ref.account.isDynamicUser,
            trips,
            settings,
            profile,
            tripInvoices
        });
    }
    return {
        version: '2.1',
        generatedAt: new Date().toISOString(),
        main: {
            users,
            announcements,
            features,
            activities,
            notifications,
            errors
        },
        accounts
    };
}

async function restoreSystemBackupPayload(backup) {
    const source = backup || {};
    const main = source.main || {};
    const accountRows = Array.isArray(source.accounts) ? source.accounts : [];
    await SignupUser.deleteMany({});
    if (Array.isArray(main.users) && main.users.length) {
        await SignupUser.insertMany(main.users, { ordered: false });
    }
    await AdminAnnouncement.deleteMany({});
    if (Array.isArray(main.announcements) && main.announcements.length) {
        await AdminAnnouncement.insertMany(main.announcements, { ordered: false });
    }
    await AdminActivity.deleteMany({});
    if (Array.isArray(main.activities) && main.activities.length) {
        await AdminActivity.insertMany(main.activities, { ordered: false });
    }
    await AdminNotification.deleteMany({});
    if (Array.isArray(main.notifications) && main.notifications.length) {
        await AdminNotification.insertMany(main.notifications, { ordered: false });
    }
    await SystemErrorLog.deleteMany({});
    if (Array.isArray(main.errors) && main.errors.length) {
        await SystemErrorLog.insertMany(main.errors, { ordered: false });
    }
    await updateAdminFeatureFlags(main.features || DEFAULT_ADMIN_FEATURE_FLAGS);

    for (const item of accountRows) {
        const dbName = String((item && item.dbName) || '').trim();
        if (!dbName) continue;
        const context = getDbContextByName(dbName);
        await context.Trip.deleteMany({});
        await context.AppSettings.deleteMany({});
        await context.UserProfile.deleteMany({});
        await context.TripInvoice.deleteMany({});
        if (Array.isArray(item.trips) && item.trips.length) {
            await context.Trip.insertMany(item.trips, { ordered: false });
        }
        if (Array.isArray(item.settings) && item.settings.length) {
            await context.AppSettings.insertMany(item.settings, { ordered: false });
        }
        if (Array.isArray(item.profile) && item.profile.length) {
            await context.UserProfile.insertMany(item.profile, { ordered: false });
        }
        if (Array.isArray(item.tripInvoices) && item.tripInvoices.length) {
            await context.TripInvoice.insertMany(item.tripInvoices, { ordered: false });
        }
    }
}

async function getAllAccountsForAdmin() {
    const users = await SignupUser.find({ isActive: true }).lean();
    const dynamicAccounts = users
        .map((user) => ({ account: getAccountFromSignupUser(user), signupUser: user }))
        .filter((item) => !!item.account);

    const defaults = AUTH_ACCOUNTS.map((account) => ({ account, signupUser: null }));
    const dynamicByKey = new Set(dynamicAccounts.map((item) => String(item.account.userKey || '').trim()));

    const merged = defaults.filter((item) => !dynamicByKey.has(String(item.account.userKey || '').trim()));
    return merged.concat(dynamicAccounts);
}

async function buildAdminAccountOverview(account, signupUser) {
    const context = getDbContextByName(account.dbName);
    await ensureLegacyDataMigrated(account, context);

    const [profile, settings, tripCount] = await Promise.all([
        context.UserProfile.findOne({ key: 'profile' }).lean(),
        context.AppSettings.findOne({ key: 'singleton' }).lean(),
        context.Trip.countDocuments()
    ]);

    const profileName = String((profile && profile.name) || (signupUser && signupUser.name) || getAccountDisplayName(account) || '').trim();
    const mobileNumber = String(
        (signupUser && signupUser.mobileNumber) ||
        (profile && profile.mobileNumber) ||
        (account && account.username) ||
        ''
    ).trim();
    const vehicleNumber = String((signupUser && signupUser.vehicleNumber) || (profile && profile.vehicleNumber) || '').trim();
    const email = String((signupUser && signupUser.email) || (profile && profile.email) || '').trim();
    const companyName = String((settings && settings.companyName) || profileName || getAccountDisplayName(account)).trim();
    const rate = Number((settings && settings.rate) != null ? settings.rate : 21);
    const language = normalizeLanguageCode(settings && settings.language);

    return {
        userKey: String(account.userKey || '').trim(),
        dbName: String(account.dbName || '').trim(),
        dbFolder: String(account.dbFolder || '').trim(),
        isDynamicUser: !!account.isDynamicUser,
        isDefaultUser: !account.isDynamicUser,
        name: profileName,
        mobileNumber,
        vehicleNumber,
        email,
        companyName,
        rate: Number.isFinite(rate) ? rate : 21,
        language,
        totalCompanies: companyName ? 1 : 0,
        totalEntries: Number(tripCount || 0),
        totalTrips: Number(tripCount || 0),
        isBlocked: !!(signupUser && signupUser.isBlocked),
        createdAt: signupUser && signupUser.createdAt ? signupUser.createdAt : null,
        updatedAt: signupUser && signupUser.updatedAt ? signupUser.updatedAt : null
    };
}

function getDbContextByName(dbName) {
    const safeDbName = String(dbName || '').trim();
    if (!safeDbName) throw new Error('Missing database name');

    if (dbContextCache.has(safeDbName)) {
        return dbContextCache.get(safeDbName);
    }

    const db = mongoose.connection.useDb(safeDbName, { useCache: true });
    const context = {
        db,
        Trip: db.models.Trip || db.model('Trip', tripSchema),
        TripInvoice: db.models.TripInvoice || db.model('TripInvoice', tripInvoiceSchema),
        AppSettings: db.models.AppSettings || db.model('AppSettings', appSettingsSchema),
        UserProfile: db.models.UserProfile || db.model('UserProfile', userProfileSchema)
    };
    dbContextCache.set(safeDbName, context);
    return context;
}

async function ensureLegacyDataMigrated(account, targetContext) {
    const legacyDbName = String(account && account.legacyDbName ? account.legacyDbName : '').trim();
    if (!legacyDbName || legacyDbName === account.dbName) return;

    const migrationKey = `${account.userKey}:${legacyDbName}->${account.dbName}`;
    if (legacyMigrationCache.has(migrationKey)) {
        await legacyMigrationCache.get(migrationKey);
        return;
    }

    const migrationPromise = (async () => {
        const [targetTripCount, targetSettings] = await Promise.all([
            targetContext.Trip.estimatedDocumentCount(),
            targetContext.AppSettings.findOne({ key: 'singleton' }).lean()
        ]);

        const needsTripMigration = targetTripCount === 0;
        const needsSettingsMigration = !targetSettings;
        if (!needsTripMigration && !needsSettingsMigration) return;

        const legacyContext = getDbContextByName(legacyDbName);
        const [legacyTrips, legacySettings] = await Promise.all([
            needsTripMigration ? legacyContext.Trip.find().lean() : Promise.resolve([]),
            needsSettingsMigration ? legacyContext.AppSettings.findOne({ key: 'singleton' }).lean() : Promise.resolve(null)
        ]);

        if (!legacyTrips.length && !legacySettings) return;
        let migrated = false;

        if (needsTripMigration && legacyTrips.length) {
            const tripsToInsert = legacyTrips.map((trip) => {
                const { _id, __v, ...tripData } = trip;
                return tripData;
            });
            if (tripsToInsert.length) {
                await targetContext.Trip.insertMany(tripsToInsert, { ordered: false });
                migrated = true;
            }
        }

        if (needsSettingsMigration && legacySettings) {
            const { _id, __v, ...settingsDoc } = legacySettings;
            await targetContext.AppSettings.updateOne(
                { key: 'singleton' },
                settingsDoc,
                { upsert: true }
            );
            migrated = true;
        }

        if (migrated) {
            console.log(`✅ Legacy migration completed for ${account.userKey}: ${legacyDbName} -> ${account.dbName}`);
        }
    })().catch((err) => {
        legacyMigrationCache.delete(migrationKey);
        throw err;
    });

    legacyMigrationCache.set(migrationKey, migrationPromise);
    await migrationPromise;
}

async function getDbContextForRequest(req) {
    const account = req.authAccount || resolveSessionAccount(req);
    if (!account) return null;
    const context = getDbContextByName(account.dbName);
    await ensureLegacyDataMigrated(account, context);
    return { account, ...context };
}

    async function getSettings(AppSettingsModel, account) {
        const defaultCompanyName = getAccountDisplayName(account);
        let doc = await AppSettingsModel.findOne({ key: 'singleton' }).lean();
        if (!doc) {
            doc = await AppSettingsModel.create({
                key: 'singleton',
                companyName: defaultCompanyName,
                rate: 21,
                language: 'en',
                darkMode: 'off',
                installPromptShown: false,
                invoiceLogoUrl: '/icon-512.png',
                invoiceCustomerName: 'Walk-in Customer',
                invoiceCustomerContact: '',
                invoiceTaxPercent: 0,
                invoicePaymentStatus: 'Pending'
            });
            doc = doc.toObject ? doc.toObject() : doc;
        }
        return {
            companyName: (doc && doc.companyName) ? doc.companyName : defaultCompanyName,
            rate: (doc && doc.rate != null) ? Number(doc.rate) : 21,
            language: normalizeLanguageCode(doc && doc.language),
            darkMode: (doc && doc.darkMode) ? doc.darkMode : 'off',
            installPromptShown: !!(doc && doc.installPromptShown),
            invoiceLogoUrl: (doc && doc.invoiceLogoUrl) ? String(doc.invoiceLogoUrl) : '/icon-512.png',
            invoiceCustomerName: (doc && doc.invoiceCustomerName) ? String(doc.invoiceCustomerName) : 'Walk-in Customer',
            invoiceCustomerContact: (doc && doc.invoiceCustomerContact) ? String(doc.invoiceCustomerContact) : '',
            invoiceTaxPercent: (doc && doc.invoiceTaxPercent != null) ? Number(doc.invoiceTaxPercent) : 0,
            invoicePaymentStatus: (doc && doc.invoicePaymentStatus) ? String(doc.invoicePaymentStatus) : 'Pending'
        };
    }

    async function getCompanyName(AppSettingsModel, account) {
        const s = await getSettings(AppSettingsModel, account);
        return s.companyName;
    }

    // Settings API
    app.get('/api/settings', requireApiAuth, async (req, res) => {
        try {
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
            const settings = await getSettings(context.AppSettings, context.account);
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/settings', requireApiAuth, async (req, res) => {
        try {
            const {
                companyName,
                rate,
                language,
                darkMode,
                installPromptShown,
                invoiceLogoUrl,
                invoiceCustomerName,
                invoiceCustomerContact,
                invoiceTaxPercent,
                invoicePaymentStatus
            } = req.body;
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });

            let doc = await context.AppSettings.findOne({ key: 'singleton' });
            if (!doc) {
                doc = await context.AppSettings.create({ key: 'singleton' });
            }
            const previousCompanyName = String(doc.companyName || '').trim();
            if (companyName != null) doc.companyName = String(companyName);
            if (rate != null) doc.rate = Number(rate);
            if (language != null) doc.language = normalizeLanguageCode(language);
            if (darkMode != null && ['on', 'off'].includes(darkMode)) doc.darkMode = darkMode;
            if (installPromptShown != null) doc.installPromptShown = Boolean(installPromptShown);
            if (invoiceLogoUrl != null) doc.invoiceLogoUrl = String(invoiceLogoUrl || '').trim() || '/icon-512.png';
            if (invoiceCustomerName != null) doc.invoiceCustomerName = String(invoiceCustomerName || '').trim() || 'Walk-in Customer';
            if (invoiceCustomerContact != null) doc.invoiceCustomerContact = String(invoiceCustomerContact || '').trim();
            if (invoiceTaxPercent != null) {
                const tax = Number(invoiceTaxPercent);
                doc.invoiceTaxPercent = Number.isFinite(tax) ? Math.max(0, tax) : 0;
            }
            if (invoicePaymentStatus != null) {
                const allowed = ['Pending', 'Paid', 'Partially Paid', 'Unpaid'];
                const nextStatus = String(invoicePaymentStatus || '').trim();
                doc.invoicePaymentStatus = allowed.includes(nextStatus) ? nextStatus : 'Pending';
            }
            await doc.save();
            const nextCompanyName = String(doc.companyName || '').trim();
            if (nextCompanyName && nextCompanyName !== previousCompanyName) {
                await recordAdminActivity({
                    type: previousCompanyName ? 'company_updated' : 'company_created',
                    actor: String((context.account && context.account.userKey) || ''),
                    targetUserKey: String((context.account && context.account.userKey) || ''),
                    message: previousCompanyName
                        ? 'Company details updated by user'
                        : 'Company created by user',
                    meta: {
                        oldCompanyName: previousCompanyName,
                        companyName: nextCompanyName,
                        rate: Number(doc.rate || 21)
                    }
                });
            }
            res.json({
                companyName: doc.companyName,
                rate: Number(doc.rate),
                language: normalizeLanguageCode(doc.language),
                darkMode: doc.darkMode,
                installPromptShown: !!doc.installPromptShown,
                invoiceLogoUrl: String(doc.invoiceLogoUrl || '/icon-512.png'),
                invoiceCustomerName: String(doc.invoiceCustomerName || 'Walk-in Customer'),
                invoiceCustomerContact: String(doc.invoiceCustomerContact || ''),
                invoiceTaxPercent: Number(doc.invoiceTaxPercent || 0),
                invoicePaymentStatus: String(doc.invoicePaymentStatus || 'Pending')
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    async function requireAuth(req, res, next) {
        try {
            const account = resolveSessionAccount(req);
            if (!account) {
                return res.redirect(302, '/login');
            }
            if (account.isDynamicUser) {
                const user = await SignupUser.findOne({ userKey: account.userKey, isActive: true }).lean();
                if (!user || user.isBlocked) {
                    clearSessionAccount(req);
                    return res.redirect(302, '/login');
                }
            }
            if (await isMaintenanceModeEnabled()) {
                return sendMaintenancePage(res);
            }
            req.authAccount = account;
            return next();
        } catch (err) {
            return res.redirect(302, '/login');
        }
    }

    async function requireApiAuth(req, res, next) {
        try {
            const account = resolveSessionAccount(req);
            if (!account) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (account.isDynamicUser) {
                const user = await SignupUser.findOne({ userKey: account.userKey, isActive: true }).lean();
                if (!user) {
                    clearSessionAccount(req);
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                if (user.isBlocked) {
                    return res.status(403).json({ error: 'Account blocked by admin' });
                }
            }
            if (await isMaintenanceModeEnabled()) {
                return res.status(503).json({ error: 'Maintenance mode enabled by admin' });
            }
            req.authAccount = account;
            return next();
        } catch (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    function requireAdminPageAuth(req, res, next) {
        const admin = resolveAdminSession(req);
        if (admin) {
            req.adminAuth = admin;
            return next();
        }
        return res.redirect(302, '/admin/login');
    }

    function requireAdminApiAuth(req, res, next) {
        const admin = resolveAdminSession(req);
        if (admin) {
            req.adminAuth = admin;
            return next();
        }
        return res.status(401).json({ error: 'Admin authentication required' });
    }

    function sendMaintenancePage(res) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tripset Maintenance</title>
    <style>
        body { margin: 0; font-family: system-ui, sans-serif; background: linear-gradient(135deg, #020617, #0f172a); color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .shell { max-width: 32rem; width: 100%; background: rgba(15,23,42,0.88); border: 1px solid rgba(148,163,184,0.14); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 60px rgba(2,6,23,0.35); }
        .eyebrow { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #fdba74; }
        h1 { margin: 0.75rem 0 0; font-size: 2rem; line-height: 1.1; }
        p { color: #cbd5e1; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="shell">
        <div class="eyebrow">Tripset Maintenance</div>
        <h1>Service is temporarily unavailable.</h1>
        <p>The admin has enabled maintenance mode. User access is paused until maintenance is completed.</p>
    </div>
</body>
</html>`;
        return res.status(503).send(html);
    }

    function parseDateRangeStart(input) {
        const raw = String(input || '').trim();
        if (!raw) return null;
        const dt = new Date(raw + 'T00:00:00.000Z');
        if (Number.isNaN(dt.getTime())) return null;
        return dt;
    }

    function parseDateRangeEnd(input) {
        const raw = String(input || '').trim();
        if (!raw) return null;
        const dt = new Date(raw + 'T23:59:59.999Z');
        if (Number.isNaN(dt.getTime())) return null;
        return dt;
    }

    app.get('/api/admin/auth/status', (req, res) => {
        const admin = resolveAdminSession(req);
        return res.json({
            isAuthenticated: !!admin,
            username: admin ? admin.username : null
        });
    });

    app.post('/admin/auth/login', async (req, res) => {
        try {
            const username = String((req.body && req.body.username) || '').trim();
            const password = String((req.body && req.body.password) || '').trim();
            const valid = await validateAdminCredentials(username, password);
            if (!valid) {
                return res.status(401).json({ error: 'Invalid admin credentials' });
            }
            setAdminSession(req);
            req.session.save((err) => {
                if (err) return res.status(500).json({ error: 'Failed to save admin session' });
                return res.json({ success: true, username: ADMIN_USERNAME });
            });
        } catch (err) {
            return res.status(500).json({ error: 'Admin login failed' });
        }
    });

    app.post('/admin/auth/logout', (req, res) => {
        clearAdminSession(req);
        req.session.save(() => {
            res.json({ success: true });
        });
    });

    app.get('/api/admin/dashboard', requireAdminApiAuth, async (req, res) => {
        try {
            const accountRefs = await getAllAccountsForAdmin();
            const overviews = await Promise.all(
                accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser))
            );

            const totalUsers = overviews.length;
            const totalCompanies = overviews.reduce((acc, item) => acc + Number(item.totalCompanies || 0), 0);
            const totalEntries = overviews.reduce((acc, item) => acc + Number(item.totalEntries || 0), 0);
            const totalTrips = overviews.reduce((acc, item) => acc + Number(item.totalTrips || 0), 0);

            const recentActivity = await AdminActivity.find()
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const monthKeys = [];
            const monthLabels = [];
            const monthMap = {};
            for (let idx = 5; idx >= 0; idx -= 1) {
                const dt = new Date();
                dt.setUTCDate(1);
                dt.setUTCMonth(dt.getUTCMonth() - idx);
                const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                monthKeys.push(key);
                monthLabels.push(dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                monthMap[key] = 0;
            }

            for (const ref of accountRefs) {
                const context = getDbContextByName(ref.account.dbName);
                await ensureLegacyDataMigrated(ref.account, context);
                const rows = await context.Trip.aggregate([
                    {
                        $match: {
                            createdAt: { $gte: new Date(new Date().setUTCMonth(new Date().getUTCMonth() - 6)) }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    }
                ]);
                rows.forEach((row) => {
                    const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
                    if (Object.prototype.hasOwnProperty.call(monthMap, key)) {
                        monthMap[key] += Number(row.count || 0);
                    }
                });
            }

            return res.json({
                totals: {
                    totalUsers,
                    totalCompanies,
                    totalEntries,
                    totalTrips
                },
                analytics: {
                    monthLabels,
                    entriesByMonth: monthKeys.map((key) => Number(monthMap[key] || 0))
                },
                recentActivity,
                users: overviews
                    .sort((a, b) => Number(b.totalEntries || 0) - Number(a.totalEntries || 0))
                    .slice(0, 10)
            });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load admin dashboard' });
        }
    });

    app.get('/api/admin/users', requireAdminApiAuth, async (req, res) => {
        try {
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const compact = String((req.query && req.query.compact) || '').trim() === '1';
            const accountRefs = await getAllAccountsForAdmin();
            let users = await Promise.all(
                accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser))
            );

            if (search) {
                users = users.filter((item) => {
                    const hay = [
                        item.userKey,
                        item.name,
                        item.mobileNumber,
                        item.email,
                        item.vehicleNumber,
                        item.companyName
                    ].join(' ').toLowerCase();
                    return hay.includes(search);
                });
            }

            users.sort((a, b) => {
                const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTs - aTs;
            });

            if (compact) {
                return res.json(users.map((u) => ({
                    userKey: u.userKey,
                    name: u.name,
                    isBlocked: !!u.isBlocked,
                    isDefaultUser: !!u.isDefaultUser
                })));
            }
            return res.json(users);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load users' });
        }
    });

    app.get('/api/admin/users/:userKey', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            if (!targetKey) return res.status(400).json({ error: 'User key is required' });
            const accountRefs = await getAllAccountsForAdmin();
            const ref = accountRefs.find((item) => String(item.account.userKey || '').trim() === targetKey);
            if (!ref) return res.status(404).json({ error: 'User not found' });

            const details = await buildAdminAccountOverview(ref.account, ref.signupUser);
            const context = getDbContextByName(ref.account.dbName);
            await ensureLegacyDataMigrated(ref.account, context);
            const recentEntries = await context.Trip.find().sort({ createdAt: -1 }).limit(15).lean();
            return res.json({ ...details, recentEntries });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load user details' });
        }
    });

    app.put('/api/admin/users/:userKey', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const user = await SignupUser.findOne({ userKey: targetKey, isActive: true });
            if (!user) return res.status(404).json({ error: 'User not found' });

            const name = normalizePersonName(req.body && req.body.name);
            const mobileNumber = normalizeMobileNumber(req.body && req.body.mobileNumber);
            const vehicleNumber = normalizeVehicleNumber(req.body && req.body.vehicleNumber);
            const email = normalizeEmail(req.body && req.body.email);

            if (!name || !mobileNumber || !vehicleNumber || !email) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            if (!isValidMobileNumber(mobileNumber)) {
                return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
            }
            if (!isValidVehicleNumber(vehicleNumber)) {
                return res.status(400).json({ error: 'Vehicle number is invalid' });
            }
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Email ID is invalid' });
            }

            const duplicate = await SignupUser.findOne({
                _id: { $ne: user._id },
                $or: [{ mobileNumber }, { email }]
            }).lean();
            if (duplicate) {
                if (String(duplicate.mobileNumber || '') === mobileNumber) {
                    return res.status(409).json({ error: 'This mobile number is already registered' });
                }
                return res.status(409).json({ error: 'This email ID is already registered' });
            }

            user.name = name;
            user.mobileNumber = mobileNumber;
            user.vehicleNumber = vehicleNumber;
            user.email = email;
            await user.save();

            const account = getAccountFromSignupUser(user);
            const context = getDbContextByName(account.dbName);
            await ensureLegacyDataMigrated(account, context);
            await context.UserProfile.updateOne(
                { key: 'profile' },
                {
                    key: 'profile',
                    name,
                    mobileNumber,
                    vehicleNumber,
                    email,
                    updatedAt: new Date()
                },
                { upsert: true }
            );

            await recordAdminActivity({
                type: 'admin_user_updated',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: 'Admin updated user profile',
                meta: { name, mobileNumber, email, vehicleNumber }
            });

            const updated = await buildAdminAccountOverview(account, user.toObject ? user.toObject() : user);
            return res.json(updated);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to update user' });
        }
    });

    app.post('/api/admin/users/:userKey/block', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const blocked = !!(req.body && req.body.blocked);
            const user = await SignupUser.findOne({ userKey: targetKey, isActive: true });
            if (!user) return res.status(404).json({ error: 'User not found' });

            user.isBlocked = blocked;
            user.blockedAt = blocked ? new Date() : null;
            await user.save();

            if (blocked) {
                try {
                    await mongoose.connection.db.collection('sessions').deleteMany({ 'session.authUserKey': targetKey });
                } catch (sessionErr) {
                    console.warn('Session cleanup warning after block:', sessionErr.message);
                }
            }

            await recordAdminActivity({
                type: blocked ? 'admin_user_blocked' : 'admin_user_unblocked',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: blocked ? 'Admin blocked user' : 'Admin unblocked user',
                meta: { blocked }
            });

            return res.json({ success: true, isBlocked: blocked });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to update block status' });
        }
    });

    app.post('/api/admin/users/:userKey/reset-password', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const user = await SignupUser.findOne({ userKey: targetKey, isActive: true });
            if (!user) return res.status(404).json({ error: 'User not found' });
            const requestedPassword = String((req.body && req.body.newPassword) || '').trim();
            const nextPassword = requestedPassword || generateTemporaryPassword();
            if (nextPassword.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            user.passwordHash = await bcrypt.hash(nextPassword, SIGNUP_PASSWORD_SALT_ROUNDS);
            await user.save();
            try {
                await mongoose.connection.db.collection('sessions').deleteMany({ 'session.authUserKey': targetKey });
            } catch (sessionErr) {
                console.warn('Session cleanup warning after password reset:', sessionErr.message);
            }
            await recordAdminActivity({
                type: 'admin_user_password_reset',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: 'Admin reset user password',
                meta: { generated: !requestedPassword, suppressNotification: true }
            });
            return res.json({ success: true, password: nextPassword, generated: !requestedPassword });
        } catch (err) {
            await recordSystemError('admin_reset_password', err, { userKey: String(req.params.userKey || '') }, 'error');
            return res.status(500).json({ error: 'Failed to reset password' });
        }
    });

    app.delete('/api/admin/users/:userKey', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const user = await SignupUser.findOne({ userKey: targetKey, isActive: true }).lean();
            if (!user) return res.status(404).json({ error: 'User not found' });

            const dbName = String(user.dbName || '').trim();
            if (dbName) {
                const context = getDbContextByName(dbName);
                await context.db.dropDatabase();
                dbContextCache.delete(dbName);
            }
            await SignupUser.deleteOne({ userKey: targetKey });
            try {
                await mongoose.connection.db.collection('sessions').deleteMany({ 'session.authUserKey': targetKey });
            } catch (sessionErr) {
                console.warn('Session cleanup warning after admin delete:', sessionErr.message);
            }
            for (const key of legacyMigrationCache.keys()) {
                if (String(key).startsWith(String(targetKey) + ':')) {
                    legacyMigrationCache.delete(key);
                }
            }

            await recordAdminActivity({
                type: 'admin_user_deleted',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: 'Admin deleted user account',
                meta: { dbName }
            });

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    });

    app.get('/api/admin/companies', requireAdminApiAuth, async (req, res) => {
        try {
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const compact = String((req.query && req.query.compact) || '').trim() === '1';
            const accountRefs = await getAllAccountsForAdmin();
            let companies = await Promise.all(
                accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser))
            );
            companies = companies.map((item) => ({
                userKey: item.userKey,
                ownerName: item.name,
                companyName: item.companyName,
                vehicleNumber: item.vehicleNumber,
                rate: item.rate,
                totalEntries: item.totalEntries,
                isDefaultUser: item.isDefaultUser
            }));
            if (search) {
                companies = companies.filter((item) => {
                    const hay = [item.userKey, item.ownerName, item.companyName, item.vehicleNumber].join(' ').toLowerCase();
                    return hay.includes(search);
                });
            }
            if (compact) {
                return res.json(companies.map((item) => ({
                    userKey: item.userKey,
                    companyName: item.companyName,
                    ownerName: item.ownerName
                })));
            }
            return res.json(companies);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load companies' });
        }
    });

    app.put('/api/admin/companies/:userKey', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const companyName = String((req.body && req.body.companyName) || '').trim();
            const rate = Number((req.body && req.body.rate) || 21);
            if (!companyName) return res.status(400).json({ error: 'Company name is required' });

            const accountRefs = await getAllAccountsForAdmin();
            const ref = accountRefs.find((item) => String(item.account.userKey || '').trim() === targetKey);
            if (!ref) return res.status(404).json({ error: 'User not found' });

            const context = getDbContextByName(ref.account.dbName);
            await ensureLegacyDataMigrated(ref.account, context);
            let doc = await context.AppSettings.findOne({ key: 'singleton' });
            if (!doc) doc = await context.AppSettings.create({ key: 'singleton' });
            const oldCompanyName = String(doc.companyName || '').trim();
            doc.companyName = companyName;
            doc.rate = Number.isFinite(rate) ? Math.max(0, rate) : 21;
            await doc.save();

            await recordAdminActivity({
                type: 'admin_company_updated',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: 'Admin updated company settings',
                meta: { oldCompanyName, companyName: doc.companyName, rate: Number(doc.rate || 21) }
            });

            return res.json({
                success: true,
                userKey: targetKey,
                companyName: String(doc.companyName || ''),
                rate: Number(doc.rate || 21)
            });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to update company' });
        }
    });

    app.delete('/api/admin/companies/:userKey', requireAdminApiAuth, async (req, res) => {
        try {
            const targetKey = String(req.params.userKey || '').trim();
            const accountRefs = await getAllAccountsForAdmin();
            const ref = accountRefs.find((item) => String(item.account.userKey || '').trim() === targetKey);
            if (!ref) return res.status(404).json({ error: 'User not found' });

            const context = getDbContextByName(ref.account.dbName);
            await ensureLegacyDataMigrated(ref.account, context);
            let doc = await context.AppSettings.findOne({ key: 'singleton' });
            if (!doc) doc = await context.AppSettings.create({ key: 'singleton' });
            const oldCompanyName = String(doc.companyName || '').trim();
            doc.companyName = getAccountDisplayName(ref.account);
            doc.rate = 21;
            await doc.save();

            await recordAdminActivity({
                type: 'admin_company_deleted',
                actor: ADMIN_USERNAME,
                targetUserKey: targetKey,
                message: 'Admin reset company to default',
                meta: { oldCompanyName, companyName: String(doc.companyName || '') }
            });

            return res.json({ success: true, companyName: String(doc.companyName || '') });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to delete company' });
        }
    });

    app.get('/api/admin/entries', requireAdminApiAuth, async (req, res) => {
        try {
            const filterUserKey = String((req.query && req.query.userKey) || '').trim();
            const filterCompany = String((req.query && req.query.company) || '').trim().toLowerCase();
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const dateFrom = parseDateRangeStart(req.query && req.query.from);
            const dateTo = parseDateRangeEnd(req.query && req.query.to);
            const limitRaw = Number((req.query && req.query.limit) || 300);
            const limit = Math.min(1500, Math.max(50, Number.isFinite(limitRaw) ? limitRaw : 300));

            const accountRefs = await getAllAccountsForAdmin();
            const filteredRefs = filterUserKey
                ? accountRefs.filter((item) => String(item.account.userKey || '').trim() === filterUserKey)
                : accountRefs;
            const filteredOverview = await Promise.all(
                filteredRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser))
            );
            const overviewByKey = new Map(filteredOverview.map((item) => [String(item.userKey || ''), item]));
            const entries = [];

            for (const ref of filteredRefs) {
                const context = getDbContextByName(ref.account.dbName);
                await ensureLegacyDataMigrated(ref.account, context);

                const query = {};
                if (dateFrom || dateTo) {
                    query.createdAt = {};
                    if (dateFrom) query.createdAt.$gte = dateFrom;
                    if (dateTo) query.createdAt.$lte = dateTo;
                }
                const [settings, trips] = await Promise.all([
                    context.AppSettings.findOne({ key: 'singleton' }).lean(),
                    context.Trip.find(query).sort({ createdAt: -1 }).limit(limit).lean()
                ]);
                const overview = overviewByKey.get(String(ref.account.userKey || '')) || {};
                const companyName = String((settings && settings.companyName) || overview.companyName || getAccountDisplayName(ref.account)).trim();
                trips.forEach((trip) => {
                    entries.push({
                        userKey: String(ref.account.userKey || ''),
                        userName: String(overview.name || (ref.signupUser ? String(ref.signupUser.name || '') : getAccountDisplayName(ref.account))),
                        companyName,
                        vehicleNumber: String(overview.vehicleNumber || ''),
                        entryId: String(trip._id || ''),
                        tripId: String(trip.tripId || ''),
                        date: String(trip.date || ''),
                        pickup: String(trip.pickup || ''),
                        drop: String(trip.drop || ''),
                        km: Number(trip.km || 0),
                        total: String(trip.total || ''),
                        createdAt: trip.createdAt || null
                    });
                });
            }

            entries.sort((a, b) => {
                const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTs - aTs;
            });

            const searchedEntries = search
                ? entries.filter((item) => [
                    item.userName,
                    item.userKey,
                    item.companyName,
                    item.vehicleNumber,
                    item.tripId,
                    item.pickup,
                    item.drop
                ].join(' ').toLowerCase().includes(search))
                : entries;
            const finalEntries = filterCompany
                ? searchedEntries.filter((item) => String(item.companyName || '').trim().toLowerCase() === filterCompany)
                : searchedEntries;

            return res.json({
                total: finalEntries.length,
                entries: finalEntries.slice(0, limit)
            });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load entries' });
        }
    });

    app.delete('/api/admin/entries/:userKey/:entryId', requireAdminApiAuth, async (req, res) => {
        try {
            const userKey = String(req.params.userKey || '').trim();
            const entryId = String(req.params.entryId || '').trim();
            if (!userKey || !entryId) return res.status(400).json({ error: 'Invalid entry reference' });

            const accountRefs = await getAllAccountsForAdmin();
            const ref = accountRefs.find((item) => String(item.account.userKey || '').trim() === userKey);
            if (!ref) return res.status(404).json({ error: 'User not found' });

            const context = getDbContextByName(ref.account.dbName);
            await ensureLegacyDataMigrated(ref.account, context);
            const deleted = await context.Trip.findByIdAndDelete(entryId);
            if (!deleted) return res.status(404).json({ error: 'Entry not found' });
            await context.TripInvoice.deleteMany({
                $or: [
                    { tripDbId: String(deleted._id || '') },
                    {
                        tripId: String((deleted && deleted.tripId) || '').trim(),
                        date: String((deleted && deleted.date) || '').trim()
                    }
                ]
            });

            await recordAdminActivity({
                type: 'admin_entry_deleted',
                actor: ADMIN_USERNAME,
                targetUserKey: userKey,
                message: 'Admin deleted trip entry',
                meta: { entryId, tripId: String(deleted.tripId || '') }
            });

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to delete entry' });
        }
    });

    app.get('/api/admin/reports/summary', requireAdminApiAuth, async (req, res) => {
        try {
            const accountRefs = await getAllAccountsForAdmin();
            const overviews = await Promise.all(
                accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser))
            );
            const companyWise = overviews.map((item) => ({
                userKey: item.userKey,
                ownerName: item.name,
                companyName: item.companyName,
                totalEntries: item.totalEntries
            }));
            const userActivity = await AdminActivity.aggregate([
                { $group: { _id: '$targetUserKey', actions: { $sum: 1 } } },
                { $sort: { actions: -1 } },
                { $limit: 20 }
            ]);

            return res.json({
                totals: {
                    users: overviews.length,
                    entries: overviews.reduce((sum, item) => sum + Number(item.totalEntries || 0), 0),
                    companies: overviews.reduce((sum, item) => sum + Number(item.totalCompanies || 0), 0),
                    trips: overviews.reduce((sum, item) => sum + Number(item.totalTrips || 0), 0)
                },
                companyWise,
                topUsersByEntries: overviews
                    .map((item) => ({ userKey: item.userKey, name: item.name, totalEntries: item.totalEntries }))
                    .sort((a, b) => Number(b.totalEntries || 0) - Number(a.totalEntries || 0))
                    .slice(0, 20),
                userActivity: userActivity.map((row) => ({
                    userKey: String(row._id || ''),
                    actions: Number(row.actions || 0)
                }))
            });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to generate reports' });
        }
    });

    app.get('/api/admin/activity', requireAdminApiAuth, async (req, res) => {
        try {
            const scope = String((req.query && req.query.scope) || '').trim().toLowerCase();
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const from = parseDateRangeStart(req.query && req.query.from);
            const to = parseDateRangeEnd(req.query && req.query.to);
            const limitRaw = Number((req.query && req.query.limit) || 100);
            const limit = Math.min(500, Math.max(20, Number.isFinite(limitRaw) ? limitRaw : 100));
            const query = {};
            if (from || to) {
                query.createdAt = {};
                if (from) query.createdAt.$gte = from;
                if (to) query.createdAt.$lte = to;
            }
            let logs = await AdminActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            if (scope === 'admin') {
                logs = logs.filter((item) => String(item.type || '').startsWith('admin_') || String(item.actor || '') === ADMIN_USERNAME);
            } else if (scope === 'user') {
                logs = logs.filter((item) => !String(item.type || '').startsWith('admin_'));
            }
            if (search) {
                logs = logs.filter((item) => [item.type, item.actor, item.targetUserKey, item.message, JSON.stringify(item.meta || {})].join(' ').toLowerCase().includes(search));
            }
            return res.json(logs);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load activity logs' });
        }
    });

    app.get('/api/admin/announcements', requireAdminApiAuth, async (req, res) => {
        try {
            const includeInactive = String((req.query && req.query.includeInactive) || '').trim() === '1';
            return res.json(await getAdminAnnouncements(includeInactive, 50));
        } catch (err) {
            await recordSystemError('admin_announcements_list', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load announcements' });
        }
    });

    app.post('/api/admin/announcements', requireAdminApiAuth, async (req, res) => {
        try {
            const payload = buildAdminAnnouncementPayload(req.body);
            const created = await AdminAnnouncement.create({
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await recordAdminActivity({
                type: 'admin_announcement_created',
                actor: ADMIN_USERNAME,
                message: 'Admin created announcement',
                meta: {
                    title: payload.title,
                    announcementId: String(created._id || ''),
                    targetType: payload.targetType,
                    defaultLanguage: payload.defaultLanguage
                }
            });
            return res.status(201).json(created);
        } catch (err) {
            await recordSystemError('admin_announcement_create', err, {}, 'error');
            return res.status(err && err.message === 'Announcement message is required' ? 400 : 500).json({ error: err && err.message ? err.message : 'Failed to create announcement' });
        }
    });

    app.put('/api/admin/announcements/:id', requireAdminApiAuth, async (req, res) => {
        try {
            const payload = buildAdminAnnouncementPayload(req.body);
            const updated = await AdminAnnouncement.findByIdAndUpdate(
                req.params.id,
                {
                    ...payload,
                    updatedAt: new Date()
                },
                { new: true }
            );
            if (!updated) return res.status(404).json({ error: 'Announcement not found' });
            await recordAdminActivity({
                type: 'admin_announcement_updated',
                actor: ADMIN_USERNAME,
                message: 'Admin updated announcement',
                meta: {
                    title: payload.title,
                    announcementId: String(updated._id || ''),
                    targetType: payload.targetType,
                    defaultLanguage: payload.defaultLanguage
                }
            });
            return res.json(updated);
        } catch (err) {
            await recordSystemError('admin_announcement_update', err, { id: String(req.params.id || '') }, 'error');
            return res.status(err && err.message === 'Announcement message is required' ? 400 : 500).json({ error: err && err.message ? err.message : 'Failed to update announcement' });
        }
    });

    app.delete('/api/admin/announcements/:id', requireAdminApiAuth, async (req, res) => {
        try {
            const deleted = await AdminAnnouncement.findByIdAndDelete(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Announcement not found' });
            await recordAdminActivity({
                type: 'admin_announcement_deleted',
                actor: ADMIN_USERNAME,
                message: 'Admin deleted announcement',
                meta: { announcementId: String(req.params.id || '') }
            });
            return res.json({ success: true });
        } catch (err) {
            await recordSystemError('admin_announcement_delete', err, { id: String(req.params.id || '') }, 'error');
            return res.status(500).json({ error: 'Failed to delete announcement' });
        }
    });

    app.get('/api/admin/features', requireAdminApiAuth, async (req, res) => {
        try {
            return res.json(await getAdminFeatureFlags());
        } catch (err) {
            await recordSystemError('admin_features_get', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load feature flags' });
        }
    });

    app.put('/api/admin/features', requireAdminApiAuth, async (req, res) => {
        try {
            const flags = await updateAdminFeatureFlags(req.body || {});
            await recordAdminActivity({
                type: 'admin_features_updated',
                actor: ADMIN_USERNAME,
                message: 'Admin updated feature controls',
                meta: flags
            });
            return res.json(flags);
        } catch (err) {
            await recordSystemError('admin_features_update', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to update feature flags' });
        }
    });

    app.get('/api/admin/notifications', requireAdminApiAuth, async (req, res) => {
        try {
            const unreadOnly = String((req.query && req.query.unreadOnly) || '').trim() === '1';
            const limitRaw = Number((req.query && req.query.limit) || 30);
            const limit = Math.min(200, Math.max(10, Number.isFinite(limitRaw) ? limitRaw : 30));
            const query = unreadOnly ? { isRead: false } : {};
            const items = await AdminNotification.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            return res.json(items);
        } catch (err) {
            await recordSystemError('admin_notifications_get', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load notifications' });
        }
    });

    app.post('/api/admin/notifications/:id/read', requireAdminApiAuth, async (req, res) => {
        try {
            const updated = await AdminNotification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
            if (!updated) return res.status(404).json({ error: 'Notification not found' });
            return res.json({ success: true });
        } catch (err) {
            await recordSystemError('admin_notification_read', err, { id: String(req.params.id || '') }, 'error');
            return res.status(500).json({ error: 'Failed to update notification' });
        }
    });

    app.post('/api/admin/notifications/read-all', requireAdminApiAuth, async (req, res) => {
        try {
            await AdminNotification.updateMany({ isRead: false }, { isRead: true });
            return res.json({ success: true });
        } catch (err) {
            await recordSystemError('admin_notifications_read_all', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to update notifications' });
        }
    });

    app.get('/api/admin/errors', requireAdminApiAuth, async (req, res) => {
        try {
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const from = parseDateRangeStart(req.query && req.query.from);
            const to = parseDateRangeEnd(req.query && req.query.to);
            const limitRaw = Number((req.query && req.query.limit) || 100);
            const limit = Math.min(500, Math.max(20, Number.isFinite(limitRaw) ? limitRaw : 100));
            const query = {};
            if (from || to) {
                query.createdAt = {};
                if (from) query.createdAt.$gte = from;
                if (to) query.createdAt.$lte = to;
            }
            let logs = await SystemErrorLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            if (search) {
                logs = logs.filter((item) => [item.source, item.message, item.level, JSON.stringify(item.meta || {})].join(' ').toLowerCase().includes(search));
            }
            return res.json(logs);
        } catch (err) {
            await recordSystemError('admin_errors_list', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load system errors' });
        }
    });

    app.get('/api/admin/security', requireAdminApiAuth, async (req, res) => {
        try {
            return res.json(await buildAdminSecuritySummary());
        } catch (err) {
            await recordSystemError('admin_security', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load security summary' });
        }
    });

    app.get('/api/admin/health', requireAdminApiAuth, async (req, res) => {
        try {
            return res.json(await buildAdminHealthSnapshot());
        } catch (err) {
            await recordSystemError('admin_health', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load system health' });
        }
    });

    app.get('/api/admin/storage', requireAdminApiAuth, async (req, res) => {
        try {
            const limit = Number((req.query && req.query.limit) || 50);
            return res.json(await buildAdminStorageUsage(limit));
        } catch (err) {
            await recordSystemError('admin_storage', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load storage usage' });
        }
    });

    app.get('/api/admin/vehicle-stats', requireAdminApiAuth, async (req, res) => {
        try {
            const limit = Number((req.query && req.query.limit) || 25);
            return res.json(await buildVehiclePerformanceStats(limit));
        } catch (err) {
            await recordSystemError('admin_vehicle_stats', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load vehicle stats' });
        }
    });

    app.get('/api/admin/search', requireAdminApiAuth, async (req, res) => {
        try {
            const query = String((req.query && req.query.q) || '').trim();
            const limit = Number((req.query && req.query.limit) || 12);
            return res.json(await runAdminGlobalSearch(query, limit));
        } catch (err) {
            await recordSystemError('admin_global_search', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to run global search' });
        }
    });

    app.get('/api/admin/route-analytics', requireAdminApiAuth, async (req, res) => {
        try {
            const limit = Number((req.query && req.query.limit) || 25);
            return res.json(await buildRouteAnalytics(limit));
        } catch (err) {
            await recordSystemError('admin_route_analytics', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load route analytics' });
        }
    });

    app.get('/api/admin/profit-analytics', requireAdminApiAuth, async (req, res) => {
        try {
            return res.json(await buildProfitAnalytics());
        } catch (err) {
            await recordSystemError('admin_profit_analytics', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load profit analytics' });
        }
    });

    app.get('/api/admin/insights', requireAdminApiAuth, async (req, res) => {
        try {
            return res.json(await buildSystemInsights());
        } catch (err) {
            await recordSystemError('admin_insights', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load data insights' });
        }
    });

    app.get('/api/admin/invoices', requireAdminApiAuth, async (req, res) => {
        try {
            const userKeyFilter = String((req.query && req.query.userKey) || '').trim();
            const companyFilter = String((req.query && req.query.company) || '').trim().toLowerCase();
            const monthFilter = String((req.query && req.query.month) || '').trim();
            const limitRaw = Number((req.query && req.query.limit) || 200);
            const limit = Math.min(1000, Math.max(20, Number.isFinite(limitRaw) ? limitRaw : 200));
            const accountRefs = await getAllAccountsForAdmin();
            const collected = [];
            for (const ref of accountRefs) {
                if (userKeyFilter && String(ref.account.userKey || '').trim() !== userKeyFilter) continue;
                const overview = await buildAdminAccountOverview(ref.account, ref.signupUser);
                const context = getDbContextByName(ref.account.dbName);
                await ensureLegacyDataMigrated(ref.account, context);
                const query = {};
                if (/^\d{4}-\d{2}$/.test(monthFilter)) {
                    query.invoiceMonth = monthFilter;
                }
                let items = await context.TripInvoice.find(query).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).lean();
                items = items.filter((item) => {
                    if (companyFilter && String((item && item.companyName) || '').trim().toLowerCase() !== companyFilter) return false;
                    return true;
                });
                items.forEach((item) => {
                    collected.push({
                        userKey: overview.userKey,
                        userName: overview.name,
                        companyName: String((item && item.companyName) || overview.companyName || ''),
                        vehicleNumber: String((item && item.vehicleNumber) || overview.vehicleNumber || ''),
                        tripId: String((item && item.tripId) || ''),
                        invoiceMonth: String((item && item.invoiceMonth) || ''),
                        invoiceNumber: String((item && item.invoiceNumber) || ''),
                        route: String((item && item.route) || ''),
                        total: Number((item && item.total) || 0),
                        pdfPath: String((item && item.pdfPath) || ''),
                        pdfReady: item && item.pdfReady === true,
                        createdAt: item && item.createdAt ? item.createdAt : null,
                        updatedAt: item && item.updatedAt ? item.updatedAt : null
                    });
                });
            }
            collected.sort((a, b) => {
                const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return right - left;
            });
            return res.json(collected.slice(0, limit));
        } catch (err) {
            await recordSystemError('admin_invoices_list', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load automated invoice records' });
        }
    });

    app.get('/api/admin/email-report/preview', requireAdminApiAuth, async (req, res) => {
        try {
            const range = String((req.query && req.query.range) || 'daily').trim().toLowerCase();
            const [dashboard, profit, analytics] = await Promise.all([
                (async () => {
                    const accountRefs = await getAllAccountsForAdmin();
                    const overviews = await Promise.all(accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser)));
                    return {
                        totalTrips: overviews.reduce((sum, item) => sum + Number(item.totalTrips || 0), 0),
                        activeUsers: overviews.filter((item) => Number(item.totalTrips || 0) > 0).length
                    };
                })(),
                buildProfitAnalytics(),
                buildSystemInsights()
            ]);
            return res.json({
                range,
                subject: `Tripset ${range} system summary`,
                preview: {
                    totalTrips: dashboard.totalTrips,
                    totalRevenue: Number(profit.overallRevenue || 0),
                    overallProfit: profit.overallProfit,
                    activeUsers: dashboard.activeUsers,
                    mostUsedRoute: analytics.mostUsedRoute,
                    mostActiveUser: analytics.mostActiveUser
                },
                deliveryMode: 'preview'
            });
        } catch (err) {
            await recordSystemError('admin_email_report_preview', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to build email report preview' });
        }
    });

    app.post('/api/admin/email-report/send', requireAdminApiAuth, async (req, res) => {
        try {
            const range = String((req.body && req.body.range) || 'daily').trim().toLowerCase();
            const preview = await (async () => {
                const [dashboard, profit, analytics] = await Promise.all([
                    (async () => {
                        const accountRefs = await getAllAccountsForAdmin();
                        const overviews = await Promise.all(accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser)));
                        return {
                            totalTrips: overviews.reduce((sum, item) => sum + Number(item.totalTrips || 0), 0),
                            activeUsers: overviews.filter((item) => Number(item.totalTrips || 0) > 0).length
                        };
                    })(),
                    buildProfitAnalytics(),
                    buildSystemInsights()
                ]);
                return {
                    totalTrips: dashboard.totalTrips,
                    totalRevenue: profit.overallRevenue,
                    overallProfit: profit.overallProfit,
                    activeUsers: dashboard.activeUsers,
                    mostUsedRoute: analytics.mostUsedRoute,
                    mostActiveUser: analytics.mostActiveUser
                };
            })();
            await recordAdminActivity({
                type: 'admin_email_report_generated',
                actor: ADMIN_USERNAME,
                message: 'Admin generated an automated email report preview',
                meta: { range, preview, suppressNotification: true }
            });
            return res.json({ success: true, range, deliveryMode: 'preview', preview });
        } catch (err) {
            await recordSystemError('admin_email_report_send', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to generate email report' });
        }
    });

    app.get('/api/admin/user-activity', requireAdminApiAuth, async (req, res) => {
        try {
            const search = String((req.query && req.query.search) || '').trim().toLowerCase();
            const from = parseDateRangeStart(req.query && req.query.from);
            const to = parseDateRangeEnd(req.query && req.query.to);
            const limitRaw = Number((req.query && req.query.limit) || 150);
            const limit = Math.min(600, Math.max(20, Number.isFinite(limitRaw) ? limitRaw : 150));
            const query = {};
            if (from || to) {
                query.createdAt = {};
                if (from) query.createdAt.$gte = from;
                if (to) query.createdAt.$lte = to;
            }
            let logs = await AdminActivity.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            logs = await enrichAdminActivityLogs(logs);
            if (search) {
                logs = logs.filter((item) => [
                    item.userName,
                    item.userKey,
                    item.companyName,
                    item.vehicleNumber,
                    item.message,
                    item.type
                ].join(' ').toLowerCase().includes(search));
            }
            return res.json(logs);
        } catch (err) {
            await recordSystemError('admin_user_activity', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load user activity logs' });
        }
    });

    app.get('/api/admin/analytics', requireAdminApiAuth, async (req, res) => {
        try {
            const accountRefs = await getAllAccountsForAdmin();
            const overviews = await Promise.all(accountRefs.map((ref) => buildAdminAccountOverview(ref.account, ref.signupUser)));
            const dayLabels = [];
            const dauMap = {};
            const entryMap = {};
            for (let idx = 13; idx >= 0; idx -= 1) {
                const dt = new Date();
                dt.setHours(0, 0, 0, 0);
                dt.setDate(dt.getDate() - idx);
                const key = dt.toISOString().slice(0, 10);
                dayLabels.push(key);
                dauMap[key] = new Set();
                entryMap[key] = 0;
            }
            const activityRows = await AdminActivity.find({
                createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 14)) },
                type: { $in: ['user_login', 'entry_created'] }
            }).lean();
            activityRows.forEach((row) => {
                const key = row && row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '';
                if (!key || !Object.prototype.hasOwnProperty.call(entryMap, key)) return;
                if (row.type === 'user_login') {
                    const userKey = getPrimaryActivityUserKey(row);
                    if (userKey) dauMap[key].add(userKey);
                }
                if (row.type === 'entry_created') {
                    entryMap[key] += 1;
                }
            });

            const growthLabels = [];
            const growthMap = {};
            for (let idx = 5; idx >= 0; idx -= 1) {
                const dt = new Date();
                dt.setUTCDate(1);
                dt.setUTCMonth(dt.getUTCMonth() - idx);
                const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                growthLabels.push(key);
                growthMap[key] = 0;
            }
            const signupRows = await SignupUser.find({
                createdAt: { $gte: new Date(new Date().setUTCMonth(new Date().getUTCMonth() - 6)) }
            }).lean();
            signupRows.forEach((row) => {
                if (!row.createdAt) return;
                const dt = new Date(row.createdAt);
                const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                if (Object.prototype.hasOwnProperty.call(growthMap, key)) growthMap[key] += 1;
            });

            return res.json({
                dayLabels,
                dailyActiveUsers: dayLabels.map((key) => dauMap[key].size),
                entriesPerDay: dayLabels.map((key) => entryMap[key] || 0),
                growthLabels,
                monthlyGrowth: growthLabels.map((key) => growthMap[key] || 0),
                mostActiveUsers: overviews
                    .map((item) => ({ userKey: item.userKey, name: item.name, totalEntries: item.totalEntries }))
                    .sort((a, b) => Number(b.totalEntries || 0) - Number(a.totalEntries || 0))
                    .slice(0, 10)
            });
        } catch (err) {
            await recordSystemError('admin_analytics', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load analytics' });
        }
    });

    app.get('/api/admin/backup/export', requireAdminApiAuth, async (req, res) => {
        try {
            const payload = await buildSystemBackupPayload();
            const filename = `tripset-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
            await recordAdminActivity({
                type: 'admin_backup_exported',
                actor: ADMIN_USERNAME,
                message: 'Admin exported full system backup',
                meta: { filename, suppressNotification: true }
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(JSON.stringify(payload, null, 2));
        } catch (err) {
            await recordSystemError('admin_backup_export', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to generate backup' });
        }
    });

    app.post('/api/admin/backup/restore', requireAdminApiAuth, async (req, res) => {
        try {
            const backup = req.body && req.body.backup ? req.body.backup : req.body;
            if (!backup || typeof backup !== 'object' || !backup.main || !Array.isArray(backup.accounts)) {
                return res.status(400).json({ error: 'Invalid backup payload' });
            }
            await restoreSystemBackupPayload(backup);
            await recordAdminActivity({
                type: 'admin_backup_restored',
                actor: ADMIN_USERNAME,
                message: 'Admin restored system backup',
                meta: { generatedAt: String(backup.generatedAt || ''), suppressNotification: true }
            });
            return res.json({ success: true });
        } catch (err) {
            await recordSystemError('admin_backup_restore', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to restore backup' });
        }
    });

    app.get('/api/public/config', async (req, res) => {
        try {
            const features = await getAdminFeatureFlags();
            return res.json({ features });
        } catch (err) {
            return res.json({ features: DEFAULT_ADMIN_FEATURE_FLAGS });
        }
    });

    app.get('/api/app/config', requireApiAuth, async (req, res) => {
        try {
            const requestedLanguage = normalizeLanguageCode(req.query && req.query.lang);
            const [features, announcements] = await Promise.all([
                getAdminFeatureFlags(),
                getAnnouncementsForAccount(req.authAccount || resolveSessionAccount(req), requestedLanguage, 20)
            ]);
            return res.json({ features, announcements, language: requestedLanguage });
        } catch (err) {
            await recordSystemError('user_app_config', err, { userKey: String((req.authAccount && req.authAccount.userKey) || '') }, 'error');
            return res.status(500).json({ error: 'Failed to load app config' });
        }
    });

    app.get('/api/notices', requireApiAuth, async (req, res) => {
        try {
            const requestedLanguage = normalizeLanguageCode(req.query && req.query.lang);
            const notices = await getAnnouncementsForAccount(req.authAccount || resolveSessionAccount(req), requestedLanguage, 40);
            return res.json({ notices, language: requestedLanguage });
        } catch (err) {
            await recordSystemError('user_notice_list', err, { userKey: String((req.authAccount && req.authAccount.userKey) || '') }, 'error');
            return res.status(500).json({ error: 'Failed to load notices' });
        }
    });

    app.post('/api/activity/report-download', requireApiAuth, async (req, res) => {
        try {
            const account = req.authAccount || resolveSessionAccount(req);
            const reportType = String((req.body && req.body.reportType) || '').trim() || 'report';
            await recordAdminActivity({
                type: 'report_downloaded',
                actor: String((account && account.userKey) || ''),
                targetUserKey: String((account && account.userKey) || ''),
                message: 'User downloaded report',
                meta: { reportType, displayName: getAccountDisplayName(account), suppressNotification: true }
            });
            return res.json({ success: true });
        } catch (err) {
            await recordSystemError('user_report_download_log', err, {}, 'warn');
            return res.status(500).json({ error: 'Failed to record report activity' });
        }
    });

    app.post('/auth/signup', async (req, res) => {
        try {
            const featureFlags = await getAdminFeatureFlags();
            if (featureFlags.signupEnabled === false) {
                return res.status(403).json({ error: 'Signup is currently disabled by admin' });
            }
            if (featureFlags.maintenanceEnabled === true) {
                return res.status(503).json({ error: 'Tripset is temporarily unavailable due to maintenance mode' });
            }
            const validation = validateSignupPayload(req.body || {});
            if (validation.error) {
                return res.status(400).json({ error: validation.error });
            }

            const input = validation.value;
            const existing = await SignupUser.findOne({
                $or: [
                    { mobileNumber: input.mobileNumber },
                    { email: input.email }
                ]
            }).lean();

            if (existing) {
                if (existing.mobileNumber === input.mobileNumber) {
                    return res.status(409).json({ error: 'This mobile number is already registered' });
                }
                return res.status(409).json({ error: 'This email ID is already registered' });
            }

            const storageInfo = buildUserStorageInfo(input.name, input.mobileNumber);
            const passwordHash = await bcrypt.hash(input.password, SIGNUP_PASSWORD_SALT_ROUNDS);
            const createdUser = await SignupUser.create({
                userKey: storageInfo.userKey,
                name: input.name,
                mobileNumber: input.mobileNumber,
                vehicleNumber: input.vehicleNumber,
                email: input.email,
                passwordHash,
                dbFolder: storageInfo.dbFolder,
                dbName: storageInfo.dbName,
                isActive: true,
                isBlocked: false,
                blockedAt: null
            });

            const account = getAccountFromSignupUser(createdUser);
            if (account) {
                const context = getDbContextByName(account.dbName);
                await getSettings(context.AppSettings, account);
                await context.UserProfile.updateOne(
                    { key: 'profile' },
                    {
                        key: 'profile',
                        name: input.name,
                        mobileNumber: input.mobileNumber,
                        vehicleNumber: input.vehicleNumber,
                        email: input.email,
                        updatedAt: new Date()
                    },
                    { upsert: true }
                );
            }

            await recordAdminActivity({
                type: 'new_user_registration',
                actor: 'system:signup',
                targetUserKey: String(createdUser.userKey || ''),
                message: 'New user registered',
                meta: {
                    name: String(createdUser.name || ''),
                    mobileNumber: String(createdUser.mobileNumber || ''),
                    email: String(createdUser.email || ''),
                    dbName: String(createdUser.dbName || '')
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Signup successful. Please login to continue.'
            });
        } catch (err) {
            const conflictMessage = getSignupConflictMessage(err);
            if (conflictMessage) {
                await recordSystemError('auth_signup_conflict', new Error(conflictMessage), { body: { email: req.body && req.body.email, mobileNumber: req.body && req.body.mobileNumber } }, 'warn');
                return res.status(409).json({ error: conflictMessage });
            }
            console.error('SIGNUP ERROR:', err);
            await recordSystemError('auth_signup', err, { email: req.body && req.body.email, mobileNumber: req.body && req.body.mobileNumber }, 'error');
            return res.status(500).json({ error: 'Failed to sign up' });
        }
    });

    app.post('/auth/login', async (req, res) => {
        try {
            const username = normalizeMobileNumber(req.body.username || '');
            const password = String(req.body.password || '').trim();
            if (!username || !password) {
                await recordSystemError('auth_login_validation', new Error('Missing username or password'), { username }, 'warn');
                return res.status(400).json({ error: 'Username and password are required' });
            }

            let account = null;
            const defaultAccount = findDefaultAccountByUsername(username);
            if (defaultAccount) {
                account = findDefaultAccountByCredentials(username, password);
                if (!account) {
                    await recordSystemError('auth_login_failure', new Error('Invalid credentials'), { username, accountType: 'default' }, 'warn');
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
            } else {
                const signupUser = await findActiveSignupUserByMobile(username);
                if (!signupUser) {
                    await recordSystemError('auth_login_failure', new Error('User not registered'), { username, accountType: 'dynamic' }, 'warn');
                    return res.status(404).json({ error: 'User not registered. Please sign up first.' });
                }
                if (signupUser.isBlocked) {
                    await recordSystemError('auth_login_blocked', new Error('Blocked account attempted login'), { username, userKey: signupUser.userKey }, 'warn');
                    return res.status(403).json({ error: 'Account blocked by admin' });
                }
                const passwordMatch = await bcrypt.compare(password, String(signupUser.passwordHash || ''));
                if (!passwordMatch) {
                    await recordSystemError('auth_login_failure', new Error('Invalid credentials'), { username, userKey: signupUser.userKey, accountType: 'dynamic' }, 'warn');
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                account = getAccountFromSignupUser(signupUser);
                if (!account) {
                    await recordSystemError('auth_login_profile', new Error('Account profile is incomplete'), { username, userKey: signupUser.userKey }, 'error');
                    return res.status(500).json({ error: 'Account profile is incomplete' });
                }
            }
            if (await isMaintenanceModeEnabled()) {
                await recordSystemError('auth_login_maintenance', new Error('Maintenance mode enabled'), { username }, 'warn');
                return res.status(503).json({ error: 'Tripset is temporarily unavailable due to maintenance mode' });
            }

            setSessionAccount(req, account);
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Failed to save session' });
                }
                console.log(`✅ Login successful for ${account.userKey} (${account.dbFolder})`);
                recordAdminActivity({
                    type: 'user_login',
                    actor: String(account.userKey || ''),
                    targetUserKey: String(account.userKey || ''),
                    message: 'User login successful',
                    meta: { displayName: getAccountDisplayName(account), suppressNotification: true }
                }).catch(function(logErr) {
                    console.warn('User login activity warning:', logErr.message);
                });
                return res.json({
                    success: true,
                    user: account.userKey,
                    dbFolder: account.dbFolder,
                    displayName: getAccountDisplayName(account)
                });
            });
        } catch (err) {
            console.error('LOGIN ERROR:', err);
            await recordSystemError('auth_login', err, { username: req.body && req.body.username }, 'error');
            return res.status(500).json({ error: 'Login failed' });
        }
    });

    app.post('/auth/logout', (req, res) => {
        req.session.destroy(() => {});
        res.json({ success: true });
    });

app.post('/api/account/delete', requireApiAuth, async (req, res) => {
    try {
        const account = req.authAccount || resolveSessionAccount(req);
        if (!account) return res.status(401).json({ error: 'Unauthorized' });

        if (isDefaultAccount(account) || !account.isDynamicUser) {
            return res.status(403).json({ error: 'Default accounts cannot be deleted' });
        }

        const termsAccepted = !!(req.body && req.body.termsAccepted);
        const finalConfirmed = !!(req.body && req.body.finalConfirmed);
        const finalConfirmation = String((req.body && req.body.finalConfirmation) || '').trim();
        if (!termsAccepted) {
            return res.status(400).json({ error: 'Please accept Terms & Conditions to continue' });
        }
        if (!finalConfirmed || finalConfirmation !== 'Yes, I want to delete my account') {
            return res.status(400).json({ error: 'Final delete confirmation is required' });
        }

        const user = await SignupUser.findOne({ userKey: account.userKey, isActive: true });
        if (!user) {
            req.session.destroy(() => {});
            return res.json({ success: true, deleted: true, alreadyDeleted: true });
        }

        const dbName = String(user.dbName || account.dbName || '').trim();
        if (dbName) {
            const dbContext = getDbContextByName(dbName);
            await dbContext.db.dropDatabase();
            dbContextCache.delete(dbName);
        }

        await SignupUser.deleteOne({ _id: user._id });
        try {
            await mongoose.connection.db.collection('sessions').deleteMany({ 'session.authUserKey': account.userKey });
        } catch (sessionCleanupErr) {
            console.warn('Session cleanup warning after account delete:', sessionCleanupErr.message);
        }
        await recordAdminActivity({
            type: 'user_deleted',
            actor: String(account.userKey || ''),
            targetUserKey: String(account.userKey || ''),
            message: 'User account deleted',
            meta: {
                dbName: String(dbName || ''),
                by: 'self'
            }
        });
        for (const key of legacyMigrationCache.keys()) {
            if (String(key).startsWith(String(account.userKey || '') + ':')) {
                legacyMigrationCache.delete(key);
            }
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error after account delete:', err);
            }
            return res.json({ success: true, deleted: true });
        });
    } catch (err) {
        console.error('DELETE ACCOUNT ERROR:', err);
        return res.status(500).json({ error: 'Failed to delete account' });
    }
});

app.get('/api/auth/status', (req, res) => {
    const account = resolveSessionAccount(req);
    getAdminFeatureFlags().then((features) => {
        res.json({
            isAuthenticated: !!account,
            user: account ? account.userKey : null,
            dbFolder: account ? account.dbFolder : null,
            displayName: account ? getAccountDisplayName(account) : null,
            isDynamicUser: !!(account && account.isDynamicUser),
            canDeleteAccount: !!(account && account.isDynamicUser && !isDefaultAccount(account)),
            maintenanceEnabled: features.maintenanceEnabled === true
        });
    }).catch(() => {
        res.json({
            isAuthenticated: !!account,
            user: account ? account.userKey : null,
            dbFolder: account ? account.dbFolder : null,
            displayName: account ? getAccountDisplayName(account) : null,
            isDynamicUser: !!(account && account.isDynamicUser),
            canDeleteAccount: !!(account && account.isDynamicUser && !isDefaultAccount(account)),
            maintenanceEnabled: false
        });
    });
});

// API Routes - OLD ENTRIES FIRST (Sort 1) - protected
app.get('/api/trips', requireApiAuth, async (req, res) => {
        try {
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
            const trips = await context.Trip.find().sort({ createdAt: 1 });
            res.json(trips);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/trips', requireApiAuth, async (req, res) => {
        try {
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
            const count = await context.Trip.countDocuments();
            if (count >= 10000) {
                const oldest = await context.Trip.find().sort({ createdAt: 1 }).limit(1);
                if (oldest.length > 0) await context.Trip.deleteOne({ _id: oldest[0]._id });
            }
            const possibleDuplicate = await context.Trip.findOne({
                tripId: String((req.body && req.body.tripId) || '').trim(),
                date: String((req.body && req.body.date) || '').trim()
            }).lean();
            const newTrip = new context.Trip(req.body);
            await newTrip.save();
            const [overview, settings] = await Promise.all([
                buildAdminAccountOverview(context.account, null),
                getSettings(context.AppSettings, context.account)
            ]);
            const invoiceRecord = await upsertTripInvoiceRecord(
                context,
                context.account,
                settings,
                newTrip.toObject ? newTrip.toObject() : newTrip,
                overview
            );
            const alerts = detectSmartTripAlerts(newTrip.toObject ? newTrip.toObject() : newTrip, overview);
            if (possibleDuplicate) {
                alerts.push({
                    title: 'Duplicate Trip Entry',
                    message: `Duplicate trip detected for ${String((newTrip && newTrip.tripId) || 'trip')}`,
                    meta: {
                        tripId: String((newTrip && newTrip.tripId) || ''),
                        userKey: String((overview && overview.userKey) || ''),
                        duplicateEntryId: String((possibleDuplicate && possibleDuplicate._id) || '')
                    }
                });
            }
            for (const alert of alerts) {
                await recordAdminNotification({
                    type: 'smart_alert',
                    title: alert.title,
                    message: alert.message,
                    meta: alert.meta || {}
                });
                await recordAdminActivity({
                    type: 'smart_alert',
                    actor: ADMIN_USERNAME,
                    targetUserKey: String((overview && overview.userKey) || ''),
                    message: alert.message,
                    meta: { title: alert.title, ...(alert.meta || {}), suppressNotification: true }
                });
            }
            await recordAdminActivity({
                type: 'entry_created',
                actor: String((context.account && context.account.userKey) || ''),
                targetUserKey: String((context.account && context.account.userKey) || ''),
                message: 'Trip entry created',
                meta: {
                    tripId: String((newTrip && newTrip.tripId) || ''),
                    date: String((newTrip && newTrip.date) || ''),
                    km: Number((newTrip && newTrip.km) || 0),
                    total: String((newTrip && newTrip.total) || ''),
                    invoiceMonth: invoiceRecord ? String(invoiceRecord.invoiceMonth || '') : '',
                    invoiceNumber: invoiceRecord ? String(invoiceRecord.invoiceNumber || '') : ''
                }
            });
            res.json({
                ...(newTrip.toObject ? newTrip.toObject() : newTrip),
                invoice: invoiceRecord ? {
                    invoiceMonth: String(invoiceRecord.invoiceMonth || ''),
                    invoiceNumber: String(invoiceRecord.invoiceNumber || '')
                } : null
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

   app.delete('/api/trips/:id', requireApiAuth, async (req, res) => {
    try {
        const context = await getDbContextForRequest(req);
        if (!context) return res.status(401).json({ error: 'Unauthorized' });
        const existingTrip = await context.Trip.findById(req.params.id).lean();
        await context.Trip.findByIdAndDelete(req.params.id);
        if (existingTrip) {
            await context.TripInvoice.deleteMany({
                $or: [
                    { tripDbId: String(existingTrip._id || '') },
                    {
                        tripId: String((existingTrip && existingTrip.tripId) || '').trim(),
                        date: String((existingTrip && existingTrip.date) || '').trim()
                    }
                ]
            });
        }
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
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
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
            const result = await context.Trip.insertMany(tripsToInsert, { ordered: false });
            const [settings, overview] = await Promise.all([
                getSettings(context.AppSettings, context.account),
                buildAdminAccountOverview(context.account, null)
            ]);
            await syncTripInvoiceRecords(
                context,
                context.account,
                settings,
                result.map((item) => item.toObject ? item.toObject() : item),
                overview
            );
            
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
        const context = await getDbContextForRequest(req);
        if (!context) return res.status(401).json({ error: 'Unauthorized' });
        const existingTrip = await context.Trip.findById(req.params.id).lean();
        const updated = await context.Trip.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (updated) {
            const [settings, overview] = await Promise.all([
                getSettings(context.AppSettings, context.account),
                buildAdminAccountOverview(context.account, null)
            ]);
            await upsertTripInvoiceRecord(
                context,
                context.account,
                settings,
                updated.toObject ? updated.toObject() : updated,
                overview
            );
            if (existingTrip && String(existingTrip._id || '') !== String(updated._id || '')) {
                await context.TripInvoice.deleteMany({ tripDbId: String(existingTrip._id || '') });
            }
        }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

    // Invoice API (MongoDB only)
    // GET /api/invoice/:month  (month format: YYYY-MM)
    app.get('/api/invoice/:month', requireApiAuth, async (req, res) => {
        try {
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
            const monthStr = String(req.params.month || '').trim(); // "YYYY-MM"
            if (!/^\d{4}-\d{2}$/.test(monthStr)) {
                return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
            }

            const [year, month] = monthStr.split('-').map(Number);
            const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const end = new Date(year, month, 1, 0, 0, 0, 0); // exclusive

            const overview = await buildAdminAccountOverview(context.account, null);
            const trips = await context.Trip.find({ createdAt: { $gte: start, $lt: end } })
                .sort({ createdAt: 1 })
                .lean();
            const settings = await getSettings(context.AppSettings, context.account);
            await syncTripInvoiceRecords(context, context.account, settings, trips, overview);

            const companyName = String(settings.companyName || getAccountDisplayName(context.account));
            const safeTaxPercent = Math.max(0, Number(settings.invoiceTaxPercent) || 0);
            const items = trips.map((t) => {
                const km = Number(t.km) || 0;
                const rate = Number(t.rate) || settings.rate;
                const lineTotal = km * rate;
                const tripId = String(t.tripId || '').trim();
                const from = String(t.pickup || '').trim();
                const to = String(t.drop || '').trim();
                const route = [from, to].filter(Boolean).join(' -> ') || 'Trip Service';
                const displayDate = String(t.date || '').trim() || new Date(t.createdAt || Date.now()).toLocaleDateString('en-IN');

                return {
                    tripId,
                    itemName: tripId ? (tripId + ' - ' + route) : route,
                    date: displayDate,
                    quantity: km,
                    price: rate,
                    total: lineTotal
                };
            });

            const subtotal = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
            const taxAmount = (subtotal * safeTaxPercent) / 100;
            const grandTotal = subtotal + taxAmount;
            const monthToken = monthStr.replace('-', '');
            const invoiceNumber = 'INV-' + monthToken + '-' + String(items.length || 0).padStart(3, '0');
            await context.TripInvoice.updateMany(
                { invoiceMonth: monthStr },
                {
                    companyName,
                    pdfPath: `/api/invoice/${monthStr}`,
                    pdfReady: items.length > 0,
                    updatedAt: new Date()
                }
            );

            return res.json({
                companyName,
                companyLogoUrl: String(settings.invoiceLogoUrl || '/icon-512.png'),
                month: monthStr,
                invoiceNumber,
                invoiceDate: new Date().toISOString(),
                customer: {
                    name: String(settings.invoiceCustomerName || 'Walk-in Customer'),
                    contact: String(settings.invoiceCustomerContact || '')
                },
                items,
                subtotal,
                taxPercent: safeTaxPercent,
                taxAmount,
                grandTotal,
                paymentStatus: String(settings.invoicePaymentStatus || 'Pending')
            });
        } catch (err) {
            console.error('INVOICE ERROR:', err);
            return res.status(500).json({ error: 'Failed to generate invoice' });
    }
});

    app.get('/api/invoices/history', requireApiAuth, async (req, res) => {
        try {
            const context = await getDbContextForRequest(req);
            if (!context) return res.status(401).json({ error: 'Unauthorized' });
            const month = String((req.query && req.query.month) || '').trim();
            const query = {};
            if (/^\d{4}-\d{2}$/.test(month)) {
                query.invoiceMonth = month;
            }
            const limitRaw = Number((req.query && req.query.limit) || 100);
            const limit = Math.min(500, Math.max(10, Number.isFinite(limitRaw) ? limitRaw : 100));
            const items = await context.TripInvoice.find(query).sort({ createdAt: -1 }).limit(limit).lean();
            return res.json(items.map((item) => ({
                _id: String(item && item._id ? item._id : ''),
                tripId: String((item && item.tripId) || ''),
                invoiceMonth: String((item && item.invoiceMonth) || ''),
                companyName: String((item && item.companyName) || ''),
                vehicleNumber: String((item && item.vehicleNumber) || ''),
                route: String((item && item.route) || ''),
                invoiceNumber: String((item && item.invoiceNumber) || ''),
                date: String((item && item.date) || ''),
                total: Number((item && item.total) || 0),
                pdfPath: String((item && item.pdfPath) || ''),
                pdfReady: item && item.pdfReady === true,
                createdAt: item && item.createdAt ? item.createdAt : null,
                updatedAt: item && item.updatedAt ? item.updatedAt : null
            })));
        } catch (err) {
            await recordSystemError('invoice_history_list', err, {}, 'error');
            return res.status(500).json({ error: 'Failed to load invoice history' });
        }
    });


    // Serve Frontend
    app.get('/signup', (req, res) => {
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
        const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Tripset</title>
    <link rel="manifest" href="/manifest.json?v=${PWA_ASSET_VERSION}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <link rel="shortcut icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <link rel="apple-touch-icon" href="/icon-192.png?v=${PWA_ASSET_VERSION}">
    <meta name="theme-color" content="#F97316">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; }
        .signup-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .signup-box {
            background: white;
            border-radius: 1.5rem;
            padding: 2rem;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
            max-width: 26rem;
            width: 100%;
            text-align: center;
        }
        .signup-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 0.75rem;
            margin-bottom: 0.9rem;
            font-size: 1rem;
        }
        .signup-input:focus {
            outline: none;
            border-color: #F97316;
            box-shadow: 0 0 0 3px rgba(249,115,22,0.2);
        }
        .signup-btn {
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
        .signup-btn:hover { opacity: 0.95; }
        .error-msg {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.5rem;
            display: none;
        }
        .success-msg {
            color: #059669;
            font-size: 0.875rem;
            margin-top: 0.5rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="signup-container">
        <div class="signup-box">
            <h2 class="text-xl font-extrabold text-slate-900">Tripset Sign Up</h2>
            <p class="text-sm text-slate-500 mt-1 mb-5">Create your account</p>

            <input id="name" type="text" class="signup-input" placeholder="Name" required>
            <input id="mobileNumber" type="text" inputmode="numeric" class="signup-input" placeholder="Mobile Number" required>
            <input id="vehicleNumber" type="text" class="signup-input" placeholder="Vehicle Number" required>
            <input id="email" type="email" class="signup-input" placeholder="Email ID" required>
            <input id="password" type="password" autocomplete="new-password" class="signup-input" placeholder="Password" required>
            <input id="confirmPassword" type="password" autocomplete="new-password" class="signup-input" placeholder="Confirm Password" required>

            <button id="signupSubmitBtn" type="button" class="signup-btn" onclick="doSignup()">Sign Up</button>
            <p id="errorMsg" class="error-msg"></p>
            <p id="successMsg" class="success-msg"></p>
            <p id="signupDisabledMsg" class="error-msg" style="margin-top:0.75rem;"></p>
            <a href="/login" class="block text-sm font-bold text-orange-600 mt-3 hover:text-orange-700">Already registered? Login</a>
        </div>
    </div>
    <script>
        function normalizeMobile(raw) {
            var digits = String(raw || '').replace(/\\D+/g, '');
            if (digits.length === 12 && digits.slice(0, 2) === '91') return digits.slice(2);
            return digits;
        }
        function normalizeVehicle(raw) {
            return String(raw || '').trim().replace(/\\s+/g, '').toUpperCase();
        }
        function showError(msg) {
            var err = document.getElementById('errorMsg');
            var ok = document.getElementById('successMsg');
            ok.style.display = 'none';
            err.textContent = msg;
            err.style.display = 'block';
        }
        function showSuccess(msg) {
            var err = document.getElementById('errorMsg');
            var ok = document.getElementById('successMsg');
            err.style.display = 'none';
            ok.textContent = msg;
            ok.style.display = 'block';
        }
        async function loadPublicConfig() {
            try {
                var res = await fetch('/api/public/config', { cache: 'no-store' });
                if (!res.ok) return;
                var cfg = await res.json();
                var enabled = !(cfg && cfg.features && cfg.features.signupEnabled === false);
                var btn = document.getElementById('signupSubmitBtn');
                var msg = document.getElementById('signupDisabledMsg');
                ['name', 'mobileNumber', 'vehicleNumber', 'email', 'password', 'confirmPassword'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.disabled = !enabled;
                });
                if (btn) {
                    btn.disabled = !enabled;
                    btn.style.opacity = enabled ? '1' : '0.6';
                    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
                }
                if (msg) {
                    if (enabled) {
                        msg.style.display = 'none';
                        msg.textContent = '';
                    } else {
                        msg.style.display = 'block';
                        msg.textContent = 'Signup is currently disabled by admin';
                    }
                }
            } catch (e) {}
        }
        async function doSignup() {
            var submitBtn = document.getElementById('signupSubmitBtn');
            if (submitBtn && submitBtn.disabled) {
                showError('Signup is currently disabled by admin');
                return;
            }
            var name = (document.getElementById('name').value || '').trim();
            var mobileNumber = normalizeMobile(document.getElementById('mobileNumber').value);
            var vehicleNumber = normalizeVehicle(document.getElementById('vehicleNumber').value);
            var email = (document.getElementById('email').value || '').trim().toLowerCase();
            var password = String(document.getElementById('password').value || '').trim();
            var confirmPassword = String(document.getElementById('confirmPassword').value || '').trim();

            if (!name || !mobileNumber || !vehicleNumber || !email || !password || !confirmPassword) {
                showError('All fields are required');
                return;
            }
            if (name.length < 2) {
                showError('Name must be at least 2 characters');
                return;
            }
            if (!/^\\d{10}$/.test(mobileNumber)) {
                showError('Mobile number must be exactly 10 digits');
                return;
            }
            if (!/^[A-Z0-9-]{6,20}$/.test(vehicleNumber)) {
                showError('Vehicle number is invalid');
                return;
            }
            if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) {
                showError('Email ID is invalid');
                return;
            }
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                showError('Password and confirm password do not match');
                return;
            }

            try {
                var res = await fetch('/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: name,
                        mobileNumber: mobileNumber,
                        vehicleNumber: vehicleNumber,
                        email: email,
                        password: password,
                        confirmPassword: confirmPassword
                    })
                });

                if (!res.ok) {
                    var message = 'Signup failed';
                    try {
                        var errData = await res.json();
                        if (errData && errData.error) message = String(errData.error);
                    } catch (e) {}
                    showError(message);
                    return;
                }

                showSuccess('Signup successful. Redirecting to login...');
                setTimeout(function() { window.location.href = '/login'; }, 900);
            } catch (e) {
                showError('Signup failed');
            }
        }

        ['confirmPassword', 'password', 'email', 'vehicleNumber', 'mobileNumber', 'name'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') doSignup();
            });
        });
        loadPublicConfig();
    </script>
</body>
</html>
        `;
        res.send(pageHtml);
    });

    app.get('/admin/login', (req, res) => {
        if (resolveAdminSession(req)) {
            return res.redirect(302, '/admin');
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
        const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Tripset</title>
    <link rel="manifest" href="/manifest.json?v=${PWA_ASSET_VERSION}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <link rel="shortcut icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <meta name="theme-color" content="#0f172a">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --admin-ink: #e2e8f0;
            --admin-bg: #050816;
            --admin-panel: rgba(15, 23, 42, 0.84);
            --admin-accent: #f97316;
            --admin-border: rgba(148, 163, 184, 0.16);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'IBM Plex Sans', sans-serif;
            color: var(--admin-ink);
            background:
                radial-gradient(circle at top left, rgba(249, 115, 22, 0.32), transparent 32%),
                radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.24), transparent 28%),
                linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
        }
        .admin-auth-shell {
            width: min(100%, 1020px);
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            border: 1px solid var(--admin-border);
            border-radius: 28px;
            overflow: hidden;
            background: rgba(2, 6, 23, 0.6);
            backdrop-filter: blur(18px);
            box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
        }
        .admin-auth-brand {
            padding: 3rem;
            background:
                linear-gradient(180deg, rgba(249, 115, 22, 0.08), transparent 48%),
                linear-gradient(140deg, rgba(15, 23, 42, 0.88), rgba(2, 6, 23, 0.96));
            position: relative;
        }
        .admin-auth-brand::after {
            content: '';
            position: absolute;
            inset: auto -5rem -5rem auto;
            width: 240px;
            height: 240px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.28), transparent 68%);
        }
        .admin-auth-panel {
            padding: 2.5rem 2rem;
            background: var(--admin-panel);
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .admin-brand-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.45rem 0.85rem;
            border-radius: 999px;
            border: 1px solid rgba(249, 115, 22, 0.28);
            background: rgba(249, 115, 22, 0.12);
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #fdba74;
        }
        .admin-brand-title,
        .admin-form-title {
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            letter-spacing: -0.04em;
        }
        .admin-brand-title {
            font-size: clamp(2.6rem, 5vw, 4.4rem);
            line-height: 0.98;
            margin: 1.5rem 0 1rem;
        }
        .admin-brand-copy {
            max-width: 30rem;
            color: #cbd5e1;
            font-size: 1rem;
            line-height: 1.7;
        }
        .admin-metric-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.9rem;
            margin-top: 2rem;
        }
        .admin-metric-card {
            padding: 1rem 1.1rem;
            border: 1px solid rgba(148, 163, 184, 0.14);
            border-radius: 18px;
            background: rgba(15, 23, 42, 0.44);
        }
        .admin-metric-card span {
            display: block;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #94a3b8;
            font-weight: 700;
        }
        .admin-metric-card strong {
            display: block;
            margin-top: 0.5rem;
            font-size: 1.35rem;
            color: #f8fafc;
        }
        .admin-form-title {
            font-size: 1.9rem;
            color: #f8fafc;
            margin: 0 0 0.35rem;
        }
        .admin-form-copy {
            margin: 0 0 1.4rem;
            color: #94a3b8;
            font-size: 0.95rem;
        }
        .admin-input {
            width: 100%;
            padding: 0.95rem 1rem;
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.18);
            background: rgba(15, 23, 42, 0.82);
            color: #f8fafc;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .admin-input:focus {
            border-color: rgba(249, 115, 22, 0.75);
            transform: translateY(-1px);
        }
        .admin-input::placeholder { color: #64748b; }
        .admin-submit {
            width: 100%;
            border: none;
            cursor: pointer;
            padding: 0.95rem 1rem;
            border-radius: 16px;
            font-weight: 700;
            background: linear-gradient(135deg, #f97316, #fb923c);
            color: #fff7ed;
            font-size: 1rem;
            box-shadow: 0 18px 40px rgba(249, 115, 22, 0.25);
        }
        .admin-submit:hover { filter: brightness(1.04); }
        .admin-error {
            display: none;
            margin-top: 1rem;
            padding: 0.9rem 1rem;
            border-radius: 14px;
            border: 1px solid rgba(248, 113, 113, 0.32);
            background: rgba(127, 29, 29, 0.35);
            color: #fecaca;
            font-size: 0.92rem;
            font-weight: 600;
        }
        @media (max-width: 860px) {
            .admin-auth-shell {
                grid-template-columns: 1fr;
            }
            .admin-auth-brand,
            .admin-auth-panel {
                padding: 1.6rem;
            }
            .admin-brand-title {
                font-size: 2.45rem;
            }
        }
    </style>
</head>
<body>
    <div class="admin-auth-shell">
        <section class="admin-auth-brand">
            <div class="admin-brand-kicker">Tripset Control</div>
            <h1 class="admin-brand-title">Admin panel for system-wide Tripset control.</h1>
            <p class="admin-brand-copy">
                Review users, monitor companies, inspect trip activity, and export operating reports from one protected workspace.
            </p>
            <div class="admin-metric-grid">
                <div class="admin-metric-card">
                    <span>Admin Scope</span>
                    <strong>Users + Reports</strong>
                </div>
                <div class="admin-metric-card">
                    <span>Security</span>
                    <strong>Separate Auth</strong>
                </div>
                <div class="admin-metric-card">
                    <span>Visibility</span>
                    <strong>All Trips</strong>
                </div>
                <div class="admin-metric-card">
                    <span>Action</span>
                    <strong>Edit / Block / Delete</strong>
                </div>
            </div>
        </section>
        <section class="admin-auth-panel">
            <h2 class="admin-form-title">Admin Login</h2>
            <p class="admin-form-copy">Only admin credentials are accepted here. Normal user accounts continue to use the standard login page.</p>
            <div class="space-y-4">
                <input id="adminUsername" class="admin-input" type="text" autocomplete="username" placeholder="Admin username">
                <input id="adminPassword" class="admin-input" type="password" autocomplete="current-password" placeholder="Admin password">
                <button type="button" class="admin-submit" onclick="doAdminLogin()">Access Admin Panel</button>
                <div id="adminError" class="admin-error"></div>
            </div>
        </section>
    </div>
    <script>
        function showAdminError(message) {
            var error = document.getElementById('adminError');
            error.textContent = message;
            error.style.display = 'block';
        }
        async function doAdminLogin() {
            var username = String(document.getElementById('adminUsername').value || '').trim();
            var password = String(document.getElementById('adminPassword').value || '').trim();
            if (!username || !password) {
                showAdminError('Enter admin username and password');
                return;
            }
            try {
                var res = await fetch('/admin/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username: username, password: password })
                });
                if (!res.ok) {
                    var message = 'Admin login failed';
                    try {
                        var err = await res.json();
                        if (err && err.error) message = String(err.error);
                    } catch (parseErr) {}
                    showAdminError(message);
                    return;
                }
                window.location.href = '/admin';
            } catch (err) {
                showAdminError('Admin login failed');
            }
        }
        ['adminUsername', 'adminPassword'].forEach(function(id) {
            var el = document.getElementById(id);
            el.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') doAdminLogin();
            });
        });
    </script>
</body>
</html>
        `;
        res.send(pageHtml);
    });

    app.get('/admin', requireAdminPageAuth, (req, res) => {
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
        const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tripset Admin Panel</title>
    <link rel="manifest" href="/manifest.json?v=${PWA_ASSET_VERSION}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <meta name="theme-color" content="#020617">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link rel="stylesheet" href="/admin-panel.css?v=${PWA_ASSET_VERSION}">
</head>
<body class="min-h-screen">
    <div id="adminSidebarOverlay" class="hidden fixed inset-0 bg-slate-950/70 z-40 lg:hidden" onclick="window.toggleAdminSidebar(false)"></div>
    <div class="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside id="adminSidebar" class="admin-sidebar fixed inset-y-0 left-0 z-50 w-[280px] border-r border-slate-800 bg-slate-950/95 p-4 backdrop-blur lg:static lg:translate-x-0">
            <div class="admin-card rounded-3xl p-5">
                <div class="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Tripset Admin</div>
                <h1 class="admin-title mt-2 text-3xl text-white">Control Room</h1>
                <p class="mt-3 text-sm leading-6 text-slate-400">Separate admin workspace for users, companies, entries, reports, and system activity.</p>
            </div>
            <nav class="mt-5 flex flex-col gap-2">
                <button class="admin-sidebar-btn active rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="dashboard" onclick="window.setAdminSection('dashboard')">Dashboard</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="users" onclick="window.setAdminSection('users')">Users</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="companies" onclick="window.setAdminSection('companies')">Companies</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="entries" onclick="window.setAdminSection('entries')">Entries</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="reports" onclick="window.setAdminSection('reports')">Reports</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="announcements" onclick="window.setAdminSection('announcements')">Announcements</button>
                <button class="admin-sidebar-btn rounded-2xl border border-transparent px-4 py-3 text-left font-bold text-slate-200" data-section-btn="settings" onclick="window.setAdminSection('settings')">Settings</button>
            </nav>
            <div class="admin-card mt-5 rounded-3xl p-5">
                <div class="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Signed in as</div>
                <div id="adminSessionUser" class="mt-2 text-lg font-black text-white"></div>
                <div class="mt-4 flex flex-col gap-2 no-pdf">
                    <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.refreshAdminData()">Refresh Data</button>
                    <button type="button" class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 font-bold text-rose-200" onclick="window.logoutAdmin()">Logout</button>
                </div>
            </div>
        </aside>

        <main class="p-4 lg:p-6">
            <header class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" class="no-pdf rounded-2xl border border-slate-700 px-4 py-2 font-bold text-slate-200 lg:hidden" onclick="window.toggleAdminSidebar(true)">Menu</button>
                        <span class="admin-badge admin-badge-orange">Admin-only route</span>
                    </div>
                    <h2 class="admin-title mt-3 text-4xl text-white">Tripset Admin Panel</h2>
                    <p class="mt-2 text-slate-400">Overview, moderation, and export tools for the full Tripset system.</p>
                    <div class="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
                        <input id="adminGlobalSearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none md:min-w-[320px]" placeholder="Global search: user, company, vehicle, mobile, trip">
                        <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200 no-pdf" onclick="window.runAdminGlobalSearch()">Run Global Search</button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 no-pdf">
                    <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.refreshAdminData()">Refresh</button>
                    <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.setAdminSection('reports')">Open Reports</button>
                </div>
            </header>

            <section id="admin-section-dashboard" class="admin-section active">
                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Total Users</div><div id="adminTotalUsers" class="mt-3 text-4xl font-black text-white">0</div></div>
                    <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Total Companies</div><div id="adminTotalCompanies" class="mt-3 text-4xl font-black text-white">0</div></div>
                    <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Total Entries</div><div id="adminTotalEntries" class="mt-3 text-4xl font-black text-white">0</div></div>
                    <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Total Trips</div><div id="adminTotalTrips" class="mt-3 text-4xl font-black text-white">0</div></div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Entries Per Day</h3>
                        <p class="mt-2 text-sm text-slate-400">Daily trip entry volume across all Tripset users.</p>
                        <div class="mt-4"><canvas id="adminEntriesChart" height="150"></canvas></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Top Users</h3>
                        <p class="mt-2 text-sm text-slate-400">Most active users by total entries.</p>
                        <div class="mt-4"><canvas id="adminUsersChart" height="150"></canvas></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-2">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Recent Activity</h3>
                        <p class="mt-2 text-sm text-slate-400">Latest tracked events across the system.</p>
                        <div id="adminDashboardActivity" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Most Active Users</h3>
                        <p class="mt-2 text-sm text-slate-400">Quick ranking by entry volume.</p>
                        <div id="adminDashboardTopUsers" class="mt-4 space-y-3"></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Daily Active Users</h3>
                        <p class="mt-2 text-sm text-slate-400">Users who logged in during each of the last 14 days.</p>
                        <div class="mt-4"><canvas id="adminDauChart" height="150"></canvas></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Monthly System Growth</h3>
                        <p class="mt-2 text-sm text-slate-400">New registered users added each month.</p>
                        <div class="mt-4"><canvas id="adminGrowthChart" height="150"></canvas></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 class="admin-title text-2xl text-white">Notifications</h3>
                                <p class="mt-2 text-sm text-slate-400">Important system events for admin review.</p>
                            </div>
                            <button type="button" class="no-pdf rounded-2xl border border-slate-700 px-4 py-2 font-bold text-slate-200" onclick="window.markAllNotificationsRead()">Mark all read</button>
                        </div>
                        <div id="adminNotificationsList" class="mt-4 space-y-3"></div>
                    </div>
                </div>
            </section>

            <section id="admin-section-users" class="admin-section">
                <div class="admin-card rounded-3xl p-5">
                    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 class="admin-title text-2xl text-white">User Management</h3>
                            <p class="mt-2 text-sm text-slate-400">Search, inspect, edit, block, or delete registered dynamic users.</p>
                        </div>
                        <div class="flex flex-wrap gap-2 no-pdf">
                            <input id="adminUserSearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Search by name, mobile, email, company">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminUsers()">Search</button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="admin-table w-full min-w-[980px] border-collapse">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Vehicle</th>
                                    <th>Email</th>
                                    <th>Companies</th>
                                    <th>Entries</th>
                                    <th>Status</th>
                                    <th class="no-pdf">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminUsersTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="admin-section-companies" class="admin-section">
                <div class="admin-card rounded-3xl p-5">
                    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 class="admin-title text-2xl text-white">Company Management</h3>
                            <p class="mt-2 text-sm text-slate-400">View the company list, owner, rate, and edit or reset company details.</p>
                        </div>
                        <div class="flex flex-wrap gap-2 no-pdf">
                            <input id="adminCompanySearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Search company or owner">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminCompanies()">Search</button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="admin-table w-full min-w-[860px] border-collapse">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Owner</th>
                                    <th>Rate</th>
                                    <th>Entries</th>
                                    <th>Type</th>
                                    <th class="no-pdf">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminCompaniesTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="admin-section-entries" class="admin-section">
                <div class="admin-card rounded-3xl p-5">
                    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 class="admin-title text-2xl text-white">Entry Monitoring</h3>
                            <p class="mt-2 text-sm text-slate-400">Filter entries by user or date and remove incorrect trip records.</p>
                        </div>
                        <div class="flex flex-wrap gap-2 no-pdf">
                            <select id="adminEntryUserFilter" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></select>
                            <select id="adminEntryCompanyFilter" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></select>
                            <input id="adminEntrySearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Filter by user, company, vehicle, route">
                            <input id="adminEntryFrom" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                            <input id="adminEntryTo" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminEntries()">Apply</button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="admin-table w-full min-w-[1100px] border-collapse">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Trip ID</th>
                                    <th>User</th>
                                    <th>Company</th>
                                    <th>Route</th>
                                    <th>KM</th>
                                    <th>Total</th>
                                    <th class="no-pdf">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="adminEntriesTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="admin-section-reports" class="admin-section">
                <div class="admin-card rounded-3xl p-5">
                    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between no-pdf">
                        <div>
                            <h3 class="admin-title text-2xl text-white">Reports and Export</h3>
                            <p class="mt-2 text-sm text-slate-400">Generate system summary reports and export them as PDF or Excel.</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.exportAdminReportPdf()">Export PDF</button>
                            <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.exportAdminReportExcel()">Export Excel</button>
                        </div>
                    </div>
                    <div id="adminReportExport">
                        <div class="grid gap-4 md:grid-cols-3">
                            <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Users</div><div id="adminReportUsers" class="mt-3 text-4xl font-black text-white">0</div></div>
                            <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Entries</div><div id="adminReportEntries" class="mt-3 text-4xl font-black text-white">0</div></div>
                            <div class="admin-card rounded-3xl p-5"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Companies</div><div id="adminReportCompanies" class="mt-3 text-4xl font-black text-white">0</div></div>
                        </div>
                        <div class="mt-4 grid gap-4 xl:grid-cols-2">
                            <div class="admin-card rounded-3xl p-5">
                                <h3 class="admin-title text-2xl text-white">Company-wise Report</h3>
                                <div id="adminReportCompanyWise" class="mt-4 space-y-3"></div>
                            </div>
                            <div class="admin-card rounded-3xl p-5">
                                <h3 class="admin-title text-2xl text-white">User Activity Report</h3>
                                <div id="adminReportUserActivity" class="mt-4 space-y-3"></div>
                            </div>
                        </div>
                        <div class="admin-card mt-4 rounded-3xl p-5">
                            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                    <h3 class="admin-title text-2xl text-white">User Activity Logs</h3>
                                    <p class="mt-2 text-sm text-slate-400">User login, company creation, entry creation, and report download activity.</p>
                                </div>
                                <div class="flex flex-wrap gap-2 no-pdf">
                                    <input id="adminActivitySearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Filter by user, company, vehicle, action">
                                    <input id="adminActivityFrom" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                    <input id="adminActivityTo" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                    <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminActivity()">Apply</button>
                                </div>
                            </div>
                            <div id="adminReportActivityLogs" class="mt-4 space-y-3"></div>
                        </div>
                        <div class="admin-card mt-4 rounded-3xl p-5">
                            <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div>
                                    <h3 class="admin-title text-2xl text-white">Admin Activity Logs</h3>
                                    <p class="mt-2 text-sm text-slate-400">Track admin actions such as user edits, password resets, company changes, and entry deletions.</p>
                                </div>
                                <div class="flex flex-wrap gap-2 no-pdf">
                                    <input id="adminAdminActivitySearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Filter by action, user, admin">
                                    <input id="adminAdminActivityFrom" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                    <input id="adminAdminActivityTo" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                    <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminAdminActivity()">Apply</button>
                                </div>
                            </div>
                            <div id="adminAdminActivityLogs" class="mt-4 space-y-3"></div>
                        </div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div class="admin-card rounded-3xl p-5">
                        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 class="admin-title text-2xl text-white">Global Search Results</h3>
                                <p class="mt-2 text-sm text-slate-400">Search across users, companies, vehicles, and entries from one place.</p>
                            </div>
                            <button type="button" class="no-pdf rounded-2xl border border-slate-700 px-4 py-2 font-bold text-slate-200" onclick="window.runAdminGlobalSearch()">Search</button>
                        </div>
                        <div id="adminGlobalSearchResults" class="mt-4 space-y-4"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">System Health</h3>
                        <p class="mt-2 text-sm text-slate-400">Server uptime, database connectivity, and API responsiveness.</p>
                        <div id="adminHealthStatus" class="mt-4 space-y-3"></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-3">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Security Monitor</h3>
                        <p class="mt-2 text-sm text-slate-400">Failed logins, blocked attempts, and suspicious activity.</p>
                        <div id="adminSecuritySummary" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Data Storage Monitor</h3>
                        <p class="mt-2 text-sm text-slate-400">Approximate usage per user database.</p>
                        <div id="adminStorageList" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Vehicle Performance</h3>
                        <p class="mt-2 text-sm text-slate-400">Top vehicles ranked by trips, KM, and total amount.</p>
                        <div id="adminVehicleStats" class="mt-4 space-y-3"></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-2">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Route Analytics</h3>
                        <p class="mt-2 text-sm text-slate-400">Most-used routes, route-wise revenue, and route usage statistics.</p>
                        <div id="adminRouteAnalytics" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Smart Profit Analytics</h3>
                        <p class="mt-2 text-sm text-slate-400">Profit per trip, monthly profit, company profit, and overall system profit.</p>
                        <div id="adminProfitAnalytics" class="mt-4 space-y-3"></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_0.95fr]">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Driver / User Leaderboard</h3>
                        <p class="mt-2 text-sm text-slate-400">Rank users by total trips and total profit.</p>
                        <div id="adminLeaderboard" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Data Insights Panel</h3>
                        <p class="mt-2 text-sm text-slate-400">Peak trip hours, active users, active company, and most-used route.</p>
                        <div id="adminInsightsPanel" class="mt-4 space-y-3"></div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 class="admin-title text-2xl text-white">Automatic Email Reports</h3>
                                <p class="mt-2 text-sm text-slate-400">Preview daily, weekly, or monthly system summaries for admin delivery.</p>
                            </div>
                            <button type="button" class="no-pdf rounded-2xl border border-slate-700 px-4 py-2 font-bold text-slate-200" onclick="window.loadAdminEmailPreview()">Preview</button>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2 no-pdf">
                            <select id="adminEmailRange" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                            <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.sendAdminEmailReport()">Generate</button>
                        </div>
                        <div id="adminEmailReportPreview" class="mt-4 space-y-3"></div>
                    </div>
                </div>
            </section>

            <section id="admin-section-announcements" class="admin-section">
                <div class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div class="admin-card rounded-3xl p-5">
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <h3 class="admin-title text-2xl text-white">Announcements / Notices</h3>
                                <p class="mt-2 text-sm text-slate-400">Create targeted multilingual notices for all users, selected users, or selected company users.</p>
                            </div>
                            <span class="admin-badge admin-badge-orange">User-facing notices</span>
                        </div>
                        <div class="mt-5 space-y-4">
                            <input id="announcementTitle" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Announcement title">
                            <textarea id="announcementMessage" class="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Default announcement message"></textarea>
                            <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Language</label>
                                    <select id="announcementLanguage" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                        <option value="en">English</option>
                                        <option value="gu">Gujarati</option>
                                        <option value="hi">Hindi</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Target Users</label>
                                    <select id="announcementTargetType" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" onchange="window.handleAnnouncementTargetChange()">
                                        <option value="all">All Users</option>
                                        <option value="selected_users">Selected Users</option>
                                        <option value="selected_company_users">Selected Company Users</option>
                                    </select>
                                </div>
                            </div>
                            <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Start Date / Time</label>
                                    <input id="announcementStartsAt" type="datetime-local" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                </div>
                                <div>
                                    <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">End Date / Time</label>
                                    <input id="announcementExpiresAt" type="datetime-local" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                </div>
                            </div>
                            <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Status</label>
                                    <select id="announcementStatus" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                                <label class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 mt-7"><input id="announcementActive" type="checkbox" checked class="h-5 w-5 accent-orange-500"><span class="font-bold text-slate-200">Visible to users</span></label>
                            </div>
                            <div id="announcementUserSelectorWrap" class="hidden">
                                <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Selected Users</label>
                                <select id="announcementTargetUsers" multiple class="min-h-[160px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></select>
                            </div>
                            <div id="announcementCompanySelectorWrap" class="hidden">
                                <label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Selected Company Users</label>
                                <select id="announcementTargetCompanies" multiple class="min-h-[160px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></select>
                            </div>
                            <div class="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                                <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Optional Translations</div>
                                <div class="mt-4 grid gap-4 md:grid-cols-3">
                                    <div class="space-y-2">
                                        <div class="text-sm font-bold text-slate-200">English</div>
                                        <input id="announcementTitleEn" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="English title">
                                        <textarea id="announcementMessageEn" class="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="English message"></textarea>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="text-sm font-bold text-slate-200">Gujarati</div>
                                        <input id="announcementTitleGu" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="Gujarati title">
                                        <textarea id="announcementMessageGu" class="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="Gujarati message"></textarea>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="text-sm font-bold text-slate-200">Hindi</div>
                                        <input id="announcementTitleHi" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="Hindi title">
                                        <textarea id="announcementMessageHi" class="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none" placeholder="Hindi message"></textarea>
                                    </div>
                                </div>
                            </div>
                            <input id="announcementId" type="hidden">
                            <div class="flex flex-wrap gap-2 no-pdf">
                                <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.saveAnnouncement()">Save Announcement</button>
                                <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.resetAnnouncementForm()">Clear</button>
                            </div>
                        </div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Announcement History</h3>
                        <p class="mt-2 text-sm text-slate-400">View active, expired, and targeted notices with their delivery settings.</p>
                        <div id="adminAnnouncementsList" class="mt-5 space-y-3"></div>
                    </div>
                </div>
            </section>

            <section id="admin-section-settings" class="admin-section">
                <div class="grid gap-4 xl:grid-cols-2">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Admin Session</h3>
                        <p class="mt-2 text-sm text-slate-400">Admin authentication stays separate from normal user login.</p>
                        <div class="mt-5 space-y-3">
                            <div class="admin-badge admin-badge-orange">Protected admin routes</div>
                            <div class="admin-badge admin-badge-slate">Current admin: <span id="adminSettingsUser" class="ml-1">admin</span></div>
                            <div class="admin-badge admin-badge-emerald">User system remains unchanged</div>
                        </div>
                        <div class="mt-6 flex flex-wrap gap-2 no-pdf">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.refreshAdminData()">Refresh Admin Data</button>
                            <button type="button" class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 font-bold text-rose-200" onclick="window.logoutAdmin()">Logout Admin</button>
                        </div>
                        <div class="mt-8 border-t border-slate-800 pt-6">
                            <h4 class="admin-title text-xl text-white">Feature Controls</h4>
                            <p class="mt-2 text-sm text-slate-400">Enable or disable signup, maintenance mode, and user-side PDF/Excel exports.</p>
                            <div class="mt-4 space-y-3">
                                <label class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"><span class="font-bold text-slate-200">Enable Signup</span><input id="featureSignupToggle" type="checkbox" class="h-5 w-5 accent-orange-500"></label>
                                <label class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"><span class="font-bold text-slate-200">Enable PDF Download</span><input id="featurePdfToggle" type="checkbox" class="h-5 w-5 accent-orange-500"></label>
                                <label class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"><span class="font-bold text-slate-200">Enable Excel Export</span><input id="featureExcelToggle" type="checkbox" class="h-5 w-5 accent-orange-500"></label>
                                <label class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"><span class="font-bold text-slate-200">Enable Maintenance Mode</span><input id="featureMaintenanceToggle" type="checkbox" class="h-5 w-5 accent-orange-500"></label>
                            </div>
                            <div class="mt-4 no-pdf">
                                <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.saveAdminFeatures()">Save Feature Controls</button>
                            </div>
                        </div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">System Controls</h3>
                        <p class="mt-2 text-sm text-slate-400">Quick visibility into maintenance state, health, and security counters.</p>
                        <div id="adminSettingsSnapshot" class="mt-5 space-y-3"></div>
                    </div>
                </div>
                <div class="mt-4 grid gap-4 xl:grid-cols-2">
                    <div class="admin-card rounded-3xl p-5">
                        <h3 class="admin-title text-2xl text-white">Backup and Restore</h3>
                        <p class="mt-2 text-sm text-slate-400">Create a full system backup or restore from a previously exported JSON file.</p>
                        <div class="mt-4 flex flex-col gap-3 no-pdf">
                            <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.downloadAdminBackup()">Download Full Backup</button>
                            <input id="adminBackupFile" type="file" accept=".json,application/json" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                            <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.restoreAdminBackup()">Restore Backup</button>
                        </div>
                    </div>
                    <div class="admin-card rounded-3xl p-5">
                        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h3 class="admin-title text-2xl text-white">System Error Logs</h3>
                                <p class="mt-2 text-sm text-slate-400">API errors, database errors, and login failures recorded by the system.</p>
                            </div>
                            <div class="flex flex-wrap gap-2 no-pdf">
                                <input id="adminErrorSearch" type="search" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Filter by source or message">
                                <input id="adminErrorFrom" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                <input id="adminErrorTo" type="date" class="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none">
                                <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.loadAdminErrors()">Apply</button>
                            </div>
                        </div>
                        <div id="adminErrorLogs" class="mt-4 space-y-3"></div>
                    </div>
                </div>
            </section>
        </main>
    </div>

    <div id="adminToast" class="admin-toast fixed bottom-4 right-4 z-[80] rounded-2xl border border-orange-400/20 bg-slate-950/95 px-5 py-4 font-bold text-white shadow-2xl"></div>

    <div id="adminUserModal" class="admin-modal fixed inset-0 z-[90] items-center justify-center bg-slate-950/70 p-4">
        <div class="admin-card w-full max-w-4xl rounded-3xl p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h3 class="admin-title text-3xl text-white">User Details</h3>
                    <p id="adminUserModalCopy" class="mt-2 text-sm text-slate-400">View and edit account information.</p>
                </div>
                <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200 no-pdf" onclick="window.closeAdminUserModal()">Close</button>
            </div>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Name</label><input id="adminUserName" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Mobile Number</label><input id="adminUserMobile" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Vehicle Number</label><input id="adminUserVehicle" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Email</label><input id="adminUserEmail" type="email" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
            </div>
            <div class="mt-4 grid gap-4 md:grid-cols-3">
                <div class="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Companies</div><div id="adminUserCompanyCount" class="mt-3 text-3xl font-black text-white">0</div></div>
                <div class="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Entries</div><div id="adminUserEntryCount" class="mt-3 text-3xl font-black text-white">0</div></div>
                <div class="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Status</div><div id="adminUserStatusText" class="mt-3 text-2xl font-black text-white">Active</div></div>
            </div>
            <div class="mt-5">
                <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Recent Entries</div>
                <div id="adminUserRecentEntries" class="mt-3 space-y-3"></div>
            </div>
            <div class="mt-5 flex justify-end gap-2 no-pdf">
                <button id="adminUserResetPasswordBtn" type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200" onclick="window.resetAdminUserPassword()">Reset Password</button>
                <button id="adminUserSaveBtn" type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.saveAdminUser()">Save User</button>
            </div>
        </div>
    </div>

    <div id="adminCompanyModal" class="admin-modal fixed inset-0 z-[90] items-center justify-center bg-slate-950/70 p-4">
        <div class="admin-card w-full max-w-2xl rounded-3xl p-5">
            <div class="flex items-start justify-between gap-3">
                <div>
                    <h3 class="admin-title text-3xl text-white">Company Details</h3>
                    <p class="mt-2 text-sm text-slate-400">Update company name and rate.</p>
                </div>
                <button type="button" class="rounded-2xl border border-slate-700 px-4 py-3 font-bold text-slate-200 no-pdf" onclick="window.closeAdminCompanyModal()">Close</button>
            </div>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Company Name</label><input id="adminCompanyName" type="text" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
                <div><label class="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-400">Rate</label><input id="adminCompanyRate" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"></div>
            </div>
            <div class="mt-5 flex justify-end gap-2 no-pdf">
                <button type="button" class="rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white" onclick="window.saveAdminCompany()">Save Company</button>
            </div>
        </div>
    </div>

    <script src="/admin-panel.js?v=${PWA_ASSET_VERSION}"></script>
</body>
</html>
        `;
        res.send(pageHtml);
    });

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
        const pageHtml = `
<!DOCTYPE html>
<html lang="gu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Tripset</title>
    <link rel="manifest" href="/manifest.json?v=${PWA_ASSET_VERSION}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <link rel="shortcut icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
    <link rel="apple-touch-icon" href="/icon-192.png?v=${PWA_ASSET_VERSION}">
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
            <input id="password" type="password" autocomplete="current-password" class="login-input" placeholder="Password">
            <button type="button" class="login-btn" onclick="doLogin()">Login</button>
            <p id="errorMsg" class="error-msg"></p>
            <a id="loginSignupLink" href="/signup" class="block text-sm font-bold text-orange-600 mt-3 hover:text-orange-700">New user? Sign up</a>
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
                    credentials: 'include',
                    body: JSON.stringify({ username: username, password: password })
                });
                if (!res.ok) {
                    var message = 'Invalid login';
                    try {
                        var errData = await res.json();
                        if (errData && errData.error) message = String(errData.error);
                    } catch (e) {}
                    showError(message);
                    return;
                }
                p.value = '';
                window.location.href = '/';
            } catch (e) {
                showError('Login failed');
            }
        }
        async function syncSignupAvailability() {
            try {
                var res = await fetch('/api/public/config', { cache: 'no-store' });
                if (!res.ok) return;
                var cfg = await res.json();
                if (cfg && cfg.features && cfg.features.signupEnabled === false) {
                    var link = document.getElementById('loginSignupLink');
                    if (link) {
                        link.textContent = 'Signup currently disabled';
                        link.removeAttribute('href');
                        link.style.opacity = '0.65';
                        link.style.cursor = 'default';
                        link.style.pointerEvents = 'none';
                    }
                }
            } catch (e) {}
        }
        document.getElementById('password').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doLogin();
        });
        document.getElementById('username').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doLogin();
        });
        syncSignupAvailability();
    </script>
</body>
</html>
        `;
        res.send(pageHtml);
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
        const pageHtml = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <title>Tripset (Invoice Build)</title>
        <meta name="description" content="Tripset is a simple and easy to use trip management system for your business.">
        <link rel="manifest" href="/manifest.json?v=${PWA_ASSET_VERSION}" />
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
<link rel="shortcut icon" href="/favicon.ico?v=${PWA_ASSET_VERSION}">
<meta name="theme-color" content="#F97316">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="apple-touch-icon" href="/icon-192.png?v=${PWA_ASSET_VERSION}">
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
            *, *::before, *::after { animation: none !important; transition: none !important; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
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
        animation: dashIn 0.6s ease forwards !important;
        transition: all 0.25s ease !important;
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
        animation: numberPop 0.35s ease !important;
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

        <!-- Login Screen -->
        <div id="loginScreen" style="position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100% !important;height:100% !important;z-index:2147483646 !important;display:flex !important;visibility:visible !important;opacity:1 !important;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%) !important;align-items:center !important;justify-content:center !important;padding:1rem !important;">
            <div style="background:white;border-radius:1.5rem;padding:2rem 2.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.4);max-width:22rem;width:100%;text-align:center;">
                <h2 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin-bottom:0.5rem;">Tripset</h2>
                <p style="font-size:0.875rem;color:#64748b;margin-bottom:1.5rem;" data-i18n="login.required">Login required</p>
                <input id="loginUsername" type="text" inputmode="numeric" autocomplete="username" placeholder="Mobile number" data-i18n-placeholder="login.username" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password" data-i18n-placeholder="login.password" style="width:100%;padding:0.75rem 1rem;border:2px solid #e2e8f0;border-radius:0.75rem;margin-bottom:1rem;font-size:1rem;box-sizing:border-box;">
                <button type="button" onclick="window.doLogin()" style="width:100%;padding:0.75rem 1.5rem;background:linear-gradient(135deg,#F97316,#EA580C);color:white;font-weight:700;border-radius:0.75rem;border:none;cursor:pointer;font-size:1rem;" data-i18n="login.button">Login</button>
                <a href="/signup" style="display:block;margin-top:0.7rem;font-size:0.875rem;font-weight:700;color:#ea580c;">New user? Sign up</a>
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
                    login.style.setProperty('pointer-events', 'none', 'important');
                    console.log('✅ Login screen hidden (will show if not auth)');
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
                    <button id="btn-notices" data-tab="notices" onclick="window.showTab('notices')" class="nav-btn nav-btn-inactive" data-i18n="nav.notices">Notices</button>
                    <button id="btn-settings" data-tab="settings" onclick="window.showTab('settings')" class="nav-btn nav-btn-inactive" data-i18n="nav.settings">Settings</button>

                    <button onclick="window.toggleDarkMode()" 
        class="nav-btn nav-btn-inactive">
    🌙
</button>

                </div>
                <div class="hidden md:flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200">
                    <span class="uppercase tracking-wide text-slate-400">Profile</span>
                    <span data-user-display-name>Kamlesh</span>
                </div>
            </div>
        </nav>
        <div id="mobileNavBackdrop" onclick="window.toggleMobileNav(false)"></div>
        <aside id="mobileNavMenu">
            <div class="flex items-center justify-between mb-4">
                <div class="text-lg font-extrabold text-orange-500 uppercase italic tracking-tight">Tripset</div>
                <button type="button" class="nav-btn nav-btn-inactive" onclick="window.toggleMobileNav(false)">✕</button>
            </div>
            <div class="mb-4 text-xs font-bold text-slate-300">Profile: <span data-user-display-name>Kamlesh</span></div>
            <div class="flex flex-col gap-2">
                <button data-tab="home" onclick="window.showTab('home')" class="nav-btn nav-btn-active" data-i18n="nav.home">Home</button>
                <button data-tab="dashboard" onclick="window.showTab('dashboard')" class="nav-btn nav-btn-inactive" data-i18n="nav.dashboard">Dashboard</button>
                <button data-tab="enter-detail" onclick="window.showTab('enter-detail')" class="nav-btn nav-btn-inactive" data-i18n="nav.entryForm">Details</button>
                <button data-tab="entries" onclick="window.showTab('entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.entries">Entries</button>
                <button data-tab="company-entries" onclick="window.showTab('company-entries')" class="nav-btn nav-btn-inactive" data-i18n="nav.company">Company</button>
                <button data-tab="notices" onclick="window.showTab('notices')" class="nav-btn nav-btn-inactive" data-i18n="nav.notices">Notices</button>
                <button data-tab="settings" onclick="window.showTab('settings')" class="nav-btn nav-btn-inactive" data-i18n="nav.settings">Settings</button>
                <button onclick="window.toggleDarkMode()" class="nav-btn nav-btn-inactive">🌙</button>
            </div>
        </aside>
          

        <div class="max-w-7xl mx-auto p-4 md:p-8">
        <div id="announcementPanel" class="hidden mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm">
            <div class="flex items-center justify-between gap-3">
                <div class="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Announcements</div>
                <button type="button" onclick="window.openNoticeModal(true)" class="rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">View All</button>
            </div>
            <div id="announcementList" class="mt-3 space-y-3"></div>
        </div>
        <div id="noticeModal" class="hidden fixed inset-0 z-[80] bg-slate-950/60 p-4" onclick="if(event.target===this) window.closeNoticeModal()">
            <div class="mx-auto flex min-h-full max-w-2xl items-center justify-center">
                <div class="w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Notice Center</div>
                            <h3 class="mt-2 text-2xl font-black text-slate-900">Announcements</h3>
                            <p class="mt-2 text-sm font-medium text-slate-500">Active multilingual notices for your account.</p>
                        </div>
                        <button type="button" onclick="window.closeNoticeModal()" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Close</button>
                    </div>
                    <div id="noticeModalList" class="mt-5 space-y-3"></div>
                </div>
            </div>
        </div>
        <div id="notices" class="tab-content max-w-4xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div class="text-xs font-black uppercase tracking-[0.14em] text-amber-700" data-i18n="notices.kicker">Notice Center</div>
                        <h2 class="mt-2 text-2xl font-extrabold text-slate-900" data-i18n="notices.title">Announcements & Notices</h2>
                        <p class="mt-2 text-sm font-medium text-slate-500" data-i18n="notices.subtitle">View active updates from the admin in your selected language.</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" onclick="window.loadNotices(true)" class="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-700" data-i18n="notices.refresh">Refresh Notices</button>
                        <button type="button" onclick="window.openNoticeModal(true)" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600" data-i18n="notices.popup">Open Popup</button>
                    </div>
                </div>
                <div id="noticeSectionSummary" class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"></div>
                <div id="noticeSectionList" class="mt-5 space-y-3"></div>
            </div>
        </div>
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

            <div class="border-t border-slate-200 pt-5">
                <h3 class="text-sm font-black uppercase text-slate-700 mb-3">Invoice Defaults</h3>
                <div class="space-y-4">
                    <div>
                        <label class="text-xs font-bold uppercase text-slate-500">Company Logo URL</label>
                        <input type="text" id="invoiceLogoUrl" class="input-field" placeholder="/icon-512.png">
                    </div>
                    <div>
                        <label class="text-xs font-bold uppercase text-slate-500">Customer Name</label>
                        <input type="text" id="invoiceCustomerName" class="input-field" placeholder="Customer / Company Name">
                    </div>
                    <div>
                        <label class="text-xs font-bold uppercase text-slate-500">Customer Contact</label>
                        <input type="text" id="invoiceCustomerContact" class="input-field" placeholder="Phone / Email / Address">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold uppercase text-slate-500">Tax (%)</label>
                            <input type="number" id="invoiceTaxPercent" min="0" step="0.01" class="input-field" placeholder="0">
                        </div>
                        <div>
                            <label class="text-xs font-bold uppercase text-slate-500">Payment Status</label>
                            <select id="invoicePaymentStatus" class="input-field font-bold">
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Partially Paid">Partially Paid</option>
                                <option value="Unpaid">Unpaid</option>
                            </select>
                        </div>
                    </div>
                </div>
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
                <h3 class="text-lg font-extrabold mb-3 uppercase text-rose-700" data-i18n="settings.deleteAccountTitle">⚠ Delete Account</h3>
                <p id="deleteAccountHint" class="text-xs text-slate-500 mb-3" data-i18n="settings.deleteAccountHint">
                    Default login accounts cannot be deleted.
                </p>
                <button id="deleteAccountBtn"
                    onclick="window.openDeleteAccountModal()"
                    disabled
                    class="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition shadow-md opacity-60 cursor-not-allowed">
                    <span data-i18n="settings.deleteAccount">🗑 Delete Account</span>
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
                        <p class="text-sm text-slate-500 mt-1" data-i18n="invoice.modalHelp">Select month and generate invoice PDF.</p>
                    </div>
                    <button onclick="window.closeInvoiceModal()" class="text-slate-400 hover:text-slate-600 text-xl font-black">✖</button>
                </div>

                <div class="mt-5">
                    <label class="text-xs font-bold uppercase text-slate-500 block mb-2" data-i18n="invoice.selectMonth">Select Month</label>
                    <input type="month" id="invoiceMonthModal" class="input-field font-bold">
                </div>

                <div class="mt-6">
                <button data-feature-control="pdf" onclick="window.generateInvoiceFromModal()"
                        class="w-full py-2.5 rounded-lg font-bold bg-orange-500 hover:bg-orange-600 text-white">
                        <span data-i18n="dashboard.generateInvoicePdf">Generate Invoice PDF</span>
                    </button>
                </div>
    </div>
</div>

         <div id="dashboard" class="tab-content mt-6">
         <div class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        <span>User</span>
        <span data-user-display-name>Kamlesh</span>
    </div>

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
                <button data-feature-control="pdf" onclick="window.generateInvoice()" class="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md">
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
<div id="invoiceContainer" class="hidden" style="position:fixed;left:-200vw;top:0;pointer-events:none;">
  <div id="invoiceContent" style="width:190mm;min-height:277mm;margin:0 auto;background:#fff;color:#111;padding:0;box-sizing:border-box;font:12px/1.45 'Segoe UI',Arial,sans-serif;"></div>
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
                    <button data-feature-control="pdf" onclick="window.downloadPDF('entries')" class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold shadow-md">📥 <span data-i18n="common.pdf">PDF</span></button>
                    <button data-feature-control="excel" onclick="window.exportExcel()" 
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
                <div class="p-4 md:p-6 bg-indigo-900 text-white">
                    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                        <h2 class="text-xl font-extrabold uppercase" data-i18n="company.title">Company Entry Report</h2>
                        <div class="flex items-center gap-2">
                            <input type="month" id="monthFilter" class="px-3 py-2 rounded-lg text-black font-bold">
                            <button onclick="window.applyMonthFilter()" class="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold">
                                <span data-i18n="common.apply">Apply</span>
                            </button>
                        </div>
                    </div>
                    <div class="mt-3 overflow-x-auto no-scrollbar">
                        <div class="inline-flex min-w-max items-center gap-2 pb-1">
                            <button data-feature-control="pdf" onclick="window.downloadPDF('company-entries')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">📁 <span data-i18n="common.pdf">PDF</span></button>
                            <button data-feature-control="excel" onclick="window.exportExcel()" class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-md">📥 <span data-i18n="common.excel">Excel</span></button>
                        </div>
                    </div>
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

        <div id="toast" class="hidden fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-xl shadow-2xl font-bold" style="z-index:2147483647 !important;"></div>

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

        <!-- Delete Account Modal -->
        <div id="deleteAccountModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-rose-100">
                <h2 class="text-xl font-black mb-2 text-rose-700 uppercase" data-i18n="settings.deleteAccountTitle">⚠ Delete Account</h2>
                <p class="text-sm text-slate-600 mb-4" data-i18n="settings.deleteAccountWarning">
                    This action is permanent. All your data will be deleted from the database.
                </p>

                <label class="flex items-start gap-2 p-3 rounded-lg border border-slate-200 mb-3">
                    <input id="deleteTermsCheckbox" type="checkbox" class="mt-1 h-4 w-4">
                    <span class="text-sm font-semibold text-slate-700" data-i18n="settings.deleteStep1">
                        I accept Terms & Conditions and want to continue.
                    </span>
                </label>

                <label class="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50">
                    <input id="deleteFinalCheckbox" type="checkbox" class="mt-1 h-4 w-4">
                    <span class="text-sm font-black text-rose-700">Yes, I want to delete my account</span>
                </label>

                <div class="flex gap-3 mt-5">
                    <button onclick="window.closeDeleteAccountModal()"
                        class="flex-1 py-2 rounded-lg font-bold border border-slate-300 text-slate-700"
                        data-i18n="common.cancel">Cancel</button>
                    <button id="confirmDeleteAccountBtn"
                        onclick="window.confirmDeleteAccount()"
                        disabled
                        class="flex-1 py-2 rounded-lg font-bold bg-rose-600 text-white opacity-60 cursor-not-allowed">
                        <span data-i18n="settings.deleteAccount">🗑 Delete Account</span>
                    </button>
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
        window.authProfile = {
            user: 'kamlesh',
            dbFolder: 'kamlesh',
            displayName: 'Kamlesh',
            isDynamicUser: false,
            canDeleteAccount: false
        };
        window.currentUserDisplayName = 'Kamlesh';

        function refreshDeleteAccountUI() {
            var deleteBtn = document.getElementById('deleteAccountBtn');
            var deleteHint = document.getElementById('deleteAccountHint');
            var allowed = !!(window.authProfile && window.authProfile.canDeleteAccount);
            if (deleteBtn) {
                deleteBtn.disabled = !allowed;
                if (allowed) {
                    deleteBtn.classList.remove('opacity-60', 'cursor-not-allowed');
                } else {
                    deleteBtn.classList.add('opacity-60', 'cursor-not-allowed');
                }
            }
            if (deleteHint) {
                deleteHint.style.display = allowed ? 'none' : 'block';
            }
        }

        function setAuthenticatedIdentity(status) {
            var displayName = String((status && status.displayName) || window.currentUserDisplayName || 'Kamlesh').trim() || 'Kamlesh';
            window.currentUserDisplayName = displayName;
            window.authProfile = {
                user: String((status && status.user) || ''),
                dbFolder: String((status && status.dbFolder) || ''),
                displayName: displayName,
                isDynamicUser: !!(status && status.isDynamicUser),
                canDeleteAccount: !!(status && status.canDeleteAccount)
            };
            if (i18nResources && i18nResources.en && i18nResources.en.translation && i18nResources.en.translation.home) {
                i18nResources.en.translation.home.welcome = 'Welcome ' + displayName;
            }
            if (i18nResources && i18nResources.gu && i18nResources.gu.translation && i18nResources.gu.translation.home) {
                i18nResources.gu.translation.home.welcome = 'સ્વાગત છે ' + displayName;
            }
            if (i18nResources && i18nResources.hi && i18nResources.hi.translation && i18nResources.hi.translation.home) {
                i18nResources.hi.translation.home.welcome = 'स्वागत है ' + displayName;
            }
            document.querySelectorAll('[data-user-display-name]').forEach(function(el) {
                el.textContent = displayName;
            });
            refreshDeleteAccountUI();
        }

        function setDisplayImportant(el, value) {
            if (!el) return;
            el.style.setProperty('display', value, 'important');
            if (String(value).toLowerCase() === 'none') {
                el.style.setProperty('pointer-events', 'none', 'important');
            } else {
                el.style.setProperty('pointer-events', 'auto', 'important');
            }
        }

        function setVisibilityImportant(el, value) {
            if (!el) return;
            el.style.setProperty('visibility', value, 'important');
            if (String(value).toLowerCase() === 'hidden') {
                el.style.setProperty('pointer-events', 'none', 'important');
            } else {
                el.style.setProperty('pointer-events', 'auto', 'important');
            }
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
                    nav: { home: "Home", dashboard: "Dashboard", entryForm: "Details", entries: "Entries", company: "Company", notices: "Notices", settings: "Settings" },
                    login: { required: "Login required", username: "Mobile number", password: "Password", button: "Login", authorized: "Authorized user only" },
                    install: { title: "Install Tripset", subtitle: "Install app for better experience", install: "Install", later: "Later" },
                    settings: {
                        title: "Settings", companyName: "Company Name", rate: "Rate (₹ per KM)", language: "Language",
                        save: "Save Settings 💾", backupTitle: "Backup & Restore", downloadBackup: "📥 Download Backup",
                        restoreLabel: "Restore Backup (JSON File)", restoreBackup: "📤 Restore Backup",
                        invoiceTitle: "Invoice", invoiceGenerator: "🧾 Invoice Generator", invoiceHelp: "Select month and download invoice PDF.",
                        deleteAccountTitle: "Delete Account", deleteAccountHint: "Default login accounts cannot be deleted.",
                        deleteAccountWarning: "This action is permanent. All your data will be deleted from the database.",
                        deleteStep1: "I accept Terms & Conditions and want to continue.",
                        deleteAccount: "🗑 Delete Account",
                        logout: "🚪 Logout"
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
                    home: { subtitle: "Best Trip Management System", startEntry: "Start New Entry ➔", welcome: "Welcome Kamlesh" },
                    notices: {
                        kicker: "Notice Center",
                        title: "Announcements & Notices",
                        subtitle: "View active updates from the admin in your selected language.",
                        refresh: "Refresh Notices",
                        popup: "Open Popup",
                        empty: "No active announcements right now.",
                        count_one: "{{count}} active notice",
                        count_other: "{{count}} active notices"
                    },
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
                        modalTitle: "🧾 Invoice Generator", modalHelp: "Select month and generate invoice PDF.", selectMonth: "Select Month",
                        monthlyTripInvoice: "Monthly Trip Invoice", invoiceMonthLabel: "Invoice Month:", generatedLabel: "Generated:",
                        totals: "Totals", expenseBreakdown: "Expense Breakdown", authorizedSignatory: "Authorised Signatory", thankYou: "Thank you."
                    },
                    edit: { title: "Edit Trip", update: "Update Trip 🔄" },
                    common: { cancel: "Cancel", downloadPdf: "Download PDF", pdf: "PDF", excel: "Excel", apply: "Apply" },
                    chart: { totalKm: "Total KM", revenue: "Revenue ₹", trips: "Trips", profit: "Profit ₹" },
                    table: { otherPlus: "Other:+₹", cngMinus: "CNG:-₹", expMinus: "Exp:-₹", editTitle: "Edit", deleteTitle: "Delete", tripsPrefix: "Trips: ", grandTotal: "Grand Total" },
                    status: { online: "✅ Back online!", offline: "📡 You're offline. Some features may be limited." },
                    toast: {
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
                        invoiceDownloaded: "Invoice downloaded ✅", invoiceGenerationFailed: "Invoice generation failed",
                        deleteAccountNotAllowed: "Default login accounts cannot be deleted",
                        deleteAccountStep1: "Please accept Terms & Conditions first",
                        deleteAccountStep2: "Please confirm: Yes, I want to delete my account",
                        deleteAccountSuccess: "Account deleted permanently",
                        deleteAccountFailed: "Failed to delete account"
                    }
                }
            },
            gu: {
                translation: {
                    nav: { home: "હોમ", dashboard: "ડેશબોર્ડ", entryForm: "વિગત", entries: "એન્ટ્રી", company: "કંપની", notices: "નોટિસ", settings: "સેટિંગ્સ" },
                    login: { required: "લૉગિન જરૂરી છે", username: "મોબાઇલ નંબર", password: "પાસવર્ડ", button: "લૉગિન", authorized: "માત્ર અધિકૃત યુઝર" },
                    install: { title: "Tripset ઇન્સ્ટોલ કરો", subtitle: "સારો અનુભવ માટે એપ ઇન્સ્ટોલ કરો", install: "ઇન્સ્ટોલ", later: "પછી" },
                    settings: {
                        title: "સેટિંગ્સ", companyName: "કંપની નામ", rate: "રેટ (₹ પ્રતિ KM)", language: "ભાષા",
                        save: "સેટિંગ્સ સેવ કરો 💾", backupTitle: "બેકઅપ અને રિસ્ટોર", downloadBackup: "📥 બેકઅપ ડાઉનલોડ",
                        restoreLabel: "બેકઅપ રિસ્ટોર કરો (JSON ફાઇલ)", restoreBackup: "📤 બેકઅપ રિસ્ટોર",
                        invoiceTitle: "ઇન્વૉઇસ", invoiceGenerator: "🧾 ઇન્વૉઇસ જનરેટર", invoiceHelp: "મહિનો પસંદ કરો અને PDF ડાઉનલોડ કરો.",
                        deleteAccountTitle: "એકાઉન્ટ ડિલીટ", deleteAccountHint: "ડિફોલ્ટ લૉગિન એકાઉન્ટ ડિલીટ કરી શકાતા નથી.",
                        deleteAccountWarning: "આ ક્રિયા કાયમી છે. તમારું બધું ડેટા ડેટાબેઝમાંથી ડિલીટ થઈ જશે.",
                        deleteStep1: "હું Terms & Conditions સ્વીકારું છું અને આગળ વધવા માંગું છું.",
                        deleteAccount: "🗑 એકાઉન્ટ ડિલીટ",
                        logout: "🚪 લૉગઆઉટ"
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
                    home: { subtitle: "સર્વશ્રેષ્ઠ ટ્રિપ મેનેજમેન્ટ સિસ્ટમ", startEntry: "નવી એન્ટ્રી શરૂ કરો ➔", welcome: "સ્વાગત છે કમલેશ" },
                    notices: {
                        kicker: "નોટિસ સેન્ટર",
                        title: "જાહેરાતો અને નોટિસ",
                        subtitle: "તમારી પસંદ કરેલી ભાષામાં એડમિન અપડેટ જુઓ.",
                        refresh: "નોટિસ રિફ્રેશ કરો",
                        popup: "પોપઅપ ખોલો",
                        empty: "હાલ કોઈ સક્રિય જાહેરાત નથી.",
                        count_one: "{{count}} સક્રિય નોટિસ",
                        count_other: "{{count}} સક્રિય નોટિસ"
                    },
                    entry: {
                        title: "ટ્રિપની વિગત ભરો", date: "તારીખ", pickupTime: "પિકઅપ સમય", dropTime: "ડ્રોપ સમય",
                        tripId: "ટ્રિપ ID", tripIdPlaceholder: "મેન્યુઅલ ID", pickup: "પિકઅપ", pickupPlaceholder: "પિકઅપ પોઈન્ટ",
                        drop: "ડ્રોપ", dropPlaceholder: "ડ્રોપ પોઈન્ટ", person: "માણસો", rate: "રેટ",
                        otherPlus: "અન્ય (+)", otherExpense: "અન્ય ખર્ચ (-)", totalAmount: "કુલ રકમ:", save: "MongoDB માં સેવ કરો 💾"
                    },
                    entries: { title: "એન્ટ્રી લિસ્ટ (જૂની થી નવી)", route: "રૂટ", time: "સમય", otherDetails: "અન્ય વિગતો", total: "ટોટલ", action: "ક્રિયા" },
                    company: { title: "કંપની એન્ટ્રી રિપોર્ટ", totalRate: "ટોટલ (KM × Rate)" },
                    invoice: {
                        modalTitle: "🧾 ઇન્વૉઇસ જનરેટર", modalHelp: "મહિનો પસંદ કરો અને ઇન્વૉઇસ PDF બનાવો.", selectMonth: "મહિનો પસંદ કરો",
                        monthlyTripInvoice: "માસિક ટ્રિપ ઇન્વૉઇસ", invoiceMonthLabel: "ઇન્વૉઇસ મહિનો:", generatedLabel: "બનાવેલ:",
                        totals: "કુલ", expenseBreakdown: "ખર્ચ વિગત", authorizedSignatory: "અધિકૃત સહી", thankYou: "આભાર."
                    },
                    edit: { title: "ટ્રિપ એડિટ કરો", update: "ટ્રિપ અપડેટ કરો 🔄" },
                    common: { cancel: "રદ્દ કરો", downloadPdf: "PDF ડાઉનલોડ", pdf: "PDF", excel: "Excel", apply: "લાગુ કરો" },
                    chart: { totalKm: "કુલ KM", revenue: "આવક ₹", trips: "ટ્રિપ", profit: "નફો ₹" },
                    table: { otherPlus: "અન્ય:+₹", cngMinus: "CNG:-₹", expMinus: "ખર્ચ:-₹", editTitle: "એડિટ", deleteTitle: "ડિલીટ", tripsPrefix: "ટ્રિપ: ", grandTotal: "ગ્રાન્ડ ટોટલ" },
                    status: { online: "✅ ફરી ઑનલાઇન", offline: "📡 તમે ઑફલાઇન છો. કેટલાક ફીચર્સ મર્યાદિત હોઈ શકે." },
                    toast: {
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
                        invoiceDownloaded: "ઇન્વૉઇસ ડાઉનલોડ થયું ✅", invoiceGenerationFailed: "ઇન્વૉઇસ જનરેશન નિષ્ફળ",
                        deleteAccountNotAllowed: "ડિફોલ્ટ લૉગિન એકાઉન્ટ ડિલીટ કરી શકાતા નથી",
                        deleteAccountStep1: "સૌ પ્રથમ Terms & Conditions સ્વીકારો",
                        deleteAccountStep2: "કૃપા કરીને કન્ફર્મ કરો: Yes, I want to delete my account",
                        deleteAccountSuccess: "એકાઉન્ટ કાયમી રીતે ડિલીટ થયું",
                        deleteAccountFailed: "એકાઉન્ટ ડિલીટ કરવામાં નિષ્ફળ"
                    }
                }
            },
            hi: {
                translation: {
                    nav: { home: "होम", dashboard: "डैशबोर्ड", entryForm: "विवरण", entries: "एंट्री", company: "कंपनी", notices: "नोटिस", settings: "सेटिंग्स" },
                    login: { required: "लॉगिन आवश्यक है", username: "मोबाइल नंबर", password: "पासवर्ड", button: "लॉगिन", authorized: "केवल अधिकृत उपयोगकर्ता" },
                    install: { title: "Tripset इंस्टॉल करें", subtitle: "बेहतर अनुभव के लिए ऐप इंस्टॉल करें", install: "इंस्टॉल", later: "बाद में" },
                    settings: {
                        title: "सेटिंग्स", companyName: "कंपनी नाम", rate: "रेट (₹ प्रति KM)", language: "भाषा",
                        save: "सेटिंग्स सेव करें 💾", backupTitle: "बैकअप और रिस्टोर", downloadBackup: "📥 बैकअप डाउनलोड",
                        restoreLabel: "बैकअप रिस्टोर करें (JSON फ़ाइल)", restoreBackup: "📤 बैकअप रिस्टोर",
                        invoiceTitle: "इनवॉइस", invoiceGenerator: "🧾 इनवॉइस जनरेटर", invoiceHelp: "महीना चुनें और PDF डाउनलोड करें।",
                        deleteAccountTitle: "अकाउंट डिलीट", deleteAccountHint: "डिफ़ॉल्ट लॉगिन अकाउंट डिलीट नहीं किए जा सकते।",
                        deleteAccountWarning: "यह कार्रवाई स्थायी है। आपका पूरा डेटा डेटाबेस से हट जाएगा।",
                        deleteStep1: "मैं Terms & Conditions स्वीकार करता/करती हूं और आगे बढ़ना चाहता/चाहती हूं।",
                        deleteAccount: "🗑 अकाउंट डिलीट",
                        logout: "🚪 लॉगआउट"
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
                    home: { subtitle: "सर्वश्रेष्ठ ट्रिप मैनेजमेंट सिस्टम", startEntry: "नई एंट्री शुरू करें ➔", welcome: "स्वागत है कमलेश" },
                    notices: {
                        kicker: "नोटिस सेंटर",
                        title: "घोषणाएं और नोटिस",
                        subtitle: "अपनी चुनी हुई भाषा में एडमिन अपडेट देखें।",
                        refresh: "नोटिस रिफ्रेश करें",
                        popup: "पॉपअप खोलें",
                        empty: "अभी कोई सक्रिय घोषणा नहीं है।",
                        count_one: "{{count}} सक्रिय नोटिस",
                        count_other: "{{count}} सक्रिय नोटिस"
                    },
                    entry: {
                        title: "ट्रिप विवरण भरें", date: "तारीख", pickupTime: "पिकअप समय", dropTime: "ड्रॉप समय",
                        tripId: "ट्रिप ID", tripIdPlaceholder: "मैनुअल ID", pickup: "पिकअप", pickupPlaceholder: "पिकअप पॉइंट",
                        drop: "ड्रॉप", dropPlaceholder: "ड्रॉप पॉइंट", person: "व्यक्ति", rate: "रेट",
                        otherPlus: "अन्य (+)", otherExpense: "अन्य खर्च (-)", totalAmount: "कुल राशि:", save: "MongoDB में सेव करें 💾"
                    },
                    entries: { title: "एंट्री सूची (पुरानी से नई)", route: "रूट", time: "समय", otherDetails: "अन्य विवरण", total: "कुल", action: "एक्शन" },
                    company: { title: "कंपनी एंट्री रिपोर्ट", totalRate: "कुल (KM × Rate)" },
                    invoice: {
                        modalTitle: "🧾 इनवॉइस जनरेटर", modalHelp: "महीना चुनें और इनवॉइस PDF बनाएं।", selectMonth: "महीना चुनें",
                        monthlyTripInvoice: "मासिक ट्रिप इनवॉइस", invoiceMonthLabel: "इनवॉइस महीना:", generatedLabel: "जनरेटेड:",
                        totals: "कुल", expenseBreakdown: "खर्च विवरण", authorizedSignatory: "अधिकृत हस्ताक्षर", thankYou: "धन्यवाद।"
                    },
                    edit: { title: "ट्रिप एडिट करें", update: "ट्रिप अपडेट करें 🔄" },
                    common: { cancel: "रद्द करें", downloadPdf: "PDF डाउनलोड", pdf: "PDF", excel: "Excel", apply: "लागू करें" },
                    chart: { totalKm: "कुल KM", revenue: "राजस्व ₹", trips: "ट्रिप", profit: "लाभ ₹" },
                    table: { otherPlus: "अन्य:+₹", cngMinus: "CNG:-₹", expMinus: "खर्च:-₹", editTitle: "एडिट", deleteTitle: "डिलीट", tripsPrefix: "ट्रिप: ", grandTotal: "ग्रैंड टोटल" },
                    status: { online: "✅ फिर से ऑनलाइन", offline: "📡 आप ऑफलाइन हैं। कुछ फीचर्स सीमित हो सकते हैं।" },
                    toast: {
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
                        invoiceDownloaded: "इनवॉइस डाउनलोड हो गई ✅", invoiceGenerationFailed: "इनवॉइस जनरेशन विफल",
                        deleteAccountNotAllowed: "डिफ़ॉल्ट लॉगिन अकाउंट डिलीट नहीं किए जा सकते",
                        deleteAccountStep1: "कृपया पहले Terms & Conditions स्वीकार करें",
                        deleteAccountStep2: "कृपया पुष्टि करें: Yes, I want to delete my account",
                        deleteAccountSuccess: "अकाउंट स्थायी रूप से डिलीट हो गया",
                        deleteAccountFailed: "अकाउंट डिलीट करने में विफल"
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
                window.appSettings = window.appSettings || {};
                window.appSettings.language = lang;
                var languageSelect = document.getElementById('languageSelect');
                if (languageSelect && languageSelect.value !== lang) languageSelect.value = lang;
                applyTranslations();
                window.startTypingEffect();
                if (window.currentTrips) renderTables(window.currentTrips);
                window.loadAppConfig(lang).catch(function() {});
                fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ language: lang })
                }).catch(function() {});
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
            var appContent = document.getElementById('appContent');
            if (!login) {
                console.error('🔐 showLoginScreen: loginScreen element not found!');
                return;
            }
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

        function getPreferredTabAfterUnlock() {
            var fromHash = String((window.location && window.location.hash) || '').replace(/^#/, '').trim();
            if (fromHash && document.getElementById(fromHash)) return fromHash;

            var pending = String(window.pendingTabAfterUnlock || '').trim();
            if (pending && document.getElementById(pending)) return pending;

            var saved = '';
            try {
                saved = String(localStorage.getItem('tripset_last_tab') || '').trim();
            } catch (e) {}
            if (saved && document.getElementById(saved)) return saved;

            var active = document.querySelector('.tab-content.active');
            if (active && active.id && active.id !== 'home') return String(active.id);

            return 'home';
        }

        function forceActivateTab(tabId) {
            var safeId = String(tabId || '').trim();
            if (!safeId) return false;
            var target = document.getElementById(safeId);
            if (!target) return false;

            document.querySelectorAll('.tab-content').forEach(function(el) {
                el.classList.remove('active');
            });
            target.classList.add('active');

            document.querySelectorAll('.nav-btn[data-tab]').forEach(function(btn) {
                btn.classList.remove('nav-btn-active');
                btn.classList.add('nav-btn-inactive');
            });
            document.querySelectorAll('.nav-btn[data-tab="' + safeId + '"]').forEach(function(btn) {
                btn.classList.remove('nav-btn-inactive');
                btn.classList.add('nav-btn-active');
            });

            window.pendingTabAfterUnlock = safeId;
            try {
                localStorage.setItem('tripset_last_tab', safeId);
            } catch (e) {}

            if (safeId === 'home' && window.startTypingEffect) window.startTypingEffect();
            if (safeId === 'entries' || safeId === 'company-entries' || safeId === 'dashboard') {
                if (window.fetchTrips) window.fetchTrips();
            }
            window.scrollTo({ top: 0, behavior: 'auto' });
            return true;
        }

        function navigateToTabSafely(tabId) {
            var safeId = String(tabId || '').trim();
            if (!safeId) return false;

            var switched = false;
            if (window.showTab) {
                try {
                    window.showTab(safeId);
                    switched = true;
                } catch (err) {
                    console.error('showTab failed, using force fallback:', err);
                }
            }

            var target = document.getElementById(safeId);
            if (!target || !target.classList.contains('active')) {
                switched = forceActivateTab(safeId) || switched;
            }
            return switched;
        }

        function showAuthenticatedApp(targetTab) {
            var login = document.getElementById('loginScreen');
            var appEl = document.getElementById('appContent');
            var splash = document.getElementById('splashScreen');

            if (login) {
                login.classList.remove('show');
                setDisplayImportant(login, 'none');
                setVisibilityImportant(login, 'hidden');
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
            navigateToTabSafely(targetTab || 'home');
        }

        window.getRate = function() { return (window.appSettings && window.appSettings.rate) || 21; };
        window.appFeatureFlags = { signupEnabled: true, pdfEnabled: true, excelEnabled: true };
        window.activeAnnouncements = [];
        window.allNotices = [];
        window.lastNoticeSignature = '';
        window.noticeModalDismissedKey = 'tripset_notice_modal_closed';

        window.applyAppFeatureToggles = function() {
            var flags = window.appFeatureFlags || { signupEnabled: true, pdfEnabled: true, excelEnabled: true };
            document.querySelectorAll('[data-feature-control="pdf"]').forEach(function(el) {
                el.style.display = flags.pdfEnabled === false ? 'none' : '';
            });
            document.querySelectorAll('[data-feature-control="excel"]').forEach(function(el) {
                el.style.display = flags.excelEnabled === false ? 'none' : '';
            });
        };

        function escapeNoticeText(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function formatNoticeDate(value) {
            if (!value) return '';
            try {
                return new Date(value).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                return String(value || '');
            }
        }

        function buildNoticeMarkup(items, compact) {
            return items.map(function(item) {
                var title = String((item && item.title) || '').trim();
                var message = String((item && item.message) || '').trim();
                var createdAt = formatNoticeDate(item && item.createdAt);
                return '' +
                    '<div class="rounded-xl border border-amber-200 bg-white/80 p-3">' +
                        (title ? '<div class="font-black text-amber-800">' + escapeNoticeText(title) + '</div>' : '') +
                        '<div class="mt-1 text-sm font-semibold text-slate-700">' + escapeNoticeText(message) + '</div>' +
                        (createdAt ? '<div class="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">' + escapeNoticeText(createdAt) + '</div>' : '') +
                    '</div>';
            }).join('');
        }

        function hasDismissedNoticeModal() {
            try {
                return sessionStorage.getItem(window.noticeModalDismissedKey) === '1';
            } catch (e) {
                return false;
            }
        }

        function setDismissedNoticeModal(value) {
            try {
                if (value) sessionStorage.setItem(window.noticeModalDismissedKey, '1');
                else sessionStorage.removeItem(window.noticeModalDismissedKey);
            } catch (e) {}
        }

        function isHomeAnnouncementContext() {
            var pathname = String((window.location && window.location.pathname) || '/').trim() || '/';
            var normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
            if (normalizedPath !== '/') return false;
            var homeTab = document.getElementById('home');
            return !!(homeTab && homeTab.classList.contains('active'));
        }

        window.syncAnnouncementVisibility = function() {
            var panel = document.getElementById('announcementPanel');
            var modal = document.getElementById('noticeModal');
            var canShow = isHomeAnnouncementContext();
            if (!canShow) {
                if (panel) panel.classList.add('hidden');
                if (modal) modal.classList.add('hidden');
            }
            return canShow;
        };

        window.renderNoticeModal = function() {
            var list = document.getElementById('noticeModalList');
            if (!list) return;
            var items = Array.isArray(window.allNotices) && window.allNotices.length ? window.allNotices : (Array.isArray(window.activeAnnouncements) ? window.activeAnnouncements : []);
            if (!items.length) {
                list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">' + escapeNoticeText(t('notices.empty')) + '</div>';
                return;
            }
            list.innerHTML = buildNoticeMarkup(items, false);
        };

        window.renderNoticeSection = function() {
            var summary = document.getElementById('noticeSectionSummary');
            var list = document.getElementById('noticeSectionList');
            if (!summary || !list) return;
            var items = Array.isArray(window.allNotices) && window.allNotices.length ? window.allNotices : (Array.isArray(window.activeAnnouncements) ? window.activeAnnouncements : []);
            var count = items.length;
            summary.textContent = count > 0
                ? t(count === 1 ? 'notices.count_one' : 'notices.count_other', { count: count })
                : t('notices.empty');
            if (!items.length) {
                list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">' + escapeNoticeText(t('notices.empty')) + '</div>';
                return;
            }
            list.innerHTML = buildNoticeMarkup(items, false);
        };

        window.openNoticeModal = function(forceOpen) {
            var modal = document.getElementById('noticeModal');
            if (!modal) return;
            if (!isHomeAnnouncementContext()) {
                modal.classList.add('hidden');
                return;
            }
            window.renderNoticeModal();
            if (!Array.isArray(window.activeAnnouncements) || !window.activeAnnouncements.length) return;
            if (!forceOpen && hasDismissedNoticeModal()) return;
            modal.classList.remove('hidden');
        };

        window.closeNoticeModal = function() {
            var modal = document.getElementById('noticeModal');
            if (modal) modal.classList.add('hidden');
            setDismissedNoticeModal(true);
        };

        window.renderAnnouncements = function() {
            var panel = document.getElementById('announcementPanel');
            var list = document.getElementById('announcementList');
            if (!panel || !list) return;
            var items = Array.isArray(window.activeAnnouncements) ? window.activeAnnouncements : [];
            if (!items.length) {
                panel.classList.add('hidden');
                list.innerHTML = '';
                window.renderNoticeModal();
                window.renderNoticeSection();
                return;
            }
            if (!window.syncAnnouncementVisibility()) {
                panel.classList.add('hidden');
                window.renderNoticeSection();
                return;
            }
            panel.classList.remove('hidden');
            list.innerHTML = buildNoticeMarkup(items.slice(0, 3), true);
            window.renderNoticeModal();
            window.renderNoticeSection();
        };

        window.loadAppConfig = async function(langOverride) {
            try {
                var currentLanguage = String(
                    langOverride
                    || (window.appSettings && window.appSettings.language)
                    || (window.i18next && window.i18next.language)
                    || getSavedLanguage()
                    || 'en'
                ).trim().toLowerCase();
                var query = '?lang=' + encodeURIComponent(currentLanguage);
                var res = await fetch('/api/app/config' + query, { credentials: 'include', cache: 'no-store' });
                if (!res.ok) throw new Error('Failed to load app config');
                var cfg = await res.json();
                var features = (cfg && cfg.features) || {};
                window.appFeatureFlags = {
                    signupEnabled: features.signupEnabled !== false,
                    pdfEnabled: features.pdfEnabled !== false,
                    excelEnabled: features.excelEnabled !== false
                };
                window.appSettings = window.appSettings || {};
                window.appSettings.language = String((cfg && cfg.language) || currentLanguage || 'en').trim().toLowerCase();
                window.activeAnnouncements = Array.isArray(cfg && cfg.announcements) ? cfg.announcements : [];
                window.allNotices = window.activeAnnouncements.slice();
                var nextNoticeSignature = window.activeAnnouncements.map(function(item) {
                    return [
                        String((item && item._id) || ''),
                        String((item && item.updatedAt) || ''),
                        String((item && item.language) || '')
                    ].join(':');
                }).join('|');
                if (window.lastNoticeSignature !== nextNoticeSignature) {
                    window.lastNoticeSignature = nextNoticeSignature;
                    setDismissedNoticeModal(false);
                }
            } catch (err) {
                console.error('loadAppConfig error:', err);
                window.appFeatureFlags = window.appFeatureFlags || { signupEnabled: true, pdfEnabled: true, excelEnabled: true };
                window.activeAnnouncements = window.activeAnnouncements || [];
            }
            window.applyAppFeatureToggles();
            window.renderAnnouncements();
            window.openNoticeModal(false);
        };

        window.loadNotices = async function(showFeedback) {
            try {
                var currentLanguage = String(
                    (window.appSettings && window.appSettings.language)
                    || (window.i18next && window.i18next.language)
                    || getSavedLanguage()
                    || 'en'
                ).trim().toLowerCase();
                var res = await fetch('/api/notices?lang=' + encodeURIComponent(currentLanguage), {
                    credentials: 'include',
                    cache: 'no-store'
                });
                if (!res.ok) throw new Error('Failed to load notices');
                var payload = await res.json();
                var notices = Array.isArray(payload && payload.notices) ? payload.notices : [];
                window.allNotices = notices;
                window.activeAnnouncements = notices.slice();
                window.renderAnnouncements();
                if (showFeedback) showToast('Notices refreshed');
                return notices;
            } catch (err) {
                console.error('loadNotices error:', err);
                window.renderNoticeSection();
                if (showFeedback) showToast('Failed to refresh notices');
                return [];
            }
        };

        window.trackReportDownload = async function(reportType) {
            try {
                await fetch('/api/activity/report-download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ reportType: String(reportType || 'report') })
                });
            } catch (err) {}
        };

        function initApp() {
            if (appInitialized) return;
            appInitialized = true;
            window.appSettings = {
                rate: 21,
                companyName: String(window.currentUserDisplayName || 'Kamlesh'),
                language: getSavedLanguage(),
                darkMode: 'off',
                installPromptShown: false,
                invoiceLogoUrl: '/icon-512.png',
                invoiceCustomerName: 'Walk-in Customer',
                invoiceCustomerContact: '',
                invoiceTaxPercent: 0,
                invoicePaymentStatus: 'Pending'
            };
            Promise.resolve()
                .then(function() { return window.loadSettings(); })
                .catch(function(err) {
                    console.error('loadSettings during init failed:', err);
                    return window.appSettings;
                })
                .then(function() {
                    return window.loadAppConfig(window.appSettings && window.appSettings.language);
                })
                .then(function() {
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
                console.error('initApp failed:', err);
                fetchTrips();
                window.startTypingEffect();
                setTimeout(showInstallPromptIfNeeded, 1800);
            });
        }

        window.doLogin = async function() {
            var uEl = document.getElementById('loginUsername');
            var pEl = document.getElementById('loginPassword');
            var username = String((uEl && uEl.value) || '').trim();
            var password = String((pEl && pEl.value) || '').trim();
            if (!username || !password) return;

            try {
                var res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username: username, password: password })
                });
                if (!res.ok) {
                    var errText = 'Invalid credentials';
                    try {
                        var errData = await res.json();
                        if (errData && errData.error) errText = String(errData.error);
                    } catch (e) {}
                    if (pEl) pEl.value = '';
                    if (uEl) uEl.focus();
                    alert(errText);
                    return;
                }
                if (window.bootstrapAuth) {
                    await window.bootstrapAuth();
                } else {
                    window.location.reload();
                }
            } catch (e) {
                alert('Login failed');
            }
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
                    credentials: 'include'
                });
                if (!res.ok) {
                    console.warn('🔐 bootstrapAuth: Status check failed (HTTP ' + res.status + ').');
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
                setAuthenticatedIdentity(s);
                applyTranslations();
                window.pendingTabAfterUnlock = 'home';
                showAuthenticatedApp('home');
            } catch (e) {
                console.error('🔐 bootstrapAuth: Error:', e);
                window.location.href = '/login';
            }
        };

        var DELETE_ACCOUNT_CONFIRM_TEXT = 'Yes, I want to delete my account';

        function updateDeleteAccountConfirmState() {
            var terms = document.getElementById('deleteTermsCheckbox');
            var finalBox = document.getElementById('deleteFinalCheckbox');
            var btn = document.getElementById('confirmDeleteAccountBtn');
            if (!terms || !finalBox || !btn) return;
            var ready = !!terms.checked && !!finalBox.checked;
            btn.disabled = !ready;
            if (ready) {
                btn.classList.remove('opacity-60', 'cursor-not-allowed');
            } else {
                btn.classList.add('opacity-60', 'cursor-not-allowed');
            }
        }

        window.openDeleteAccountModal = function() {
            if (!(window.authProfile && window.authProfile.canDeleteAccount)) {
                showToast(t('toast.deleteAccountNotAllowed'));
                return;
            }
            var m = document.getElementById('deleteAccountModal');
            var terms = document.getElementById('deleteTermsCheckbox');
            var finalBox = document.getElementById('deleteFinalCheckbox');
            if (terms) terms.checked = false;
            if (finalBox) finalBox.checked = false;
            updateDeleteAccountConfirmState();
            if (m) m.classList.remove('hidden');
        };

        window.closeDeleteAccountModal = function() {
            var m = document.getElementById('deleteAccountModal');
            if (m) m.classList.add('hidden');
        };

        window.confirmDeleteAccount = async function() {
            if (!(window.authProfile && window.authProfile.canDeleteAccount)) {
                showToast(t('toast.deleteAccountNotAllowed'));
                return;
            }

            var terms = document.getElementById('deleteTermsCheckbox');
            var finalBox = document.getElementById('deleteFinalCheckbox');
            var btn = document.getElementById('confirmDeleteAccountBtn');
            if (!terms || !finalBox || !btn) return;

            if (!terms.checked) {
                showToast(t('toast.deleteAccountStep1'));
                return;
            }
            if (!finalBox.checked) {
                showToast(t('toast.deleteAccountStep2'));
                return;
            }

            var originalLabel = btn.innerHTML;
            btn.disabled = true;
            btn.classList.add('opacity-60', 'cursor-not-allowed');
            btn.innerText = 'Deleting...';

            try {
                var res = await fetch('/api/account/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        termsAccepted: true,
                        finalConfirmed: true,
                        finalConfirmation: DELETE_ACCOUNT_CONFIRM_TEXT
                    })
                });

                if (!res.ok) {
                    var errText = t('toast.deleteAccountFailed');
                    try {
                        var errData = await res.json();
                        if (errData && errData.error) errText = String(errData.error);
                    } catch (e) {}
                    showToast(errText);
                    btn.innerHTML = originalLabel;
                    updateDeleteAccountConfirmState();
                    return;
                }

                showToast(t('toast.deleteAccountSuccess'));
                window.closeDeleteAccountModal();
                setTimeout(function() {
                    window.location.href = '/signup';
                }, 700);
            } catch (err) {
                showToast(t('toast.deleteAccountFailed'));
                btn.innerHTML = originalLabel;
                updateDeleteAccountConfirmState();
            }
        };

        document.addEventListener('DOMContentLoaded', function() {
            var loginU = document.getElementById('loginUsername');
            var loginP = document.getElementById('loginPassword');
            if (loginU) loginU.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.doLogin(); });
            if (loginP) loginP.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.doLogin(); });

            var invModal = document.getElementById('invoiceMonthModal');
            if (invModal) {
                invModal.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        window.generateInvoiceFromModal();
                    }
                });
            }

            var deleteTerms = document.getElementById('deleteTermsCheckbox');
            var deleteFinal = document.getElementById('deleteFinalCheckbox');
            if (deleteTerms) deleteTerms.addEventListener('change', updateDeleteAccountConfirmState);
            if (deleteFinal) deleteFinal.addEventListener('change', updateDeleteAccountConfirmState);
            updateDeleteAccountConfirmState();
            refreshDeleteAccountUI();
        });

        // Splash Screen Logic
        function hideSplashScreen() {
            var splash = document.getElementById('splashScreen');
            if (splash) {
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
            var prompt = document.getElementById('installPrompt');
            if (!prompt || isStandaloneMode()) return;
            if (deferredPrompt || isIosDevice()) {
                prompt.classList.add('show');
            } else {
                prompt.classList.remove('show');
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
            setTimeout(showInstallPromptIfNeeded, 3000);
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
                    return;
                }
                showToast(t('toast.installNotAvailable'));
                return;
            }
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choiceResult) {
                if (choiceResult.outcome === 'accepted') {
                    showToast(t('toast.installingApp'));
                    saveInstallPromptShown();
                }
                deferredPrompt = null;
                var prompt = document.getElementById('installPrompt');
                if (prompt) prompt.classList.remove('show');
            });
        });

        window.dismissInstallPrompt = function() {
            var prompt = document.getElementById('installPrompt');
            if (prompt) prompt.classList.remove('show');
        };

        // Auth bootstrap flow
        var loginScreen = document.getElementById('loginScreen');
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
                        console.error('🔐 startAuthFlow: bootstrapAuth function not found! Showing login screen.');
                        window.location.href = '/login';
                    }
                }, 200);

                // Hard fallback: if all screens are hidden, show login screen.
                setTimeout(function() {
                    var login = document.getElementById('loginScreen');
                    var app = document.getElementById('appContent');
                    var loginHidden = !login || window.getComputedStyle(login).display === 'none';
                    var appHidden = !app || window.getComputedStyle(app).display === 'none';
                    if (loginHidden && appHidden) {
                        console.warn('🔐 startAuthFlow: All screens hidden. Forcing login fallback.');
                        window.location.href = '/login';
                    }
                }, 1800);
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


if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    var swUrl = '/sw.js?v=${PWA_ASSET_VERSION}';
    navigator.serviceWorker.register(swUrl, { scope: '/' })
        .then(function(registration) {
            console.log("SW Registered ✅");
            registration.update();
            
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
        const preferredLanguage = String(s.language || getSavedLanguage() || 'en').trim().toLowerCase();
        window.appSettings = {
            rate: Number(s.rate) || 21,
            companyName: String(s.companyName || window.currentUserDisplayName || 'Kamlesh'),
            language: SUPPORTED_LANGUAGES.indexOf(preferredLanguage) !== -1 ? preferredLanguage : 'en',
            darkMode: String(s.darkMode || 'off'),
            installPromptShown: !!s.installPromptShown,
            invoiceLogoUrl: String(s.invoiceLogoUrl || '/icon-512.png'),
            invoiceCustomerName: String(s.invoiceCustomerName || 'Walk-in Customer'),
            invoiceCustomerContact: String(s.invoiceCustomerContact || ''),
            invoiceTaxPercent: Number(s.invoiceTaxPercent || 0),
            invoicePaymentStatus: String(s.invoicePaymentStatus || 'Pending')
        };
        var rateEl = document.getElementById('rateSetting');
        var companyEl = document.getElementById('companyName');
        var rateDisplay = document.getElementById('rateDisplay');
        var logoEl = document.getElementById('invoiceLogoUrl');
        var customerEl = document.getElementById('invoiceCustomerName');
        var contactEl = document.getElementById('invoiceCustomerContact');
        var taxEl = document.getElementById('invoiceTaxPercent');
        var statusEl = document.getElementById('invoicePaymentStatus');
        var languageEl = document.getElementById('languageSelect');
        if (rateEl) rateEl.value = window.appSettings.rate;
        if (companyEl) companyEl.value = window.appSettings.companyName;
        if (rateDisplay) rateDisplay.value = window.appSettings.rate;
        if (logoEl) logoEl.value = window.appSettings.invoiceLogoUrl;
        if (customerEl) customerEl.value = window.appSettings.invoiceCustomerName;
        if (contactEl) contactEl.value = window.appSettings.invoiceCustomerContact;
        if (taxEl) taxEl.value = window.appSettings.invoiceTaxPercent;
        if (statusEl) statusEl.value = window.appSettings.invoicePaymentStatus;
        if (languageEl) languageEl.value = window.appSettings.language;
        saveLanguage(window.appSettings.language);
        if (window.i18next && window.i18next.language !== window.appSettings.language) {
            try {
                await window.i18next.changeLanguage(window.appSettings.language);
                applyTranslations();
                window.startTypingEffect();
            } catch (langErr) {
                console.error('loadSettings language sync failed:', langErr);
            }
        }
        if (window.appSettings.darkMode === 'on') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        return window.appSettings;
    } catch (e) {
        console.error('loadSettings error:', e);
        window.appSettings = window.appSettings || {
            rate: 21,
            companyName: String(window.currentUserDisplayName || 'Kamlesh'),
            language: getSavedLanguage(),
            darkMode: 'off',
            installPromptShown: false,
            invoiceLogoUrl: '/icon-512.png',
            invoiceCustomerName: 'Walk-in Customer',
            invoiceCustomerContact: '',
            invoiceTaxPercent: 0,
            invoicePaymentStatus: 'Pending'
        };
        return window.appSettings;
    }
};

// ✅ Save Settings (MongoDB only)
window.saveSettings = async function() {
    const rate = document.getElementById('rateSetting').value || 21;
    const company = document.getElementById('companyName').value || '';
    const language = document.getElementById('languageSelect')?.value || ((window.appSettings && window.appSettings.language) || getSavedLanguage());
    const invoiceLogoUrl = document.getElementById('invoiceLogoUrl')?.value || '/icon-512.png';
    const invoiceCustomerName = document.getElementById('invoiceCustomerName')?.value || '';
    const invoiceCustomerContact = document.getElementById('invoiceCustomerContact')?.value || '';
    const invoiceTaxPercent = document.getElementById('invoiceTaxPercent')?.value || 0;
    const invoicePaymentStatus = document.getElementById('invoicePaymentStatus')?.value || 'Pending';

    try {
        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                rate: Number(rate),
                companyName: company,
                language: language,
                invoiceLogoUrl: invoiceLogoUrl,
                invoiceCustomerName: invoiceCustomerName,
                invoiceCustomerContact: invoiceCustomerContact,
                invoiceTaxPercent: Number(invoiceTaxPercent),
                invoicePaymentStatus: invoicePaymentStatus
            })
        });
        if (!res.ok) throw new Error('Failed to save');
        const s = await res.json();
        window.appSettings.rate = Number(s.rate) || 21;
        window.appSettings.companyName = String(s.companyName || window.currentUserDisplayName || 'Kamlesh');
        window.appSettings.language = String(s.language || language || 'en');
        window.appSettings.invoiceLogoUrl = String(s.invoiceLogoUrl || '/icon-512.png');
        window.appSettings.invoiceCustomerName = String(s.invoiceCustomerName || 'Walk-in Customer');
        window.appSettings.invoiceCustomerContact = String(s.invoiceCustomerContact || '');
        window.appSettings.invoiceTaxPercent = Number(s.invoiceTaxPercent || 0);
        window.appSettings.invoicePaymentStatus = String(s.invoicePaymentStatus || 'Pending');
        var rateDisplay = document.getElementById('rateDisplay');
        if (rateDisplay) rateDisplay.value = window.appSettings.rate;
        saveLanguage(window.appSettings.language);
        if (window.i18next && window.i18next.language !== window.appSettings.language) {
            await window.i18next.changeLanguage(window.appSettings.language);
            applyTranslations();
            window.startTypingEffect();
        }
        await window.loadAppConfig(window.appSettings.language);
        showToast(t('toast.settingsSaved'));
    } catch (e) {
        showToast(t('toast.settingsFailed'));
    }
};


window.exportExcel = async function () {
    if (window.appFeatureFlags && window.appFeatureFlags.excelEnabled === false) {
        showToast('Excel export disabled by admin');
        return;
    }

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
    window.trackReportDownload('excel');

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
    window.pendingTabAfterUnlock = String(id || '').trim();
    try { localStorage.setItem('tripset_last_tab', window.pendingTabAfterUnlock); } catch (e) {}

    document.querySelectorAll('.tab-content')
        .forEach(c => c.classList.remove('active'));

    var nextTab = document.getElementById(id);
    if (nextTab) nextTab.classList.add('active');

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

    if (id === 'entries' || id === 'company-entries' || id === 'dashboard')
        fetchTrips();

    if (id === 'notices' && window.loadNotices)
        window.loadNotices(false);

    if (id === 'home')
        window.startTypingEffect();

    if (window.innerWidth < 768) window.toggleMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
};

            window.startTypingEffect = function() {
                const text = t('home.welcome');
                const target = document.getElementById('typing-text');
                if(!target) return;
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                    typingTimeout = null;
                }

                const finalText = String(text || ('Welcome ' + String(window.currentUserDisplayName || 'Kamlesh')));
                let index = 0;
                target.textContent = '';

                (function typeNext() {
                    if (!document.body.contains(target)) return;
                    target.textContent = finalText.slice(0, index);
                    if (index < finalText.length) {
                        index += 1;
                        typingTimeout = setTimeout(typeNext, 90);
                    } else {
                        typingTimeout = null;
                    }
                })();
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
                el.style.setProperty('animation', 'none', 'important');
                void el.offsetHeight;
                el.style.setProperty('animation', 'numberPop 0.35s ease', 'important');
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
                if (window.appFeatureFlags && window.appFeatureFlags.pdfEnabled === false) {
                    showToast('PDF download disabled by admin');
                    return;
                }
                const sourceEl = document.getElementById(id);
                if (!sourceEl) return;

                const reportLabel = id === 'company-entries' ? 'Company Report' : 'Entry Report';
                const filenamePrefix = id === 'company-entries' ? 'Company_Report' : 'Entry_Report';
                const todayToken = new Date().toISOString().slice(0, 10);
                const filename = filenamePrefix + '_' + todayToken + '.pdf';

                const exportRoot = document.createElement('div');
                exportRoot.style.position = 'fixed';
                exportRoot.style.left = '-10000px';
                exportRoot.style.top = '0';
                exportRoot.style.width = '794px';
                exportRoot.style.padding = '16px';
                exportRoot.style.background = '#ffffff';
                exportRoot.style.color = '#0f172a';
                exportRoot.style.fontFamily = "'Hind Vadodara','Inter',sans-serif";

                const clone = sourceEl.cloneNode(true);
                clone.style.background = '#ffffff';
                clone.style.color = '#0f172a';
                clone.style.border = '1px solid #e2e8f0';
                clone.style.borderRadius = '12px';
                clone.style.boxShadow = 'none';
                clone.style.overflow = 'visible';
                clone.style.width = '100%';

                clone.querySelectorAll('.no-pdf,button,input,select,textarea,canvas,svg').forEach(function(el) {
                    el.remove();
                });
                clone.querySelectorAll('#dashboard,[id*="chart"],[id*="Chart"],.chart-container').forEach(function(el) {
                    el.remove();
                });

                clone.querySelectorAll('table').forEach(function(tbl) {
                    tbl.style.width = '100%';
                    tbl.style.borderCollapse = 'collapse';
                    tbl.style.tableLayout = 'fixed';
                    tbl.style.background = '#ffffff';
                });
                clone.querySelectorAll('thead').forEach(function(head) {
                    if (id === 'company-entries') {
                        head.style.background = '#eef2ff';
                        head.style.color = '#1e293b';
                    } else {
                        head.style.background = '#0f172a';
                        head.style.color = '#f8fafc';
                    }
                });
                clone.querySelectorAll('tfoot').forEach(function(foot) {
                    if (id === 'company-entries') {
                        foot.style.background = '#312e81';
                        foot.style.color = '#ffffff';
                    } else {
                        foot.style.background = '#0f172a';
                        foot.style.color = '#ffffff';
                    }
                });
                clone.querySelectorAll('th,td').forEach(function(cell) {
                    cell.style.border = '1px solid #cbd5e1';
                    cell.style.padding = '7px';
                    cell.style.fontSize = '11px';
                    cell.style.verticalAlign = 'top';
                    cell.style.wordBreak = 'break-word';
                });
                clone.querySelectorAll('tr').forEach(function(row) {
                    row.style.pageBreakInside = 'avoid';
                });

                const header = document.createElement('div');
                header.style.marginBottom = '12px';
                header.style.padding = '10px 12px';
                header.style.border = '1px solid #e2e8f0';
                header.style.borderRadius = '10px';
                header.style.background = '#f8fafc';
                header.innerHTML = ''
                    + '<div style="font-size:18px;font-weight:900;color:#0f172a;">Tripset - ' + reportLabel + '</div>'
                    + '<div style="font-size:11px;color:#475569;margin-top:2px;">Generated: ' + new Date().toLocaleString('en-IN') + '</div>'
                    + '<div style="font-size:11px;color:#475569;">User: ' + String(window.currentUserDisplayName || '') + '</div>';

                exportRoot.appendChild(header);
                exportRoot.appendChild(clone);
                document.body.appendChild(exportRoot);

                try {
                    showToast(t('toast.pdfGenerating'));
                    await html2pdf().set({
                        margin: [8, 8, 10, 8],
                        filename: filename,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: '#ffffff',
                            scrollX: 0,
                            scrollY: 0
                        },
                        jsPDF: {
                            unit: 'mm',
                            format: 'a4',
                            orientation: 'portrait',
                            compress: true
                        },
                        pagebreak: { mode: ['css', 'legacy'] }
                    }).from(exportRoot).save();
                    window.trackReportDownload(id === 'company-entries' ? 'company-pdf' : 'entries-pdf');
                    showToast(t('toast.downloadComplete'));
                } catch (err) {
                    console.error('PDF export failed:', err);
                    showToast('PDF export failed');
                } finally {
                    exportRoot.remove();
                }
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

                function formatDateOnly(d) {
                    const parsed = d ? new Date(d) : new Date();
                    return parsed.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                }

                function escapeHtml(val) {
                    return String(val == null ? '' : val)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                }

                function resolveInvoiceAssetUrl(url) {
                    const raw = String(url || '').trim();
                    if (!raw) return '';
                    try {
                        return new URL(raw, window.location.origin).href;
                    } catch (err) {
                        return raw;
                    }
                }

                function createInvoiceLogoFallbackHtml() {
                    return '<div style="width:44px;height:44px;border:1px solid #0f172a;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;background:#fff;">T</div>';
                }

                function createInvoiceExportRoot(html) {
                    const root = document.createElement('div');
                    root.setAttribute('data-invoice-export-root', '1');
                    root.style.position = 'fixed';
                    root.style.left = '0';
                    root.style.top = '0';
                    root.style.width = '210mm';
                    root.style.maxWidth = '210mm';
                    root.style.padding = '0';
                    root.style.margin = '0';
                    root.style.background = '#ffffff';
                    root.style.opacity = '1';
                    root.style.pointerEvents = 'none';
                    root.style.zIndex = '-1';
                    root.style.overflow = 'hidden';
                    root.style.boxSizing = 'border-box';
                    root.innerHTML = html;
                    document.body.appendChild(root);
                    return root;
                }

                function replaceInvoiceImageWithFallback(img) {
                    if (!img || !img.parentNode) return;
                    const wrap = document.createElement('div');
                    wrap.innerHTML = createInvoiceLogoFallbackHtml();
                    const fallback = wrap.firstChild;
                    if (fallback) {
                        img.parentNode.replaceChild(fallback, img);
                    }
                }

                async function waitForInvoiceRender(root) {
                    if (!root) return;
                    try {
                        if (document.fonts && document.fonts.ready) {
                            await document.fonts.ready;
                        }
                    } catch (err) {}

                    const images = Array.from(root.querySelectorAll('img'));
                    await Promise.all(images.map(function(img) {
                        return new Promise(function(resolve) {
                            let done = false;
                            function finish() {
                                if (done) return;
                                done = true;
                                resolve();
                            }
                            function handleLoad() {
                                cleanup();
                                if (!img.naturalWidth) {
                                    replaceInvoiceImageWithFallback(img);
                                }
                                finish();
                            }
                            function handleError() {
                                cleanup();
                                replaceInvoiceImageWithFallback(img);
                                finish();
                            }
                            function cleanup() {
                                img.removeEventListener('load', handleLoad);
                                img.removeEventListener('error', handleError);
                            }
                            if (img.complete) {
                                if (!img.naturalWidth) {
                                    replaceInvoiceImageWithFallback(img);
                                }
                                return finish();
                            }
                            img.addEventListener('load', handleLoad, { once: true });
                            img.addEventListener('error', handleError, { once: true });
                            setTimeout(function() {
                                cleanup();
                                if (!img.complete || !img.naturalWidth) {
                                    replaceInvoiceImageWithFallback(img);
                                }
                                finish();
                            }, 2500);
                        });
                    }));

                    await new Promise(function(resolve) {
                        requestAnimationFrame(function() {
                            requestAnimationFrame(resolve);
                        });
                    });
                }

                function getInvoiceMonth(monthOverride) {
                    const monthInput = document.getElementById('invoiceMonth');
                    const modalInput = document.getElementById('invoiceMonthModal');
                    const month = (monthOverride && String(monthOverride).trim())
                        ? String(monthOverride).trim()
                        : ((modalInput && modalInput.value) ? modalInput.value : ((monthInput && monthInput.value) ? monthInput.value : ''));
                    return month;
                }

                function buildInvoiceRows(items) {
                    if (!items.length) {
                        return '<tr><td colspan="4" style="border:1px solid #0f172a;padding:10px;text-align:center;color:#475569;">No billable trips for selected month.</td></tr>';
                    }
                    return items.map(function(it) {
                        const qty = Number(it.quantity) || 0;
                        const price = Number(it.price) || 0;
                        const total = Number(it.total) || 0;
                        const metaBits = [];
                        if (it.tripId) metaBits.push('Trip: ' + String(it.tripId));
                        if (it.date) metaBits.push('Date: ' + String(it.date));
                        return ''
                            + '<tr style="page-break-inside:avoid;break-inside:avoid;">'
                            +   '<td style="border:1px solid #0f172a;padding:7px;vertical-align:top;word-break:break-word;">'
                            +     '<div style="font-weight:700;">' + escapeHtml(it.itemName || 'Service') + '</div>'
                            +     (metaBits.length ? '<div style="margin-top:4px;font-size:10px;color:#475569;">' + escapeHtml(metaBits.join(' | ')) + '</div>' : '')
                            +   '</td>'
                            +   '<td style="border:1px solid #0f172a;padding:7px;text-align:right;vertical-align:top;">' + qty.toFixed(2) + '</td>'
                            +   '<td style="border:1px solid #0f172a;padding:7px;text-align:right;vertical-align:top;">' + formatInr(price) + '</td>'
                            +   '<td style="border:1px solid #0f172a;padding:7px;text-align:right;vertical-align:top;font-weight:700;">' + formatInr(total) + '</td>'
                            + '</tr>';
                    }).join('');
                }

                function buildInvoiceHtml(model) {
                    const logoUrl = resolveInvoiceAssetUrl(model.companyLogoUrl);
                    const logoHtml = logoUrl
                        ? '<img src="' + escapeHtml(logoUrl) + '" alt="Company Logo" style="width:44px;height:44px;object-fit:contain;border:1px solid #0f172a;padding:4px;background:#fff;" crossorigin="anonymous" referrerpolicy="no-referrer">'
                        : createInvoiceLogoFallbackHtml();

                    return ''
                        + '<div id="invoiceDocument" style="width:190mm;min-height:277mm;margin:0 auto;padding:0;background:#fff;color:#0f172a;font-size:12px;line-height:1.45;box-sizing:border-box;">'
                        +   '<div style="border:1px solid #0f172a;padding:10mm;box-sizing:border-box;">'
                        +     '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;">'
                        +       '<div style="display:flex;gap:10px;align-items:flex-start;">'
                        +         logoHtml
                        +         '<div>'
                        +           '<div style="font-size:26px;font-weight:900;letter-spacing:.02em;">' + escapeHtml(model.companyName || 'Tripset') + '</div>'
                        +           '<div style="font-size:11px;color:#334155;text-transform:uppercase;letter-spacing:.16em;margin-top:2px;">Tax Invoice</div>'
                        +         '</div>'
                        +       '</div>'
                        +       '<table style="border-collapse:collapse;min-width:66mm;font-size:11px;">'
                        +         '<tr><td style="border:1px solid #0f172a;padding:5px 6px;font-weight:700;">Invoice Number</td><td style="border:1px solid #0f172a;padding:5px 6px;">' + escapeHtml(model.invoiceNumber) + '</td></tr>'
                        +         '<tr><td style="border:1px solid #0f172a;padding:5px 6px;font-weight:700;">Date</td><td style="border:1px solid #0f172a;padding:5px 6px;">' + escapeHtml(model.invoiceDate) + '</td></tr>'
                        +         '<tr><td style="border:1px solid #0f172a;padding:5px 6px;font-weight:700;">Month</td><td style="border:1px solid #0f172a;padding:5px 6px;">' + escapeHtml(model.invoiceMonthLabel) + '</td></tr>'
                        +       '</table>'
                        +     '</div>'

                        +     '<div style="margin-top:8mm;border:1px solid #0f172a;padding:8px;">'
                        +       '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;">Bill To</div>'
                        +       '<div><span style="font-weight:700;">Customer Name:</span> ' + escapeHtml(model.customerName) + '</div>'
                        +       '<div><span style="font-weight:700;">Contact Details:</span> ' + escapeHtml(model.customerContact || 'N/A') + '</div>'
                        +       '<div><span style="font-weight:700;">Prepared By:</span> ' + escapeHtml(model.signatoryName || 'Tripset User') + '</div>'
                        +     '</div>'

                        +     '<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:8mm;">'
                        +       '<thead>'
                        +         '<tr>'
                        +           '<th style="border:1px solid #0f172a;padding:7px;text-align:left;width:52%;">Item Name</th>'
                        +           '<th style="border:1px solid #0f172a;padding:7px;text-align:right;width:16%;">Quantity</th>'
                        +           '<th style="border:1px solid #0f172a;padding:7px;text-align:right;width:16%;">Price</th>'
                        +           '<th style="border:1px solid #0f172a;padding:7px;text-align:right;width:16%;">Total</th>'
                        +         '</tr>'
                        +       '</thead>'
                        +       '<tbody>' + buildInvoiceRows(model.items) + '</tbody>'
                        +     '</table>'

                        +     '<div style="margin-top:8mm;display:flex;justify-content:flex-end;">'
                        +       '<table style="width:82mm;border-collapse:collapse;font-size:12px;">'
                        +         '<tr><td style="border:1px solid #0f172a;padding:6px;">Subtotal</td><td style="border:1px solid #0f172a;padding:6px;text-align:right;">' + formatInr(model.subtotal) + '</td></tr>'
                        +         '<tr><td style="border:1px solid #0f172a;padding:6px;">Tax (' + model.taxPercent.toFixed(2) + '%)</td><td style="border:1px solid #0f172a;padding:6px;text-align:right;">' + formatInr(model.taxAmount) + '</td></tr>'
                        +         '<tr><td style="border:1px solid #0f172a;padding:6px;font-weight:900;">Grand Total</td><td style="border:1px solid #0f172a;padding:6px;text-align:right;font-weight:900;">' + formatInr(model.grandTotal) + '</td></tr>'
                        +         '<tr><td style="border:1px solid #0f172a;padding:6px;">Payment Status</td><td style="border:1px solid #0f172a;padding:6px;text-align:right;font-weight:700;">' + escapeHtml(model.paymentStatus) + '</td></tr>'
                        +       '</table>'
                        +     '</div>'

                        +     '<div style="margin-top:16mm;display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;">'
                        +       '<div style="font-size:10px;color:#475569;max-width:56%;">This invoice is computer generated and intended for accounting records.</div>'
                        +       '<div style="text-align:center;min-width:65mm;">'
                        +         '<div style="height:22mm;"></div>'
                        +         '<div style="border-top:1px solid #0f172a;padding-top:5px;font-size:11px;font-weight:700;">Authorized Signature - ' + escapeHtml(model.signatoryName || 'Kamlesh') + '</div>'
                        +       '</div>'
                        +     '</div>'
                        +   '</div>'
                        + '</div>';
                }

                async function prepareInvoice(monthOverride) {
                    const month = getInvoiceMonth(monthOverride);
                    if (!month) {
                        showToast(t('toast.selectInvoiceMonth'));
                        return null;
                    }

                    const res = await fetch('/api/invoice/' + month, { cache: 'no-store' });
                    if (!res.ok) {
                        showToast(t('toast.invoiceFailed'));
                        return null;
                    }

                    const data = await res.json();
                    const rawItems = Array.isArray(data.items) ? data.items : [];
                    const items = rawItems.map(function(it) {
                        return {
                            tripId: String(it.tripId || ''),
                            date: String(it.date || ''),
                            itemName: String(it.itemName || 'Service'),
                            quantity: Number(it.quantity) || 0,
                            price: Number(it.price) || 0,
                            total: Number(it.total) || 0
                        };
                    });
                    const subtotal = Number.isFinite(Number(data.subtotal))
                        ? Number(data.subtotal)
                        : items.reduce(function(acc, it) { return acc + (Number(it.total) || 0); }, 0);
                    const taxPercent = Math.max(0, Number(data.taxPercent) || 0);
                    const taxAmount = Number.isFinite(Number(data.taxAmount))
                        ? Number(data.taxAmount)
                        : (subtotal * taxPercent / 100);
                    const grandTotal = Number.isFinite(Number(data.grandTotal))
                        ? Number(data.grandTotal)
                        : subtotal + taxAmount;

                    const model = {
                        companyName: String(data.companyName || (window.appSettings && window.appSettings.companyName) || window.currentUserDisplayName || 'Kamlesh'),
                        companyLogoUrl: String(data.companyLogoUrl || '/icon-512.png'),
                        invoiceNumber: String(data.invoiceNumber || ('INV-' + String(month).replace('-', '') + '-001')),
                        invoiceDate: formatDateOnly(data.invoiceDate),
                        invoiceMonthLabel: formatMonthLabel(data.month || month),
                        customerName: String((data.customer && data.customer.name) || 'Walk-in Customer'),
                        customerContact: String((data.customer && data.customer.contact) || ''),
                        items: items,
                        subtotal: subtotal,
                        taxPercent: taxPercent,
                        taxAmount: taxAmount,
                        grandTotal: grandTotal,
                        paymentStatus: String(data.paymentStatus || 'Pending'),
                        signatoryName: String(window.currentUserDisplayName || 'Kamlesh')
                    };

                    const content = document.getElementById('invoiceContent');
                    if (!content) {
                        showToast(t('toast.invoiceTemplateMissing'));
                        return null;
                    }

                    const html = buildInvoiceHtml(model);
                    content.innerHTML = html;

                    return {
                        month: month,
                        html: html,
                        model: model
                    };
                }

                async function downloadInvoice(monthOverride) {
                    const container = document.getElementById('invoiceContainer');
                    let exportRoot = null;
                    try {
                        showToast(t('toast.generatingInvoice'));
                        const prepared = await prepareInvoice(monthOverride);
                        if (!prepared) return;

                        if (container) container.classList.remove('hidden');
                        exportRoot = createInvoiceExportRoot(prepared.html);
                        await waitForInvoiceRender(exportRoot);
                        const exportTarget = exportRoot.querySelector('#invoiceDocument') || exportRoot;

                        await html2pdf().set({
                            margin: [10, 10, 10, 10],
                            filename: 'Invoice_' + prepared.month + '.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: {
                                scale: 2,
                                useCORS: true,
                                allowTaint: false,
                                backgroundColor: '#ffffff',
                                scrollX: 0,
                                scrollY: 0,
                                width: exportTarget.scrollWidth,
                                windowWidth: exportTarget.scrollWidth
                            },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                            pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
                        }).from(exportTarget).save();

                        showToast(t('toast.invoiceDownloaded'));
                    } catch (e) {
                        console.error('INVOICE DOWNLOAD ERROR:', e);
                        showToast(t('toast.invoiceGenerationFailed'));
                    } finally {
                        if (exportRoot && exportRoot.parentNode) {
                            exportRoot.parentNode.removeChild(exportRoot);
                        }
                        if (container) container.classList.add('hidden');
                    }
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

                window.generateInvoice = function(monthOverride) {
                    if (window.appFeatureFlags && window.appFeatureFlags.pdfEnabled === false) {
                        showToast('PDF download disabled by admin');
                        return Promise.resolve();
                    }
                    window.trackReportDownload('invoice-pdf');
                    return downloadInvoice(monthOverride);
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
        `;
        res.send(applyAccountNameBranding(pageHtml, req.authAccount));
    });

    const PORT = Number(process.env.PORT) || 3000;
    if (require.main === module) {
        app.listen(PORT, () => {
            console.log(`Server chalu thai gayu che: http://localhost:${PORT} 🚀`);
        });
    }
    module.exports = app;
