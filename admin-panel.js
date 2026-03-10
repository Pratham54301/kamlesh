'use strict';

const adminState = {
    authStatus: null,
    dashboard: null,
    analytics: null,
    users: [],
    companies: [],
    entries: [],
    reports: null,
    activity: [],
    notifications: [],
    announcements: [],
    features: null,
    errors: [],
    userOptions: [],
    companyOptions: [],
    currentUser: null,
    currentCompany: null,
    security: null,
    health: null,
    storage: [],
    vehicleStats: [],
    adminActivity: [],
    globalSearch: null,
    routeAnalytics: [],
    profitAnalytics: null,
    insights: null,
    emailPreview: null,
    charts: {
        entries: null,
        users: null,
        dau: null,
        growth: null
    }
};

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-IN');
}

function formatDateTime(value) {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '--';
    return dt.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatShortDate(value) {
    if (!value) return '--';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatMonthToken(value) {
    const raw = String(value || '');
    if (!/^\d{4}-\d{2}$/.test(raw)) return raw || '--';
    const [year, month] = raw.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function humanizeActivityType(value) {
    return String(value || 'activity')
        .split('_')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
        .join(' ');
}

function showAdminToast(message) {
    const toast = document.getElementById('adminToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showAdminToast._timer);
    showAdminToast._timer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function adminFetch(url, options) {
    const requestOptions = Object.assign({ credentials: 'include' }, options || {});
    const response = await fetch(url, requestOptions);
    if (response.status === 401) {
        window.location.href = '/admin/login';
        throw new Error('Admin session expired');
    }
    const contentType = String(response.headers.get('content-type') || '');
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
        throw new Error(payload && payload.error ? payload.error : 'Admin request failed');
    }
    return payload;
}

function setAdminSection(sectionName) {
    document.querySelectorAll('.admin-section').forEach((section) => {
        section.classList.toggle('active', section.id === `admin-section-${sectionName}`);
    });
    document.querySelectorAll('[data-section-btn]').forEach((button) => {
        button.classList.toggle('active', button.getAttribute('data-section-btn') === sectionName);
    });
    toggleAdminSidebar(false);
}

function toggleAdminSidebar(forceOpen) {
    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !document.body.classList.contains('admin-sidebar-open');
    document.body.classList.toggle('admin-sidebar-open', shouldOpen);
}

function destroyChart(name) {
    if (adminState.charts[name]) {
        adminState.charts[name].destroy();
        adminState.charts[name] = null;
    }
}

function renderEmpty(message) {
    return `<div class="admin-empty rounded-2xl p-5 text-center text-slate-400">${escapeHtml(message)}</div>`;
}

function renderActivityCards(logs, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!Array.isArray(logs) || !logs.length) {
        target.innerHTML = renderEmpty('No activity available.');
        return;
    }
    target.innerHTML = logs.map((log) => {
        const userText = log.userName || log.userKey || log.targetUserKey || 'system';
        const metaBits = [userText];
        if (log.companyName) metaBits.push(log.companyName);
        if (log.vehicleNumber) metaBits.push(log.vehicleNumber);
        metaBits.push(formatDateTime(log.createdAt));
        return `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="font-black text-white">${escapeHtml(humanizeActivityType(log.type))}</div>
                <div class="mt-2 text-sm text-slate-300">${escapeHtml(log.message || 'No description')}</div>
                <div class="mt-2 text-xs text-slate-500">${escapeHtml(metaBits.join(' • '))}</div>
            </div>
        `;
    }).join('');
}

function renderTopUsers(users) {
    const target = document.getElementById('adminDashboardTopUsers');
    if (!target) return;
    if (!Array.isArray(users) || !users.length) {
        target.innerHTML = renderEmpty('No user activity available.');
        return;
    }
    target.innerHTML = users.map((user) => `
        <div class="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div>
                <div class="font-black text-white">${escapeHtml(user.name || user.userKey)}</div>
                <div class="mt-1 text-xs text-slate-500">${escapeHtml(user.userKey || '')}</div>
            </div>
            <div class="text-right">
                <div class="text-2xl font-black text-orange-300">${escapeHtml(formatNumber(user.totalEntries || 0))}</div>
                <div class="text-xs text-slate-500">entries</div>
            </div>
        </div>
    `).join('');
}

function createLineChart(name, canvasId, labels, datasetLabel, values, borderColor, fillColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(name);
    adminState.charts[name] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data: values,
                borderColor,
                backgroundColor: fillColor,
                fill: true,
                tension: 0.35,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e2e8f0' } } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.06)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
            }
        }
    });
}

function createBarChart(name, canvasId, labels, datasetLabel, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart(name);
    adminState.charts[name] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: datasetLabel,
                data: values,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.08)' } }
            }
        }
    });
}

function renderDashboardCharts() {
    const dashboard = adminState.dashboard || {};
    const analytics = adminState.analytics || {};
    createLineChart('entries', 'adminEntriesChart', (analytics.dayLabels || []).map(formatShortDate), 'Entries Per Day', analytics.entriesPerDay || [], '#f97316', 'rgba(249,115,22,0.16)');
    createBarChart('users', 'adminUsersChart', (analytics.mostActiveUsers || dashboard.users || []).map((user) => user.name || user.userKey), 'Entries', (analytics.mostActiveUsers || dashboard.users || []).map((user) => Number(user.totalEntries || 0)), ['#f97316', '#fb923c', '#fdba74', '#38bdf8', '#10b981', '#e879f9', '#22c55e', '#06b6d4', '#eab308', '#ef4444']);
    createLineChart('dau', 'adminDauChart', (analytics.dayLabels || []).map(formatShortDate), 'Daily Active Users', analytics.dailyActiveUsers || [], '#38bdf8', 'rgba(56,189,248,0.14)');
    createLineChart('growth', 'adminGrowthChart', (analytics.growthLabels || []).map(formatMonthToken), 'Monthly Growth', analytics.monthlyGrowth || [], '#10b981', 'rgba(16,185,129,0.14)');
}

function renderDashboard(data) {
    adminState.dashboard = data;
    document.getElementById('adminTotalUsers').textContent = formatNumber(data?.totals?.totalUsers || 0);
    document.getElementById('adminTotalCompanies').textContent = formatNumber(data?.totals?.totalCompanies || 0);
    document.getElementById('adminTotalEntries').textContent = formatNumber(data?.totals?.totalEntries || 0);
    document.getElementById('adminTotalTrips').textContent = formatNumber(data?.totals?.totalTrips || 0);
    renderActivityCards(data?.recentActivity || [], 'adminDashboardActivity');
    renderTopUsers(data?.users || []);
    renderDashboardCharts();
}

function renderAnalytics(data) {
    adminState.analytics = data || {};
    renderDashboardCharts();
}

function getUserStatusBadge(user) {
    if (user.isDefaultUser) return '<span class="admin-badge admin-badge-slate">Protected</span>';
    if (user.isBlocked) return '<span class="admin-badge admin-badge-rose">Blocked</span>';
    return '<span class="admin-badge admin-badge-emerald">Active</span>';
}

function renderUsers(users) {
    adminState.users = Array.isArray(users) ? users : [];
    const body = document.getElementById('adminUsersTableBody');
    if (!body) return;
    if (!adminState.users.length) {
        body.innerHTML = `<tr><td colspan="8">${renderEmpty('No users found.')}</td></tr>`;
        return;
    }
    body.innerHTML = adminState.users.map((user) => {
        let actions = `<button type="button" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200" onclick='window.openAdminUserModal(${JSON.stringify(user.userKey)})'>View</button>`;
        if (!user.isDefaultUser) {
            actions += `<button type="button" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200" onclick='window.toggleAdminUserBlock(${JSON.stringify(user.userKey)}, ${JSON.stringify(!user.isBlocked)})'>${user.isBlocked ? 'Unblock' : 'Block'}</button>`;
            actions += `<button type="button" class="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200" onclick='window.deleteAdminUser(${JSON.stringify(user.userKey)})'>Delete</button>`;
        }
        return `
            <tr>
                <td data-label="Name"><div class="font-black text-white">${escapeHtml(user.name || '')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(user.userKey || '')}</div></td>
                <td data-label="Mobile">${escapeHtml(user.mobileNumber || '--')}</td>
                <td data-label="Vehicle">${escapeHtml(user.vehicleNumber || '--')}</td>
                <td data-label="Email">${escapeHtml(user.email || '--')}</td>
                <td data-label="Companies">${escapeHtml(formatNumber(user.totalCompanies || 0))}</td>
                <td data-label="Entries">${escapeHtml(formatNumber(user.totalEntries || 0))}</td>
                <td data-label="Status">${getUserStatusBadge(user)}</td>
                <td data-label="Actions" class="no-pdf"><div class="flex flex-wrap gap-2">${actions}</div></td>
            </tr>
        `;
    }).join('');
}

function renderCompanies(companies) {
    adminState.companies = Array.isArray(companies) ? companies : [];
    const body = document.getElementById('adminCompaniesTableBody');
    if (!body) return;
    if (!adminState.companies.length) {
        body.innerHTML = `<tr><td colspan="6">${renderEmpty('No companies found.')}</td></tr>`;
        return;
    }
    body.innerHTML = adminState.companies.map((company) => `
        <tr>
            <td data-label="Company"><div class="font-black text-white">${escapeHtml(company.companyName || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(company.userKey || '')}</div></td>
            <td data-label="Owner"><div>${escapeHtml(company.ownerName || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(company.vehicleNumber || '')}</div></td>
            <td data-label="Rate">₹${escapeHtml(formatNumber(company.rate || 0))}</td>
            <td data-label="Entries">${escapeHtml(formatNumber(company.totalEntries || 0))}</td>
            <td data-label="Type">${company.isDefaultUser ? '<span class="admin-badge admin-badge-slate">Default</span>' : '<span class="admin-badge admin-badge-orange">User Company</span>'}</td>
            <td data-label="Actions" class="no-pdf">
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200" onclick='window.openAdminCompanyModal(${JSON.stringify(company.userKey)}, ${JSON.stringify(company.companyName || '')}, ${JSON.stringify(company.rate || 21)})'>Edit</button>
                    <button type="button" class="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200" onclick='window.resetAdminCompany(${JSON.stringify(company.userKey)})'>Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderEntryUserOptions(users) {
    adminState.userOptions = Array.isArray(users) ? users : [];
    const select = document.getElementById('adminEntryUserFilter');
    if (!select) return;
    const options = ['<option value="">All users</option>'];
    adminState.userOptions.forEach((user) => {
        options.push(`<option value="${escapeHtml(user.userKey)}">${escapeHtml(user.name || user.userKey)}</option>`);
    });
    select.innerHTML = options.join('');
}

function renderEntries(payload) {
    adminState.entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
    const body = document.getElementById('adminEntriesTableBody');
    if (!body) return;
    if (!adminState.entries.length) {
        body.innerHTML = `<tr><td colspan="8">${renderEmpty('No entries found.')}</td></tr>`;
        return;
    }
    body.innerHTML = adminState.entries.map((entry) => `
        <tr>
            <td data-label="Date"><div class="font-black text-white">${escapeHtml(entry.date || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(formatDateTime(entry.createdAt))}</div></td>
            <td data-label="Trip ID">${escapeHtml(entry.tripId || '--')}</td>
            <td data-label="User"><div class="font-black text-white">${escapeHtml(entry.userName || entry.userKey || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(entry.userKey || '')}</div></td>
            <td data-label="Company"><div>${escapeHtml(entry.companyName || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(entry.vehicleNumber || '')}</div></td>
            <td data-label="Route">${escapeHtml((entry.pickup || '--') + ' -> ' + (entry.drop || '--'))}</td>
            <td data-label="KM">${escapeHtml(formatNumber(entry.km || 0))}</td>
            <td data-label="Total">${escapeHtml(entry.total || '--')}</td>
            <td data-label="Actions" class="no-pdf"><button type="button" class="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200" onclick='window.deleteAdminEntry(${JSON.stringify(entry.userKey)}, ${JSON.stringify(entry.entryId)})'>Delete</button></td>
        </tr>
    `).join('');
}

function renderReports(data) {
    adminState.reports = data;
    document.getElementById('adminReportUsers').textContent = formatNumber(data?.totals?.users || 0);
    document.getElementById('adminReportEntries').textContent = formatNumber(data?.totals?.entries || 0);
    document.getElementById('adminReportCompanies').textContent = formatNumber(data?.totals?.companies || 0);
    const companyTarget = document.getElementById('adminReportCompanyWise');
    const companyWise = Array.isArray(data?.companyWise) ? data.companyWise : [];
    companyTarget.innerHTML = companyWise.length ? companyWise.slice(0, 20).map((item) => `<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"><div class="font-black text-white">${escapeHtml(item.companyName || '--')}</div><div class="mt-2 text-sm text-slate-400">${escapeHtml(item.ownerName || item.userKey || '')}</div><div class="mt-2 text-lg font-black text-orange-300">${escapeHtml(formatNumber(item.totalEntries || 0))} entries</div></div>`).join('') : renderEmpty('No company report data.');
    const activityTarget = document.getElementById('adminReportUserActivity');
    const userActivity = Array.isArray(data?.userActivity) ? data.userActivity : [];
    activityTarget.innerHTML = userActivity.length ? userActivity.map((item) => `<div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"><div class="font-black text-white">${escapeHtml(item.userKey || 'system')}</div><div class="mt-2 text-lg font-black text-sky-300">${escapeHtml(formatNumber(item.actions || 0))} actions</div></div>`).join('') : renderEmpty('No user activity report data.');
}

renderEntryUserOptions = function renderEntryUserOptionsWithSelection(users) {
    adminState.userOptions = Array.isArray(users) ? users : [];
    const select = document.getElementById('adminEntryUserFilter');
    if (!select) return;
    const previousValue = String(select.dataset.selected || select.value || '');
    const options = ['<option value="">All users</option>'];
    adminState.userOptions.forEach((user) => {
        options.push(`<option value="${escapeHtml(user.userKey)}">${escapeHtml(user.name || user.userKey)}</option>`);
    });
    select.innerHTML = options.join('');
    if (previousValue && adminState.userOptions.some((user) => String(user.userKey || '') === previousValue)) {
        select.value = previousValue;
    }
};

function renderNotifications(items) {
    adminState.notifications = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminNotificationsList');
    if (!target) return;
    if (!adminState.notifications.length) {
        target.innerHTML = renderEmpty('No notifications available.');
        return;
    }
    target.innerHTML = adminState.notifications.map((item) => {
        const metaBits = [];
        if (item && item.meta && item.meta.userKey) metaBits.push(String(item.meta.userKey));
        if (item && item.meta && item.meta.companyName) metaBits.push(String(item.meta.companyName));
        if (item && item.meta && item.meta.reportType) metaBits.push(String(item.meta.reportType));
        metaBits.push(formatDateTime(item && item.createdAt));
        return `
            <div class="rounded-2xl border ${item && item.isRead ? 'border-slate-800 bg-slate-950/40' : 'border-orange-400/25 bg-orange-500/10'} p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <div class="font-black text-white">${escapeHtml((item && item.title) || humanizeActivityType(item && item.type))}</div>
                            <span class="admin-badge ${item && item.isRead ? 'admin-badge-slate' : 'admin-badge-orange'}">${item && item.isRead ? 'Read' : 'Unread'}</span>
                        </div>
                        <div class="mt-2 text-sm text-slate-300">${escapeHtml((item && item.message) || 'No message')}</div>
                        <div class="mt-2 text-xs text-slate-500">${escapeHtml(metaBits.join(' • '))}</div>
                    </div>
                    ${item && item.isRead ? '' : `<button type="button" class="no-pdf rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200" onclick='window.markNotificationRead(${JSON.stringify(String(item._id || ''))})'>Mark read</button>`}
                </div>
            </div>
        `;
    }).join('');
}

function renderAnnouncements(items) {
    adminState.announcements = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminAnnouncementsList');
    if (!target) return;
    if (!adminState.announcements.length) {
        target.innerHTML = renderEmpty('No announcements created yet.');
        return;
    }
    target.innerHTML = adminState.announcements.map((item) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div class="flex flex-wrap items-center gap-2">
                        <div class="font-black text-white">${escapeHtml(item && item.title ? item.title : 'Untitled announcement')}</div>
                        <span class="admin-badge ${item && item.isActive ? 'admin-badge-emerald' : 'admin-badge-slate'}">${item && item.isActive ? 'Visible' : 'Hidden'}</span>
                        <span class="admin-badge admin-badge-slate">${escapeHtml((item && item.defaultLanguage) || 'en').toUpperCase()}</span>
                    </div>
                    <div class="mt-2 whitespace-pre-wrap text-sm text-slate-300">${escapeHtml((item && item.message) || '')}</div>
                    <div class="mt-2 text-xs text-slate-500">Target: ${escapeHtml(String((item && item.targetType) || 'all').replace(/_/g, ' '))} • Updated ${escapeHtml(formatDateTime(item && (item.updatedAt || item.createdAt)))}</div>
                    <div class="mt-1 text-xs text-slate-500">Start: ${escapeHtml(formatDateTime(item && item.startsAt))} • End: ${escapeHtml(formatDateTime(item && item.expiresAt))}</div>
                </div>
                <div class="no-pdf flex flex-wrap gap-2">
                    <button type="button" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200" onclick='window.editAnnouncement(${JSON.stringify(String(item && item._id || ''))})'>Edit</button>
                    <button type="button" class="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200" onclick='window.deleteAnnouncement(${JSON.stringify(String(item && item._id || ''))})'>Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderFeatures(flags) {
    adminState.features = flags || {};
    const signupToggle = document.getElementById('featureSignupToggle');
    const pdfToggle = document.getElementById('featurePdfToggle');
    const excelToggle = document.getElementById('featureExcelToggle');
    const maintenanceToggle = document.getElementById('featureMaintenanceToggle');
    if (signupToggle) signupToggle.checked = adminState.features.signupEnabled !== false;
    if (pdfToggle) pdfToggle.checked = adminState.features.pdfEnabled !== false;
    if (excelToggle) excelToggle.checked = adminState.features.excelEnabled !== false;
    if (maintenanceToggle) maintenanceToggle.checked = adminState.features.maintenanceEnabled === true;
    if (adminState.health) renderHealthStatus(adminState.health);
}

function renderErrorLogs(items) {
    adminState.errors = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminErrorLogs');
    if (!target) return;
    if (!adminState.errors.length) {
        target.innerHTML = renderEmpty('No system errors found for the selected filters.');
        return;
    }
    target.innerHTML = adminState.errors.map((item) => {
        const metaText = item && item.meta && Object.keys(item.meta).length ? JSON.stringify(item.meta, null, 2) : '';
        const stackText = String((item && item.stack) || '').trim();
        return `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="admin-badge ${String((item && item.level) || '').toLowerCase() === 'warn' ? 'admin-badge-orange' : 'admin-badge-rose'}">${escapeHtml((item && item.level) || 'error')}</span>
                    <div class="font-black text-white">${escapeHtml((item && item.source) || 'system')}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(formatDateTime(item && item.createdAt))}</div>
                </div>
                <div class="mt-3 text-sm text-slate-300">${escapeHtml((item && item.message) || 'No message')}</div>
                ${metaText ? `<pre class="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">${escapeHtml(metaText)}</pre>` : ''}
                ${stackText ? `<pre class="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">${escapeHtml(stackText.split('\n').slice(0, 6).join('\n'))}</pre>` : ''}
            </div>
        `;
    }).join('');
}

function formatBytes(value) {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
        size /= 1024;
        idx += 1;
    }
    return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function renderCompanyOptions(items) {
    adminState.companyOptions = Array.isArray(items) ? items : [];
    const entrySelect = document.getElementById('adminEntryCompanyFilter');
    const noticeSelect = document.getElementById('announcementTargetCompanies');
    const previousCompany = entrySelect ? String(entrySelect.dataset.selected || entrySelect.value || '') : '';
    if (entrySelect) {
        entrySelect.innerHTML = ['<option value="">All companies</option>'].concat(
            adminState.companyOptions.map((item) => `<option value="${escapeHtml(item.companyName || '')}">${escapeHtml(item.companyName || '--')}</option>`)
        ).join('');
        if (previousCompany && adminState.companyOptions.some((item) => String(item.companyName || '') === previousCompany)) {
            entrySelect.value = previousCompany;
        }
    }
    if (noticeSelect) {
        noticeSelect.innerHTML = adminState.companyOptions.map((item) => `<option value="${escapeHtml(item.companyName || '')}">${escapeHtml(item.companyName || '--')} · ${escapeHtml(item.ownerName || item.userKey || '')}</option>`).join('');
    }
}

function renderHealthStatus(data) {
    adminState.health = data || null;
    const target = document.getElementById('adminHealthStatus');
    if (!target) return;
    if (!adminState.health) {
        target.innerHTML = renderEmpty('No health data available.');
        return;
    }
    target.innerHTML = `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="flex flex-wrap gap-2">
                <span class="admin-badge admin-badge-emerald">Server ${escapeHtml(adminState.health.serverStatus || 'online')}</span>
                <span class="admin-badge ${String(adminState.health.databaseStatus || '').toLowerCase() === 'connected' ? 'admin-badge-emerald' : 'admin-badge-rose'}">DB ${escapeHtml(adminState.health.databaseStatus || 'unknown')}</span>
                <span class="admin-badge admin-badge-slate">API ${escapeHtml(adminState.health.apiStatus || 'online')}</span>
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Uptime</div>
                    <div class="mt-2 text-xl font-black text-white">${escapeHtml(formatNumber(adminState.health.uptimeSeconds || 0))} sec</div>
                </div>
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">DB Latency</div>
                    <div class="mt-2 text-xl font-black text-white">${escapeHtml(formatNumber(adminState.health.dbLatencyMs || 0))} ms</div>
                </div>
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Memory RSS</div>
                    <div class="mt-2 text-xl font-black text-white">${escapeHtml(formatBytes(adminState.health.memory && adminState.health.memory.rss))}</div>
                </div>
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Heap Used</div>
                    <div class="mt-2 text-xl font-black text-white">${escapeHtml(formatBytes(adminState.health.memory && adminState.health.memory.heapUsed))}</div>
                </div>
            </div>
        </div>
    `;
    const snapshot = document.getElementById('adminSettingsSnapshot');
    if (snapshot) {
        snapshot.innerHTML = `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="admin-badge ${adminState.features && adminState.features.maintenanceEnabled ? 'admin-badge-rose' : 'admin-badge-emerald'}">${adminState.features && adminState.features.maintenanceEnabled ? 'Maintenance On' : 'Maintenance Off'}</span>
                    <span class="admin-badge ${String(adminState.health.databaseStatus || '').toLowerCase() === 'connected' ? 'admin-badge-emerald' : 'admin-badge-rose'}">DB ${escapeHtml(adminState.health.databaseStatus || 'unknown')}</span>
                </div>
                <div class="mt-3 text-sm text-slate-300">Started: ${escapeHtml(formatDateTime(adminState.health.startedAt))}</div>
                <div class="mt-2 text-sm text-slate-400">API latency: ${escapeHtml(formatNumber(adminState.health.dbLatencyMs || 0))} ms</div>
            </div>
        `;
    }
}

function renderSecuritySummary(data) {
    adminState.security = data || null;
    const target = document.getElementById('adminSecuritySummary');
    if (!target) return;
    if (!adminState.security) {
        target.innerHTML = renderEmpty('No security activity available.');
        return;
    }
    const suspicious = Array.isArray(adminState.security.suspiciousActivity) ? adminState.security.suspiciousActivity : [];
    const failures = Array.isArray(adminState.security.recentFailures) ? adminState.security.recentFailures.slice(0, 5) : [];
    target.innerHTML = `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Failed Logins</div>
                    <div class="mt-2 text-2xl font-black text-white">${escapeHtml(formatNumber(adminState.security.failedLoginAttempts || 0))}</div>
                </div>
                <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                    <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Blocked Attempts</div>
                    <div class="mt-2 text-2xl font-black text-white">${escapeHtml(formatNumber(adminState.security.blockedLoginAttempts || 0))}</div>
                </div>
            </div>
            <div class="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Suspicious Activity</div>
            <div class="mt-3 space-y-2">${suspicious.length ? suspicious.map((item) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300">${escapeHtml(item.username || 'unknown')} • ${escapeHtml(formatNumber(item.failedAttempts || 0))} failed attempts</div>`).join('') : '<div class="text-sm text-slate-500">No suspicious patterns detected.</div>'}</div>
            <div class="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Recent Failures</div>
            <div class="mt-3 space-y-2">${failures.length ? failures.map((item) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300">${escapeHtml((item.meta && (item.meta.username || item.meta.userKey)) || item.source || 'unknown')} • ${escapeHtml(item.message || '')} <span class="text-slate-500">(${escapeHtml(formatDateTime(item.createdAt))})</span></div>`).join('') : '<div class="text-sm text-slate-500">No failed logins recorded.</div>'}</div>
        </div>
    `;
}

function renderStorageList(items) {
    adminState.storage = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminStorageList');
    if (!target) return;
    if (!adminState.storage.length) {
        target.innerHTML = renderEmpty('No storage data available.');
        return;
    }
    target.innerHTML = adminState.storage.slice(0, 10).map((item) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="font-black text-white">${escapeHtml(item.name || item.userKey || '--')}</div>
                    <div class="mt-1 text-xs text-slate-500">${escapeHtml(item.companyName || '')} ${item.vehicleNumber ? `• ${escapeHtml(item.vehicleNumber)}` : ''}</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-black text-orange-300">${escapeHtml(formatBytes(item.approxBytes || 0))}</div>
                    <div class="text-xs text-slate-500">${escapeHtml(formatNumber(item.totalEntries || 0))} entries</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderVehicleStats(items) {
    adminState.vehicleStats = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminVehicleStats');
    if (!target) return;
    if (!adminState.vehicleStats.length) {
        target.innerHTML = renderEmpty('No vehicle stats available.');
        return;
    }
    target.innerHTML = adminState.vehicleStats.slice(0, 10).map((item) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="font-black text-white">${escapeHtml(item.vehicleNumber || '--')}</div>
            <div class="mt-1 text-xs text-slate-500">${escapeHtml(item.userName || item.userKey || '')} • ${escapeHtml(item.companyName || '')}</div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><div class="text-slate-500">Trips</div><div class="font-black text-sky-300">${escapeHtml(formatNumber(item.totalTrips || 0))}</div></div>
                <div><div class="text-slate-500">KM</div><div class="font-black text-emerald-300">${escapeHtml(formatNumber(item.totalKm || 0))}</div></div>
                <div><div class="text-slate-500">Profit</div><div class="font-black text-orange-300">₹${escapeHtml(formatNumber(item.totalProfit || 0))}</div></div>
            </div>
        </div>
    `).join('');
}

function renderRouteAnalytics(items) {
    adminState.routeAnalytics = Array.isArray(items) ? items : [];
    const target = document.getElementById('adminRouteAnalytics');
    if (!target) return;
    if (!adminState.routeAnalytics.length) {
        target.innerHTML = renderEmpty('No route analytics available.');
        return;
    }
    target.innerHTML = adminState.routeAnalytics.slice(0, 10).map((item) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="font-black text-white">${escapeHtml(item.route || '--')}</div>
            <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div><div class="text-slate-500">Trips</div><div class="font-black text-sky-300">${escapeHtml(formatNumber(item.totalTrips || 0))}</div></div>
                <div><div class="text-slate-500">Revenue</div><div class="font-black text-orange-300">₹${escapeHtml(formatNumber(item.totalRevenue || 0))}</div></div>
                <div><div class="text-slate-500">KM</div><div class="font-black text-emerald-300">${escapeHtml(formatNumber(item.totalKm || 0))}</div></div>
            </div>
        </div>
    `).join('');
}

function renderProfitAnalytics(data) {
    adminState.profitAnalytics = data || null;
    const target = document.getElementById('adminProfitAnalytics');
    const leaderboardTarget = document.getElementById('adminLeaderboard');
    if (target) {
        if (!adminState.profitAnalytics) {
            target.innerHTML = renderEmpty('No profit analytics available.');
        } else {
            const months = Array.isArray(adminState.profitAnalytics.monthlyProfit) ? adminState.profitAnalytics.monthlyProfit.slice(-4) : [];
            const companies = Array.isArray(adminState.profitAnalytics.companyProfit) ? adminState.profitAnalytics.companyProfit.slice(0, 4) : [];
            target.innerHTML = `
                <div class="grid gap-3 sm:grid-cols-3">
                    <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Overall Profit</div><div class="mt-2 text-2xl font-black text-white">₹${escapeHtml(formatNumber(adminState.profitAnalytics.overallProfit || 0))}</div></div>
                    <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Average / Trip</div><div class="mt-2 text-2xl font-black text-white">₹${escapeHtml(formatNumber(adminState.profitAnalytics.averageProfitPerTrip || 0))}</div></div>
                    <div class="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"><div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Total Trips</div><div class="mt-2 text-2xl font-black text-white">${escapeHtml(formatNumber(adminState.profitAnalytics.totalTrips || 0))}</div></div>
                </div>
                <div class="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Monthly Profit</div>
                <div class="mt-3 space-y-2">${months.length ? months.map((row) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300">${escapeHtml(row.month || '--')} • ₹${escapeHtml(formatNumber(row.profit || 0))}</div>`).join('') : '<div class="text-sm text-slate-500">No monthly profit data.</div>'}</div>
                <div class="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Company-wise Profit</div>
                <div class="mt-3 space-y-2">${companies.length ? companies.map((row) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300">${escapeHtml(row.companyName || '--')} • ₹${escapeHtml(formatNumber(row.profit || 0))}</div>`).join('') : '<div class="text-sm text-slate-500">No company profit data.</div>'}</div>
            `;
        }
    }
    if (leaderboardTarget) {
        const leaderboard = Array.isArray(adminState.profitAnalytics && adminState.profitAnalytics.leaderboard) ? adminState.profitAnalytics.leaderboard : [];
        leaderboardTarget.innerHTML = leaderboard.length ? leaderboard.slice(0, 10).map((item, index) => `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <div class="font-black text-white">#${escapeHtml(index + 1)} ${escapeHtml(item.userName || item.userKey || '--')}</div>
                        <div class="mt-1 text-xs text-slate-500">${escapeHtml(formatNumber(item.totalTrips || 0))} trips</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-black text-orange-300">₹${escapeHtml(formatNumber(item.totalProfit || 0))}</div>
                        <div class="text-xs text-slate-500">profit</div>
                    </div>
                </div>
            </div>
        `).join('') : renderEmpty('No leaderboard data available.');
    }
}

function renderInsights(data) {
    adminState.insights = data || null;
    const target = document.getElementById('adminInsightsPanel');
    if (!target) return;
    if (!adminState.insights) {
        target.innerHTML = renderEmpty('No insights available.');
        return;
    }
    const peakHours = Array.isArray(adminState.insights.peakTripHours) ? adminState.insights.peakTripHours.slice(0, 4) : [];
    target.innerHTML = `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="text-sm text-slate-300">Most active user: <span class="font-black text-white">${escapeHtml(adminState.insights.mostActiveUser ? adminState.insights.mostActiveUser.name : '--')}</span></div>
            <div class="mt-2 text-sm text-slate-300">Most active company: <span class="font-black text-white">${escapeHtml(adminState.insights.mostActiveCompany ? adminState.insights.mostActiveCompany.companyName : '--')}</span></div>
            <div class="mt-2 text-sm text-slate-300">Most used route: <span class="font-black text-white">${escapeHtml(adminState.insights.mostUsedRoute ? adminState.insights.mostUsedRoute.route : '--')}</span></div>
            <div class="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Peak Trip Hours</div>
            <div class="mt-3 space-y-2">${peakHours.length ? peakHours.map((row) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300">${escapeHtml(row.hour || '--')}:00 • ${escapeHtml(formatNumber(row.count || 0))} trips</div>`).join('') : '<div class="text-sm text-slate-500">No peak hour data.</div>'}</div>
        </div>
    `;
}

function renderEmailPreview(data) {
    adminState.emailPreview = data || null;
    const target = document.getElementById('adminEmailReportPreview');
    if (!target) return;
    if (!adminState.emailPreview) {
        target.innerHTML = renderEmpty('No email report preview loaded.');
        return;
    }
    const preview = adminState.emailPreview.preview || {};
    target.innerHTML = `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="font-black text-white">${escapeHtml(adminState.emailPreview.subject || 'System Summary')}</div>
            <div class="mt-3 space-y-2 text-sm text-slate-300">
                <div>Total trips: <span class="font-black text-white">${escapeHtml(formatNumber(preview.totalTrips || 0))}</span></div>
                <div>Total revenue: <span class="font-black text-white">₹${escapeHtml(formatNumber(preview.totalRevenue || 0))}</span></div>
                <div>Overall profit: <span class="font-black text-white">₹${escapeHtml(formatNumber(preview.overallProfit || 0))}</span></div>
                <div>Active users: <span class="font-black text-white">${escapeHtml(formatNumber(preview.activeUsers || 0))}</span></div>
            </div>
        </div>
    `;
}

function renderGlobalSearchResults(data) {
    adminState.globalSearch = data || {};
    const target = document.getElementById('adminGlobalSearchResults');
    if (!target) return;
    const users = Array.isArray(adminState.globalSearch.users) ? adminState.globalSearch.users : [];
    const companies = Array.isArray(adminState.globalSearch.companies) ? adminState.globalSearch.companies : [];
    const entries = Array.isArray(adminState.globalSearch.entries) ? adminState.globalSearch.entries : [];
    if (!users.length && !companies.length && !entries.length) {
        target.innerHTML = renderEmpty('No global search results yet.');
        return;
    }
    target.innerHTML = `
        <div class="grid gap-4 xl:grid-cols-3">
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Users</div>
                <div class="mt-3 space-y-2">${users.length ? users.map((item) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300"><div class="font-black text-white">${escapeHtml(item.name || item.userKey || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(item.mobileNumber || '')} ${item.vehicleNumber ? `• ${escapeHtml(item.vehicleNumber)}` : ''}</div></div>`).join('') : '<div class="text-sm text-slate-500">No user matches.</div>'}</div>
            </div>
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Companies</div>
                <div class="mt-3 space-y-2">${companies.length ? companies.map((item) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300"><div class="font-black text-white">${escapeHtml(item.companyName || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(item.ownerName || item.userKey || '')}</div></div>`).join('') : '<div class="text-sm text-slate-500">No company matches.</div>'}</div>
            </div>
            <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div class="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Entries</div>
                <div class="mt-3 space-y-2">${entries.length ? entries.map((item) => `<div class="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-300"><div class="font-black text-white">${escapeHtml(item.tripId || '--')}</div><div class="mt-1 text-xs text-slate-500">${escapeHtml(item.userName || item.userKey || '')} • ${escapeHtml(item.companyName || '')}</div><div class="mt-1 text-xs text-slate-400">${escapeHtml((item.pickup || '--') + ' -> ' + (item.drop || '--'))}</div></div>`).join('') : '<div class="text-sm text-slate-500">No entry matches.</div>'}</div>
            </div>
        </div>
    `;
}

function getSelectedValues(id) {
    const element = document.getElementById(id);
    if (!element) return [];
    return Array.from(element.selectedOptions || []).map((option) => String(option.value || '').trim()).filter(Boolean);
}

function fillAdminUserModal(user) {
    adminState.currentUser = user || null;
    const modal = document.getElementById('adminUserModal');
    if (!modal || !user) return;
    document.getElementById('adminUserName').value = user.name || '';
    document.getElementById('adminUserMobile').value = user.mobileNumber || '';
    document.getElementById('adminUserVehicle').value = user.vehicleNumber || '';
    document.getElementById('adminUserEmail').value = user.email || '';
    document.getElementById('adminUserCompanyCount').textContent = formatNumber(user.totalCompanies || 0);
    document.getElementById('adminUserEntryCount').textContent = formatNumber(user.totalEntries || 0);
    document.getElementById('adminUserStatusText').textContent = user.isDefaultUser ? 'Protected' : (user.isBlocked ? 'Blocked' : 'Active');
    document.getElementById('adminUserModalCopy').textContent = user.isDefaultUser
        ? 'Default accounts are visible but not editable from admin user management.'
        : `Edit profile for ${user.name || user.userKey}.`;
    const saveBtn = document.getElementById('adminUserSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = !!user.isDefaultUser;
        saveBtn.classList.toggle('opacity-50', !!user.isDefaultUser);
        saveBtn.classList.toggle('cursor-not-allowed', !!user.isDefaultUser);
    }
    const resetBtn = document.getElementById('adminUserResetPasswordBtn');
    if (resetBtn) {
        resetBtn.disabled = !!user.isDefaultUser;
        resetBtn.classList.toggle('opacity-50', !!user.isDefaultUser);
        resetBtn.classList.toggle('cursor-not-allowed', !!user.isDefaultUser);
    }
    const entriesTarget = document.getElementById('adminUserRecentEntries');
    const recentEntries = Array.isArray(user.recentEntries) ? user.recentEntries : [];
    entriesTarget.innerHTML = recentEntries.length ? recentEntries.map((entry) => `
        <div class="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="font-black text-white">${escapeHtml(entry.tripId || '--')}</div>
                <div class="text-xs text-slate-500">${escapeHtml(formatDateTime(entry.createdAt))}</div>
            </div>
            <div class="mt-2 text-sm text-slate-300">${escapeHtml((entry.pickup || '--') + ' -> ' + (entry.drop || '--'))}</div>
            <div class="mt-2 text-xs text-slate-500">${escapeHtml(String(entry.date || '--'))} • ${escapeHtml(formatNumber(entry.km || 0))} km • ${escapeHtml(String(entry.total || '--'))}</div>
        </div>
    `).join('') : renderEmpty('No recent entries for this user.');
    modal.classList.add('open');
}

function closeAdminUserModal() {
    const modal = document.getElementById('adminUserModal');
    if (modal) modal.classList.remove('open');
    adminState.currentUser = null;
}

async function openAdminUserModal(userKey) {
    try {
        const user = await adminFetch(`/api/admin/users/${encodeURIComponent(String(userKey || ''))}`);
        fillAdminUserModal(user);
    } catch (err) {
        showAdminToast(err.message || 'Failed to load user details');
    }
}

async function saveAdminUser() {
    try {
        if (!adminState.currentUser || adminState.currentUser.isDefaultUser) {
            showAdminToast('Default users cannot be edited here');
            return;
        }
        const payload = {
            name: document.getElementById('adminUserName').value,
            mobileNumber: document.getElementById('adminUserMobile').value,
            vehicleNumber: document.getElementById('adminUserVehicle').value,
            email: document.getElementById('adminUserEmail').value
        };
        const updated = await adminFetch(`/api/admin/users/${encodeURIComponent(String(adminState.currentUser.userKey || ''))}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        fillAdminUserModal(Object.assign({}, adminState.currentUser, updated));
        await Promise.allSettled([loadAdminUsers(), loadAdminDashboard(), loadAdminAnalytics(), loadAdminUserOptions(), loadAdminCompanies()]);
        showAdminToast('User updated');
    } catch (err) {
        showAdminToast(err.message || 'Failed to update user');
    }
}

async function resetAdminUserPassword() {
    try {
        if (!adminState.currentUser || adminState.currentUser.isDefaultUser) {
            showAdminToast('Default users do not support password reset here');
            return;
        }
        const nextPassword = window.prompt('Enter a new password for this user. Leave blank to generate a temporary password.', '');
        if (nextPassword === null) return;
        const payload = nextPassword ? { newPassword: nextPassword } : {};
        const result = await adminFetch(`/api/admin/users/${encodeURIComponent(String(adminState.currentUser.userKey || ''))}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showAdminToast(`Password reset. Temporary password: ${result && result.password ? result.password : 'updated'}`);
        await loadAdminAdminActivity();
    } catch (err) {
        showAdminToast(err.message || 'Failed to reset password');
    }
}

async function toggleAdminUserBlock(userKey, blocked) {
    const actionLabel = blocked ? 'block' : 'unblock';
    if (!window.confirm(`Do you want to ${actionLabel} this user?`)) return;
    try {
        await adminFetch(`/api/admin/users/${encodeURIComponent(String(userKey || ''))}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocked: !!blocked })
        });
        await Promise.allSettled([loadAdminUsers(), loadAdminDashboard(), loadAdminAnalytics(), loadAdminUserOptions(), loadAdminNotifications(), loadAdminActivity()]);
        if (adminState.currentUser && String(adminState.currentUser.userKey || '') === String(userKey || '')) {
            await openAdminUserModal(userKey);
        }
        showAdminToast(`User ${actionLabel}ed`);
    } catch (err) {
        showAdminToast(err.message || `Failed to ${actionLabel} user`);
    }
}

async function deleteAdminUser(userKey) {
    if (!window.confirm('Delete this user account and all associated Tripset data permanently?')) return;
    try {
        await adminFetch(`/api/admin/users/${encodeURIComponent(String(userKey || ''))}`, { method: 'DELETE' });
        if (adminState.currentUser && String(adminState.currentUser.userKey || '') === String(userKey || '')) {
            closeAdminUserModal();
        }
        await Promise.allSettled([loadAdminUsers(), loadAdminDashboard(), loadAdminAnalytics(), loadAdminUserOptions(), loadAdminCompanies(), loadAdminEntries(), loadAdminReports(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('User deleted');
    } catch (err) {
        showAdminToast(err.message || 'Failed to delete user');
    }
}

function openAdminCompanyModal(userKey, companyName, rate) {
    adminState.currentCompany = {
        userKey: String(userKey || ''),
        companyName: String(companyName || ''),
        rate: Number(rate || 0)
    };
    document.getElementById('adminCompanyName').value = adminState.currentCompany.companyName;
    document.getElementById('adminCompanyRate').value = String(adminState.currentCompany.rate || '');
    document.getElementById('adminCompanyModal').classList.add('open');
}

function closeAdminCompanyModal() {
    const modal = document.getElementById('adminCompanyModal');
    if (modal) modal.classList.remove('open');
    adminState.currentCompany = null;
}

async function saveAdminCompany() {
    try {
        if (!adminState.currentCompany || !adminState.currentCompany.userKey) {
            showAdminToast('Select a company first');
            return;
        }
        const payload = {
            companyName: document.getElementById('adminCompanyName').value,
            rate: document.getElementById('adminCompanyRate').value
        };
        await adminFetch(`/api/admin/companies/${encodeURIComponent(adminState.currentCompany.userKey)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        closeAdminCompanyModal();
        await Promise.allSettled([loadAdminCompanies(), loadAdminDashboard(), loadAdminUsers(), loadAdminEntries(), loadAdminReports(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('Company updated');
    } catch (err) {
        showAdminToast(err.message || 'Failed to update company');
    }
}

async function resetAdminCompany(userKey) {
    if (!window.confirm('Reset this company to default Tripset values?')) return;
    try {
        await adminFetch(`/api/admin/companies/${encodeURIComponent(String(userKey || ''))}`, { method: 'DELETE' });
        if (adminState.currentCompany && String(adminState.currentCompany.userKey || '') === String(userKey || '')) {
            closeAdminCompanyModal();
        }
        await Promise.allSettled([loadAdminCompanies(), loadAdminDashboard(), loadAdminUsers(), loadAdminEntries(), loadAdminReports(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('Company reset');
    } catch (err) {
        showAdminToast(err.message || 'Failed to reset company');
    }
}

function buildQueryString(params) {
    const searchParams = new URLSearchParams();
    Object.keys(params || {}).forEach((key) => {
        const value = params[key];
        if (value == null) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        searchParams.set(key, normalized);
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

async function loadAdminAuthStatus() {
    const status = await adminFetch('/api/admin/auth/status');
    adminState.authStatus = status || {};
    if (!status || !status.isAuthenticated) {
        window.location.href = '/admin/login';
        return null;
    }
    const username = status.username || 'admin';
    const sessionUser = document.getElementById('adminSessionUser');
    const settingsUser = document.getElementById('adminSettingsUser');
    if (sessionUser) sessionUser.textContent = username;
    if (settingsUser) settingsUser.textContent = username;
    return status;
}

async function loadAdminDashboard() {
    const data = await adminFetch('/api/admin/dashboard');
    renderDashboard(data || {});
    return data;
}

async function loadAdminAnalytics() {
    const data = await adminFetch('/api/admin/analytics');
    renderAnalytics(data || {});
    return data;
}

async function loadAdminUsers() {
    const search = document.getElementById('adminUserSearch');
    const data = await adminFetch(`/api/admin/users${buildQueryString({ search: search ? search.value : '' })}`);
    renderUsers(data || []);
    return data;
}

async function loadAdminUserOptions() {
    const data = await adminFetch('/api/admin/users?compact=1');
    renderEntryUserOptions(data || []);
    const noticeSelect = document.getElementById('announcementTargetUsers');
    if (noticeSelect) {
        noticeSelect.innerHTML = (data || []).map((user) => `<option value="${escapeHtml(user.userKey || '')}">${escapeHtml(user.name || user.userKey || '--')}</option>`).join('');
    }
    return data;
}

async function loadAdminCompanyOptions() {
    const data = await adminFetch('/api/admin/companies?compact=1');
    renderCompanyOptions(data || []);
    return data;
}

async function loadAdminCompanies() {
    const search = document.getElementById('adminCompanySearch');
    const data = await adminFetch(`/api/admin/companies${buildQueryString({ search: search ? search.value : '' })}`);
    renderCompanies(data || []);
    return data;
}

async function loadAdminEntries() {
    const userFilter = document.getElementById('adminEntryUserFilter');
    const companyFilter = document.getElementById('adminEntryCompanyFilter');
    const search = document.getElementById('adminEntrySearch');
    const from = document.getElementById('adminEntryFrom');
    const to = document.getElementById('adminEntryTo');
    if (userFilter) userFilter.dataset.selected = userFilter.value || '';
    if (companyFilter) companyFilter.dataset.selected = companyFilter.value || '';
    const payload = await adminFetch(`/api/admin/entries${buildQueryString({
        userKey: userFilter ? userFilter.value : '',
        company: companyFilter ? companyFilter.value : '',
        search: search ? search.value : '',
        from: from ? from.value : '',
        to: to ? to.value : '',
        limit: 400
    })}`);
    renderEntries(payload || {});
    return payload;
}

async function loadAdminReports() {
    const data = await adminFetch('/api/admin/reports/summary');
    renderReports(data || {});
    return data;
}

async function loadAdminActivity() {
    const search = document.getElementById('adminActivitySearch');
    const from = document.getElementById('adminActivityFrom');
    const to = document.getElementById('adminActivityTo');
    const data = await adminFetch(`/api/admin/user-activity${buildQueryString({
        search: search ? search.value : '',
        from: from ? from.value : '',
        to: to ? to.value : '',
        limit: 150
    })}`);
    adminState.activity = Array.isArray(data) ? data : [];
    renderActivityCards(adminState.activity, 'adminReportActivityLogs');
    return data;
}

async function loadAdminNotifications() {
    const data = await adminFetch('/api/admin/notifications?limit=30');
    renderNotifications(data || []);
    return data;
}

async function loadAdminAnnouncements() {
    const data = await adminFetch('/api/admin/announcements?includeInactive=1');
    renderAnnouncements(data || []);
    return data;
}

async function loadAdminFeatures() {
    const data = await adminFetch('/api/admin/features');
    renderFeatures(data || {});
    return data;
}

async function loadAdminErrors() {
    const search = document.getElementById('adminErrorSearch');
    const from = document.getElementById('adminErrorFrom');
    const to = document.getElementById('adminErrorTo');
    const data = await adminFetch(`/api/admin/errors${buildQueryString({
        search: search ? search.value : '',
        from: from ? from.value : '',
        to: to ? to.value : '',
        limit: 120
    })}`);
    renderErrorLogs(data || []);
    return data;
}

async function loadAdminHealth() {
    const data = await adminFetch('/api/admin/health');
    renderHealthStatus(data || {});
    return data;
}

async function loadAdminSecurity() {
    const data = await adminFetch('/api/admin/security');
    renderSecuritySummary(data || {});
    return data;
}

async function loadAdminStorage() {
    const data = await adminFetch('/api/admin/storage?limit=20');
    renderStorageList(data || []);
    return data;
}

async function loadAdminVehicleStats() {
    const data = await adminFetch('/api/admin/vehicle-stats?limit=20');
    renderVehicleStats(data || []);
    return data;
}

async function loadAdminRouteAnalytics() {
    const data = await adminFetch('/api/admin/route-analytics?limit=20');
    renderRouteAnalytics(data || []);
    return data;
}

async function loadAdminProfitAnalytics() {
    const data = await adminFetch('/api/admin/profit-analytics');
    renderProfitAnalytics(data || {});
    return data;
}

async function loadAdminInsights() {
    const data = await adminFetch('/api/admin/insights');
    renderInsights(data || {});
    return data;
}

async function loadAdminEmailPreview() {
    const rangeSelect = document.getElementById('adminEmailRange');
    const range = rangeSelect ? rangeSelect.value : 'daily';
    const data = await adminFetch(`/api/admin/email-report/preview${buildQueryString({ range })}`);
    renderEmailPreview(data || {});
    return data;
}

async function sendAdminEmailReport() {
    try {
        const rangeSelect = document.getElementById('adminEmailRange');
        const range = rangeSelect ? rangeSelect.value : 'daily';
        const data = await adminFetch('/api/admin/email-report/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ range })
        });
        renderEmailPreview({ subject: `Tripset ${range} system summary`, preview: data.preview || {}, deliveryMode: data.deliveryMode || 'preview' });
        await loadAdminAdminActivity();
        showAdminToast('Automated email report generated');
    } catch (err) {
        showAdminToast(err.message || 'Failed to generate email report');
    }
}

async function runAdminGlobalSearch() {
    try {
        const search = document.getElementById('adminGlobalSearch');
        const query = search ? search.value : '';
        if (!String(query || '').trim()) {
            renderGlobalSearchResults({ users: [], companies: [], entries: [] });
            showAdminToast('Enter a global search term');
            return;
        }
        const data = await adminFetch(`/api/admin/search${buildQueryString({ q: query, limit: 12 })}`);
        renderGlobalSearchResults(data || {});
        setAdminSection('reports');
    } catch (err) {
        showAdminToast(err.message || 'Failed to run global search');
    }
}

async function loadAdminAdminActivity() {
    const search = document.getElementById('adminAdminActivitySearch');
    const from = document.getElementById('adminAdminActivityFrom');
    const to = document.getElementById('adminAdminActivityTo');
    const data = await adminFetch(`/api/admin/activity${buildQueryString({
        scope: 'admin',
        search: search ? search.value : '',
        from: from ? from.value : '',
        to: to ? to.value : '',
        limit: 120
    })}`);
    adminState.adminActivity = Array.isArray(data) ? data : [];
    renderActivityCards(adminState.adminActivity, 'adminAdminActivityLogs');
    return data;
}

function resetAnnouncementForm() {
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementMessage').value = '';
    document.getElementById('announcementLanguage').value = 'en';
    document.getElementById('announcementTargetType').value = 'all';
    document.getElementById('announcementStartsAt').value = '';
    document.getElementById('announcementExpiresAt').value = '';
    document.getElementById('announcementStatus').value = 'active';
    document.getElementById('announcementActive').checked = true;
    ['announcementTargetUsers', 'announcementTargetCompanies'].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        Array.from(element.options || []).forEach((option) => {
            option.selected = false;
        });
    });
    ['announcementTitleEn', 'announcementMessageEn', 'announcementTitleGu', 'announcementMessageGu', 'announcementTitleHi', 'announcementMessageHi'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    handleAnnouncementTargetChange();
}

function handleAnnouncementTargetChange() {
    const targetType = document.getElementById('announcementTargetType') ? document.getElementById('announcementTargetType').value : 'all';
    const userWrap = document.getElementById('announcementUserSelectorWrap');
    const companyWrap = document.getElementById('announcementCompanySelectorWrap');
    if (userWrap) userWrap.classList.toggle('hidden', targetType !== 'selected_users');
    if (companyWrap) companyWrap.classList.toggle('hidden', targetType !== 'selected_company_users');
}

function editAnnouncement(id) {
    const announcement = adminState.announcements.find((item) => String(item && item._id || '') === String(id || ''));
    if (!announcement) {
        showAdminToast('Announcement not found');
        return;
    }
    document.getElementById('announcementId').value = String(announcement._id || '');
    document.getElementById('announcementTitle').value = announcement.title || '';
    document.getElementById('announcementMessage').value = announcement.message || '';
    document.getElementById('announcementLanguage').value = announcement.defaultLanguage || announcement.language || 'en';
    document.getElementById('announcementTargetType').value = announcement.targetType || 'all';
    document.getElementById('announcementStartsAt').value = announcement.startsAt ? new Date(announcement.startsAt).toISOString().slice(0, 16) : '';
    document.getElementById('announcementExpiresAt').value = announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : '';
    document.getElementById('announcementStatus').value = announcement.status === 'expired' ? 'expired' : 'active';
    document.getElementById('announcementActive').checked = announcement.isActive !== false;
    const translations = announcement.translations && typeof announcement.translations === 'object' ? announcement.translations : {};
    document.getElementById('announcementTitleEn').value = translations.en && translations.en.title ? translations.en.title : '';
    document.getElementById('announcementMessageEn').value = translations.en && translations.en.message ? translations.en.message : '';
    document.getElementById('announcementTitleGu').value = translations.gu && translations.gu.title ? translations.gu.title : '';
    document.getElementById('announcementMessageGu').value = translations.gu && translations.gu.message ? translations.gu.message : '';
    document.getElementById('announcementTitleHi').value = translations.hi && translations.hi.title ? translations.hi.title : '';
    document.getElementById('announcementMessageHi').value = translations.hi && translations.hi.message ? translations.hi.message : '';
    const selectedUsers = new Set(Array.isArray(announcement.targetUserKeys) ? announcement.targetUserKeys.map((value) => String(value || '')) : []);
    const selectedCompanies = new Set(Array.isArray(announcement.targetCompanyNames) ? announcement.targetCompanyNames.map((value) => String(value || '')) : []);
    const userSelect = document.getElementById('announcementTargetUsers');
    const companySelect = document.getElementById('announcementTargetCompanies');
    if (userSelect) {
        Array.from(userSelect.options || []).forEach((option) => {
            option.selected = selectedUsers.has(String(option.value || ''));
        });
    }
    if (companySelect) {
        Array.from(companySelect.options || []).forEach((option) => {
            option.selected = selectedCompanies.has(String(option.value || ''));
        });
    }
    handleAnnouncementTargetChange();
    setAdminSection('announcements');
}

async function saveAnnouncement() {
    try {
        const id = document.getElementById('announcementId').value;
        const payload = {
            title: document.getElementById('announcementTitle').value,
            message: document.getElementById('announcementMessage').value,
            language: document.getElementById('announcementLanguage').value,
            targetType: document.getElementById('announcementTargetType').value,
            targetUserKeys: getSelectedValues('announcementTargetUsers'),
            targetCompanyNames: getSelectedValues('announcementTargetCompanies'),
            startsAt: document.getElementById('announcementStartsAt').value,
            expiresAt: document.getElementById('announcementExpiresAt').value,
            status: document.getElementById('announcementStatus').value,
            isActive: !!document.getElementById('announcementActive').checked,
            translations: {
                en: {
                    title: document.getElementById('announcementTitleEn').value,
                    message: document.getElementById('announcementMessageEn').value
                },
                gu: {
                    title: document.getElementById('announcementTitleGu').value,
                    message: document.getElementById('announcementMessageGu').value
                },
                hi: {
                    title: document.getElementById('announcementTitleHi').value,
                    message: document.getElementById('announcementMessageHi').value
                }
            }
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/announcements/${encodeURIComponent(id)}` : '/api/admin/announcements';
        await adminFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        resetAnnouncementForm();
        await Promise.allSettled([loadAdminAnnouncements(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast(id ? 'Announcement updated' : 'Announcement created');
    } catch (err) {
        showAdminToast(err.message || 'Failed to save announcement');
    }
}

async function deleteAnnouncement(id) {
    if (!window.confirm('Delete this announcement?')) return;
    try {
        await adminFetch(`/api/admin/announcements/${encodeURIComponent(String(id || ''))}`, { method: 'DELETE' });
        if (String(document.getElementById('announcementId').value || '') === String(id || '')) {
            resetAnnouncementForm();
        }
        await Promise.allSettled([loadAdminAnnouncements(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('Announcement deleted');
    } catch (err) {
        showAdminToast(err.message || 'Failed to delete announcement');
    }
}

async function saveAdminFeatures() {
    try {
        const payload = {
            signupEnabled: !!document.getElementById('featureSignupToggle').checked,
            pdfEnabled: !!document.getElementById('featurePdfToggle').checked,
            excelEnabled: !!document.getElementById('featureExcelToggle').checked,
            maintenanceEnabled: !!document.getElementById('featureMaintenanceToggle').checked
        };
        const data = await adminFetch('/api/admin/features', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        renderFeatures(data || payload);
        await Promise.allSettled([loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('Feature controls updated');
    } catch (err) {
        showAdminToast(err.message || 'Failed to save feature controls');
    }
}

async function markNotificationRead(id) {
    try {
        await adminFetch(`/api/admin/notifications/${encodeURIComponent(String(id || ''))}/read`, { method: 'POST' });
        await loadAdminNotifications();
    } catch (err) {
        showAdminToast(err.message || 'Failed to update notification');
    }
}

async function markAllNotificationsRead() {
    try {
        await adminFetch('/api/admin/notifications/read-all', { method: 'POST' });
        await loadAdminNotifications();
        showAdminToast('All notifications marked as read');
    } catch (err) {
        showAdminToast(err.message || 'Failed to update notifications');
    }
}

async function deleteAdminEntry(userKey, entryId) {
    if (!window.confirm('Delete this entry?')) return;
    try {
        await adminFetch(`/api/admin/entries/${encodeURIComponent(String(userKey || ''))}/${encodeURIComponent(String(entryId || ''))}`, {
            method: 'DELETE'
        });
        await Promise.allSettled([loadAdminEntries(), loadAdminDashboard(), loadAdminAnalytics(), loadAdminReports(), loadAdminNotifications(), loadAdminActivity()]);
        showAdminToast('Entry deleted');
    } catch (err) {
        showAdminToast(err.message || 'Failed to delete entry');
    }
}

async function exportAdminReportPdf() {
    try {
        if (typeof html2pdf === 'undefined') {
            showAdminToast('PDF export library is not available');
            return;
        }
        const target = document.getElementById('adminReportExport');
        if (!target) {
            showAdminToast('Report section not found');
            return;
        }
        const filename = `tripset-admin-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        await html2pdf().set({
            margin: [8, 8, 8, 8],
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(target).save();
        showAdminToast('PDF exported');
    } catch (err) {
        showAdminToast(err.message || 'Failed to export PDF');
    }
}

async function exportAdminReportExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            showAdminToast('Excel export library is not available');
            return;
        }
        if (!adminState.reports) {
            await loadAdminReports();
        }
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
            {
                Users: Number(adminState.reports?.totals?.users || 0),
                Entries: Number(adminState.reports?.totals?.entries || 0),
                Companies: Number(adminState.reports?.totals?.companies || 0),
                Trips: Number(adminState.reports?.totals?.trips || 0)
            }
        ]), 'Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((adminState.reports?.companyWise || []).map((item) => ({
            Owner: item.ownerName || '',
            User: item.userKey || '',
            Company: item.companyName || '',
            Entries: Number(item.totalEntries || 0)
        }))), 'Company Wise');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((adminState.activity || []).map((item) => ({
            User: item.userName || item.userKey || item.targetUserKey || '',
            Company: item.companyName || '',
            Vehicle: item.vehicleNumber || '',
            Action: humanizeActivityType(item.type),
            Message: item.message || '',
            DateTime: formatDateTime(item.createdAt)
        }))), 'Activity Logs');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((adminState.adminActivity || []).map((item) => ({
            Actor: item.actor || '',
            TargetUser: item.targetUserKey || '',
            Action: humanizeActivityType(item.type),
            Message: item.message || '',
            DateTime: formatDateTime(item.createdAt)
        }))), 'Admin Activity');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((adminState.storage || []).map((item) => ({
            User: item.name || item.userKey || '',
            Company: item.companyName || '',
            Vehicle: item.vehicleNumber || '',
            Entries: Number(item.totalEntries || 0),
            ApproxBytes: Number(item.approxBytes || 0)
        }))), 'Storage');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((adminState.vehicleStats || []).map((item) => ({
            User: item.userName || item.userKey || '',
            Company: item.companyName || '',
            Vehicle: item.vehicleNumber || '',
            Trips: Number(item.totalTrips || 0),
            KM: Number(item.totalKm || 0),
            Profit: Number(item.totalProfit || 0)
        }))), 'Vehicle Stats');
        XLSX.writeFile(workbook, `tripset-admin-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
        showAdminToast('Excel exported');
    } catch (err) {
        showAdminToast(err.message || 'Failed to export Excel');
    }
}

async function downloadAdminBackup() {
    try {
        const response = await fetch('/api/admin/backup/export', { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/admin/login';
            return;
        }
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload && payload.error ? payload.error : 'Failed to download backup');
        }
        const disposition = String(response.headers.get('content-disposition') || '');
        const match = disposition.match(/filename=\"?([^"]+)\"?/i);
        const filename = match && match[1] ? match[1] : `tripset-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showAdminToast('Backup downloaded');
    } catch (err) {
        showAdminToast(err.message || 'Failed to download backup');
    }
}

async function restoreAdminBackup() {
    try {
        const input = document.getElementById('adminBackupFile');
        const file = input && input.files && input.files[0];
        if (!file) {
            showAdminToast('Choose a backup file first');
            return;
        }
        if (!window.confirm('Restore this backup? Existing admin collections and user databases will be overwritten.')) return;
        const raw = await file.text();
        const backup = JSON.parse(raw);
        await adminFetch('/api/admin/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backup })
        });
        if (input) input.value = '';
        await refreshAdminData();
        showAdminToast('Backup restored');
    } catch (err) {
        showAdminToast(err.message || 'Failed to restore backup');
    }
}

async function logoutAdmin() {
    try {
        await adminFetch('/admin/auth/logout', { method: 'POST' });
    } catch (err) {
        // Ignore logout errors and redirect anyway.
    }
    window.location.href = '/admin/login';
}

async function refreshAdminData() {
    try {
        await loadAdminAuthStatus();
        await Promise.allSettled([
            loadAdminDashboard(),
            loadAdminAnalytics(),
            loadAdminUsers(),
            loadAdminUserOptions(),
            loadAdminCompanyOptions(),
            loadAdminCompanies(),
            loadAdminEntries(),
            loadAdminReports(),
            loadAdminActivity(),
            loadAdminAdminActivity(),
            loadAdminNotifications(),
            loadAdminAnnouncements(),
            loadAdminFeatures(),
            loadAdminErrors(),
            loadAdminHealth(),
            loadAdminSecurity(),
            loadAdminStorage(),
            loadAdminVehicleStats(),
            loadAdminRouteAnalytics(),
            loadAdminProfitAnalytics(),
            loadAdminInsights(),
            loadAdminEmailPreview()
        ]);
        showAdminToast('Admin data refreshed');
    } catch (err) {
        showAdminToast(err.message || 'Failed to refresh admin data');
    }
}

function bindEnterKey(id, handler) {
    const element = document.getElementById(id);
    if (!element || element.dataset.enterBound === '1') return;
    element.dataset.enterBound = '1';
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handler();
        }
    });
}

function bindAdminUi() {
    bindEnterKey('adminUserSearch', loadAdminUsers);
    bindEnterKey('adminCompanySearch', loadAdminCompanies);
    bindEnterKey('adminEntrySearch', loadAdminEntries);
    bindEnterKey('adminActivitySearch', loadAdminActivity);
    bindEnterKey('adminAdminActivitySearch', loadAdminAdminActivity);
    bindEnterKey('adminErrorSearch', loadAdminErrors);
    bindEnterKey('adminGlobalSearch', runAdminGlobalSearch);
    handleAnnouncementTargetChange();

    ['adminUserModal', 'adminCompanyModal'].forEach((id) => {
        const modal = document.getElementById(id);
        if (!modal || modal.dataset.overlayBound === '1') return;
        modal.dataset.overlayBound = '1';
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            if (id === 'adminUserModal') closeAdminUserModal();
            if (id === 'adminCompanyModal') closeAdminCompanyModal();
        });
    });

    if (!document.body.dataset.adminEscapeBound) {
        document.body.dataset.adminEscapeBound = '1';
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (document.getElementById('adminUserModal')?.classList.contains('open')) {
                closeAdminUserModal();
                return;
            }
            if (document.getElementById('adminCompanyModal')?.classList.contains('open')) {
                closeAdminCompanyModal();
                return;
            }
            toggleAdminSidebar(false);
        });
    }
}

Object.assign(window, {
    setAdminSection,
    toggleAdminSidebar,
    refreshAdminData,
    loadAdminUsers,
    loadAdminCompanies,
    loadAdminEntries,
    loadAdminReports,
    loadAdminActivity,
    loadAdminAdminActivity,
    loadAdminErrors,
    loadAdminHealth,
    loadAdminSecurity,
    loadAdminStorage,
    loadAdminVehicleStats,
    loadAdminRouteAnalytics,
    loadAdminProfitAnalytics,
    loadAdminInsights,
    loadAdminEmailPreview,
    sendAdminEmailReport,
    runAdminGlobalSearch,
    openAdminUserModal,
    closeAdminUserModal,
    saveAdminUser,
    resetAdminUserPassword,
    toggleAdminUserBlock,
    deleteAdminUser,
    openAdminCompanyModal,
    closeAdminCompanyModal,
    saveAdminCompany,
    resetAdminCompany,
    deleteAdminEntry,
    exportAdminReportPdf,
    exportAdminReportExcel,
    logoutAdmin,
    saveAnnouncement,
    editAnnouncement,
    deleteAnnouncement,
    resetAnnouncementForm,
    handleAnnouncementTargetChange,
    saveAdminFeatures,
    loadAdminNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    downloadAdminBackup,
    restoreAdminBackup
});

window.addEventListener('load', () => {
    bindAdminUi();
    refreshAdminData();
});
