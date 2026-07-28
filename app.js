/* ==========================================================================
   AERO-SAFETY SYS v4.2 - Application Logic & Telemetry Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // State Management
    const state = {
        currentStep: 1,
        selectedCategory: '',
        uploadedImages: [], // Base64 array
        reportsHistory: JSON.parse(localStorage.getItem('aero_safety_reports') || '[]'),
        targetEmail: localStorage.getItem('aero_target_email') || 'safety-office@rocket-engineering.io',
        ccEmail: localStorage.getItem('aero_cc_email') || '',
        sendMethod: localStorage.getItem('aero_send_method') || 'simulation'
    };

    // Initialize App
    initClock();
    initNavigation();
    initStepper();
    initCategoryChips();
    initRiskMatrix();
    initImageUploader();
    initFormSubmit();
    initSettingsModal();
    initReportPreview();
    renderHistory();
    renderAnalytics();

    // 1. Clock Display
    function initClock() {
        const clockEl = document.getElementById('clock-display');
        function updateClock() {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('he-IL', { hour12: false });
        }
        updateClock();
        setInterval(updateClock, 1000);
    }

    // 2. Navigation Tabs
    function initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');

                navBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(targetTab).classList.add('active');

                if (targetTab === 'history-tab') renderHistory();
                if (targetTab === 'analytics-tab') renderAnalytics();
            });
        });
    }

    // 3. Multi-step Stepper Form
    function initStepper() {
        const nextBtns = document.querySelectorAll('.next-step-btn');
        const prevBtns = document.querySelectorAll('.prev-step-btn');

        nextBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const nextStep = parseInt(btn.getAttribute('data-next'));
                if (validateStep(state.currentStep)) {
                    goToStep(nextStep);
                }
            });
        });

        prevBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prevStep = parseInt(btn.getAttribute('data-prev'));
                goToStep(prevStep);
            });
        });
    }

    function goToStep(stepNumber) {
        state.currentStep = stepNumber;
        
        // Panels toggle
        document.querySelectorAll('.form-step-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`step-${stepNumber}-panel`).classList.add('active');

        // Stepper HUD UI toggle
        document.querySelectorAll('.step-item').forEach(item => {
            const itemStep = parseInt(item.getAttribute('data-step'));
            if (itemStep <= stepNumber) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        window.scrollTo({ top: 120, behavior: 'smooth' });
    }

    function validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('reporterName').value.trim();
            const role = document.getElementById('reporterRole').value.trim();
            const date = document.getElementById('incidentDate').value;
            const loc = document.getElementById('incidentLocation').value;

            if (!name || !role || !date || !loc) {
                showToast('אנא מלא את כל שדות החובה בשלב 1', 'error');
                return false;
            }
        }
        if (step === 2) {
            if (!state.selectedCategory) {
                showToast('אנא בחר סיווג/קטגוריה לאירוע בשלב 2', 'error');
                return false;
            }
        }
        if (step === 3) {
            const summary = document.getElementById('incidentSummary').value.trim();
            const root = document.getElementById('rootCauseAnalysis').value.trim();
            const immediate = document.getElementById('immediateActions').value.trim();
            const corrective = document.getElementById('correctiveActions').value.trim();

            if (!summary || !root || !immediate || !corrective) {
                showToast('אנא מלא את תיאור האירוע, ניתוח השורש והפעולות המתקנות בשלב 3', 'error');
                return false;
            }
        }
        return true;
    }

    // 4. Category Chips selection
    function initCategoryChips() {
        const chips = document.querySelectorAll('.chip-btn');
        const hiddenInput = document.getElementById('incidentCategory');

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                const val = chip.getAttribute('data-val');
                state.selectedCategory = val;
                hiddenInput.value = val;
            });
        });
    }

    // 5. Risk Assessment Calculator
    function initRiskMatrix() {
        const severitySelect = document.getElementById('riskSeverity');
        const probSelect = document.getElementById('riskProbability');
        
        function calculateRisk() {
            const sev = parseInt(severitySelect.value);
            const prob = parseInt(probSelect.value);
            const score = sev * prob; // 1 to 16

            const badge = document.getElementById('risk-score-badge');
            const desc = document.getElementById('risk-desc-text');
            const resultBox = document.getElementById('risk-result-box');
            
            // Sidebar meter update
            const riskPct = Math.round((score / 16) * 100);
            document.getElementById('sidebar-risk-bar').style.width = `${riskPct}%`;
            document.getElementById('sidebar-risk-val').textContent = `${riskPct}%`;

            if (score <= 4) {
                badge.textContent = `דרגת סיכון: נמוכה (${score}/16)`;
                badge.style.color = 'var(--status-low)';
                resultBox.style.borderColor = 'var(--status-low)';
                resultBox.style.background = 'rgba(16, 185, 129, 0.1)';
                desc.textContent = 'אירוע קל / טיפול מקומי ללא השבתת מתקן.';
                document.getElementById('sidebar-risk-text').textContent = 'נמוך (Low)';
            } else if (score <= 9) {
                badge.textContent = `דרגת סיכון: בינונית (${score}/16)`;
                badge.style.color = 'var(--status-med)';
                resultBox.style.borderColor = 'var(--status-med)';
                resultBox.style.background = 'rgba(245, 158, 11, 0.1)';
                desc.textContent = 'נדרש תחקיר מפורט ועדכון נהלי עבודה צוותיים.';
                document.getElementById('sidebar-risk-text').textContent = 'בינוני (Medium)';
            } else {
                badge.textContent = `דרגת סיכון: קריטית / גבוהה (${score}/16)`;
                badge.style.color = 'var(--status-high)';
                resultBox.style.borderColor = 'var(--status-high)';
                resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
                desc.textContent = 'אזהרת אדום! נדרש דיווח מיידי להנהלת הבטיחות ועצירת מתקנים.';
                document.getElementById('sidebar-risk-text').textContent = 'קריטי (Critical)';
            }
        }

        severitySelect.addEventListener('change', calculateRisk);
        probSelect.addEventListener('change', calculateRisk);
        calculateRisk();
    }

    // 6. Image Drag & Drop Uploader
    function initImageUploader() {
        const dropZone = document.getElementById('image-drop-zone');
        const fileInput = document.getElementById('imageFileInput');
        const gallery = document.getElementById('image-gallery');

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFiles(e.dataTransfer.files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFiles(e.target.files);
            }
        });

        function handleFiles(files) {
            if (state.uploadedImages.length + files.length > 5) {
                showToast('ניתן להעלות עד 5 תמונות לכל תחקיר', 'error');
                return;
            }

            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) {
                    showToast('ניתן להעלות קבצי תמונה בלבד', 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Data = e.target.result;
                    state.uploadedImages.push(base64Data);
                    renderGallery();
                };
                reader.readAsDataURL(file);
            });
        }

        function renderGallery() {
            gallery.innerHTML = '';
            state.uploadedImages.forEach((imgData, index) => {
                const card = document.createElement('div');
                card.className = 'img-preview-card';
                card.innerHTML = `
                    <img src="${imgData}" alt="תקלה ${index + 1}">
                    <button type="button" class="img-remove-btn" data-index="${index}">&times;</button>
                `;
                gallery.appendChild(card);
            });

            // Bind remove buttons
            document.querySelectorAll('.img-remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-index'));
                    state.uploadedImages.splice(idx, 1);
                    renderGallery();
                });
            });
        }
    }

    // 7. Form Submission & Mail Dispatch
    function initFormSubmit() {
        const form = document.getElementById('investigation-form');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!document.getElementById('unclassified-confirm').checked) {
                showToast('יש לאשר כי כל המידע והתמונות הינם בלמ"ס בלבד', 'error');
                return;
            }

            const sev = parseInt(document.getElementById('riskSeverity').value);
            const prob = parseInt(document.getElementById('riskProbability').value);
            const riskScore = sev * prob;

            const reportData = {
                id: 'AERO-' + Date.now().toString().slice(-6),
                timestamp: new Date().toISOString(),
                formattedDate: new Date(document.getElementById('incidentDate').value).toLocaleString('he-IL'),
                reporterName: document.getElementById('reporterName').value.trim(),
                reporterRole: document.getElementById('reporterRole').value.trim(),
                location: document.getElementById('incidentLocation').value,
                category: state.selectedCategory,
                riskScore: riskScore,
                riskLevel: riskScore <= 4 ? 'נמוך' : riskScore <= 9 ? 'בינוני' : 'קריטי',
                summary: document.getElementById('incidentSummary').value.trim(),
                rootCause: document.getElementById('rootCauseAnalysis').value.trim(),
                immediateActions: document.getElementById('immediateActions').value.trim(),
                correctiveActions: document.getElementById('correctiveActions').value.trim(),
                images: [...state.uploadedImages]
            };

            // Save to LocalStorage archive
            state.reportsHistory.unshift(reportData);
            localStorage.setItem('aero_safety_reports', JSON.stringify(state.reportsHistory));

            // Execute Mail Dispatch logic
            dispatchMailReport(reportData);

            // Toast & Reset
            showToast(`תחקיר ${reportData.id} שוגר בהצלחה! הדוח נשמר בארכיון`, 'success');
            
            form.reset();
            state.uploadedImages = [];
            document.getElementById('image-gallery').innerHTML = '';
            state.selectedCategory = '';
            document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('selected'));
            goToStep(1);

            renderHistory();
            renderAnalytics();
        });
    }

    function dispatchMailReport(report) {
        const target = state.targetEmail;
        const subject = encodeURIComponent(`[תחקיר בטיחות בלמ"ס] ${report.id} - ${report.category} (${report.location})`);
        
        const bodyText = `
תחקיר אירוע בטיחות - מערכת AERO-SAFETY SYS
=========================================
מספר תחקיר: ${report.id}
סיווג אבטחה: בלמ"ס (בלתי מסווג)
תאריך ושעה: ${report.formattedDate}

פרטי המדווח: ${report.reporterName} (${report.reporterRole})
מתקן / סדנה: ${report.location}
סיווג הכשל: ${report.category}
דרגת סיכון: ${report.riskLevel} (ציון ${report.riskScore}/16)

תיאור האירוע:
${report.summary}

ניתוח גורמי שורש (Root Cause):
${report.rootCause}

פעולות מיידיות שננקטו:
${report.immediateActions}

פעולות מתקנות לטווח ארוך:
${report.correctiveActions}

* הודעה זו נשלחה אוטומטית מאפליקציית תחקירי הבטיחות.
        `;

        if (state.sendMethod === 'mailto') {
            const mailtoUrl = `mailto:${target}?cc=${encodeURIComponent(state.ccEmail)}&subject=${subject}&body=${encodeURIComponent(bodyText)}`;
            window.location.href = mailtoUrl;
        } else {
            // Simulation popup modal with option to download PDF
            openReportPreview(report);
        }
    }

    // 8. Settings Modal
    function initSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const openBtn = document.getElementById('open-settings-btn');
        const closeBtn = document.getElementById('close-settings-modal');
        const saveBtn = document.getElementById('save-settings-btn');

        const emailInput = document.getElementById('targetEmailAddress');
        const ccInput = document.getElementById('ccEmailAddress');
        const methodSelect = document.getElementById('emailSendMethod');

        emailInput.value = state.targetEmail;
        ccInput.value = state.ccEmail;
        methodSelect.value = state.sendMethod;

        openBtn.addEventListener('click', () => modal.classList.add('active'));
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));

        saveBtn.addEventListener('click', () => {
            state.targetEmail = emailInput.value.trim();
            state.ccEmail = ccInput.value.trim();
            state.sendMethod = methodSelect.value;

            localStorage.setItem('aero_target_email', state.targetEmail);
            localStorage.setItem('aero_cc_email', state.ccEmail);
            localStorage.setItem('aero_send_method', state.sendMethod);

            modal.classList.remove('active');
            showToast('הגדרות נמעני דוא"ל נשמרו בהצלחה', 'success');
        });
    }

    // 9. Report Preview & PDF Generation
    function initReportPreview() {
        const previewBtn = document.getElementById('preview-report-btn');
        const modal = document.getElementById('report-preview-modal');
        const closeBtn = document.getElementById('close-preview-modal');
        const downloadPdfBtn = document.getElementById('download-pdf-btn');

        previewBtn.addEventListener('click', () => {
            const tempReport = {
                id: 'PREVIEW-' + Date.now().toString().slice(-4),
                formattedDate: document.getElementById('incidentDate').value ? new Date(document.getElementById('incidentDate').value).toLocaleString('he-IL') : new Date().toLocaleString('he-IL'),
                reporterName: document.getElementById('reporterName').value.trim() || 'טיוטה',
                reporterRole: document.getElementById('reporterRole').value.trim() || 'מהנדס',
                location: document.getElementById('incidentLocation').value || 'טרם נבחר',
                category: state.selectedCategory || 'כללי',
                riskLevel: 'לפי תחקיר',
                riskScore: parseInt(document.getElementById('riskSeverity').value) * parseInt(document.getElementById('riskProbability').value),
                summary: document.getElementById('incidentSummary').value.trim() || 'אין תיאור',
                rootCause: document.getElementById('rootCauseAnalysis').value.trim() || 'אין ניתוח',
                immediateActions: document.getElementById('immediateActions').value.trim() || 'אין',
                correctiveActions: document.getElementById('correctiveActions').value.trim() || 'אין',
                images: state.uploadedImages
            };
            openReportPreview(tempReport);
        });

        closeBtn.addEventListener('click', () => modal.classList.remove('active'));

        downloadPdfBtn.addEventListener('click', () => {
            const element = document.getElementById('printable-report-content');
            const opt = {
                margin:       10,
                filename:     `Aero_Safety_Report_${Date.now()}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
            showToast('הורדת קובץ PDF החלה...', 'info');
        });
    }

    function openReportPreview(report) {
        const printable = document.getElementById('printable-report-content');
        
        let imagesHtml = '';
        if (report.images && report.images.length > 0) {
            imagesHtml = `
                <div class="print-section">
                    <h3>נספח תמונות וממצאים</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                        ${report.images.map(img => `<img src="${img}" style="width: 150px; height: 110px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px;">`).join('')}
                    </div>
                </div>
            `;
        }

        printable.innerHTML = `
            <div class="print-header" style="direction: rtl; text-align: right; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div>
                        <h1 style="font-size: 1.5rem; color: #0f172a; margin-bottom: 6px; font-weight: 700; font-family: Arial, sans-serif;">
                            דוח תחקיר אירוע בטיחות
                        </h1>
                        <div style="font-size: 0.9rem; color: #475569; display: flex; gap: 15px; margin-top: 4px;">
                            <span>מספר דוח: <strong>${report.id}</strong></span>
                            <span>|</span>
                            <span>סיווג אבטחה: <strong>בלמ"ס בלבד</strong></span>
                        </div>
                    </div>
                    <div style="text-align: left; font-size: 0.85rem; color: #64748b; direction: ltr;">
                        ${new Date().toLocaleDateString('he-IL')}
                    </div>
                </div>
            </div>

            <div class="print-section" style="direction: rtl; text-align: right; margin-bottom: 15px;">
                <h3 style="color: #0284c7; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; font-size: 1.05rem;">פרטי תחקיר וזירה</h3>
                <div class="print-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.9rem; color: #1e293b;">
                    <div><strong>מדווח / מתחקר:</strong> ${report.reporterName} (${report.reporterRole})</div>
                    <div><strong>מיקום האירוע / מתקן:</strong> ${report.location}</div>
                    <div><strong>תאריך ושעת האירוע:</strong> ${report.formattedDate}</div>
                    <div><strong>סוג / סיווג הכשל:</strong> ${report.category}</div>
                    <div style="grid-column: span 2;"><strong>דרגת סיכון בטיחותי:</strong> <span style="font-weight: bold; color: ${report.riskScore > 9 ? '#dc2626' : '#d97706'}">${report.riskLevel} (ציון ${report.riskScore} מתוך 16)</span></div>
                </div>
            </div>

            <div class="print-section">
                <h3>תיאור מפורט של האירוע</h3>
                <p style="white-space: pre-wrap; font-size: 0.9rem;">${report.summary}</p>
            </div>

            <div class="print-section">
                <h3>ניתוח גורמי שורש (Root Cause)</h3>
                <p style="white-space: pre-wrap; font-size: 0.9rem;">${report.rootCause}</p>
            </div>

            <div class="print-section">
                <h3>פעולות שננקטו ופעולות מתקנות</h3>
                <p style="font-size: 0.9rem;"><strong>פעולות מיידיות:</strong> ${report.immediateActions}</p>
                <p style="font-size: 0.9rem; margin-top: 6px;"><strong>פעולות מתקנות למניעה:</strong> ${report.correctiveActions}</p>
            </div>

            ${imagesHtml}

            <div style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 0.8rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8;">
                <span>חתימת מהנדס בטיחות: ___________________</span>
                <span>אישור מנהל מתקן: ___________________</span>
            </div>
        `;

        document.getElementById('report-preview-modal').classList.add('active');
    }

    // 10. History List Rendering
    function renderHistory() {
        const container = document.getElementById('history-list-container');
        const countSpan = document.getElementById('reports-count');
        const searchInput = document.getElementById('search-history');
        const filterText = searchInput ? searchInput.value.toLowerCase() : '';

        const reports = state.reportsHistory.filter(r => 
            r.reporterName.toLowerCase().includes(filterText) ||
            r.location.toLowerCase().includes(filterText) ||
            r.category.toLowerCase().includes(filterText) ||
            r.id.toLowerCase().includes(filterText)
        );

        countSpan.textContent = state.reportsHistory.length;

        if (reports.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>אין תחקרים שמורים בארכיון המערכת.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(r => `
            <div class="report-item-card">
                <div class="report-main-info">
                    <h4>${r.id} | ${r.category}</h4>
                    <div class="report-meta">
                        <span><i class="fa-solid fa-user"></i> ${r.reporterName}</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${r.location}</span>
                        <span><i class="fa-solid fa-calendar"></i> ${r.formattedDate}</span>
                        <span style="color: ${r.riskScore > 9 ? 'var(--status-high)' : 'var(--status-med)'}">
                            <i class="fa-solid fa-shield"></i> סיכון: ${r.riskLevel} (${r.riskScore}/16)
                        </span>
                    </div>
                </div>
                <div class="report-card-actions">
                    <button class="btn btn-outline-sm view-report-btn" data-id="${r.id}"><i class="fa-solid fa-eye"></i> צפה בדוח</button>
                    <button class="btn btn-danger-sm delete-report-btn" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        // Bind buttons
        document.querySelectorAll('.view-report-btn').forEach(b => {
            b.addEventListener('click', () => {
                const id = b.getAttribute('data-id');
                const rep = state.reportsHistory.find(item => item.id === id);
                if (rep) openReportPreview(rep);
            });
        });

        document.querySelectorAll('.delete-report-btn').forEach(b => {
            b.addEventListener('click', () => {
                const id = b.getAttribute('data-id');
                state.reportsHistory = state.reportsHistory.filter(item => item.id !== id);
                localStorage.setItem('aero_safety_reports', JSON.stringify(state.reportsHistory));
                renderHistory();
                renderAnalytics();
                showToast('התחקיר נמחק מהארכיון', 'info');
            });
        });

        if (searchInput) {
            searchInput.oninput = () => renderHistory();
        }

        const clearBtn = document.getElementById('clear-history-btn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                if (confirm('האם אתה בטוח שברצונך למחוק את כל הארכיון?')) {
                    state.reportsHistory = [];
                    localStorage.removeItem('aero_safety_reports');
                    renderHistory();
                    renderAnalytics();
                    showToast('הארכיון נוקה לחלוטין', 'info');
                }
            };
        }
    }

    // 11. Analytics Engine
    function renderAnalytics() {
        const total = state.reportsHistory.length;
        document.getElementById('stat-total-reports').textContent = total;

        const highRiskCount = state.reportsHistory.filter(r => r.riskScore > 9).length;
        document.getElementById('stat-high-risk').textContent = highRiskCount;

        // Categories breakdown
        const catMap = {};
        const locMap = {};

        state.reportsHistory.forEach(r => {
            catMap[r.category] = (catMap[r.category] || 0) + 1;
            locMap[r.location] = (locMap[r.location] || 0) + 1;
        });

        const catContainer = document.getElementById('category-breakdown');
        if (Object.keys(catMap).length === 0) {
            catContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">טרם הוגשו דיווחים לניתוח</p>';
        } else {
            catContainer.innerHTML = Object.entries(catMap).map(([cat, cnt]) => `
                <div class="breakdown-row">
                    <span>${cat}</span>
                    <span class="font-mono" style="color: var(--primary-cyan); font-weight:700;">${cnt} (${Math.round((cnt/total)*100)}%)</span>
                </div>
            `).join('');
        }

        const locContainer = document.getElementById('location-breakdown');
        if (Object.keys(locMap).length === 0) {
            locContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">טרם הוגשו דיווחים לניתוח</p>';
        } else {
            locContainer.innerHTML = Object.entries(locMap).map(([loc, cnt]) => `
                <div class="breakdown-row">
                    <span>${loc}</span>
                    <span class="font-mono" style="color: var(--rocket-orange); font-weight:700;">${cnt} (${Math.round((cnt/total)*100)}%)</span>
                </div>
            `).join('');
        }
    }

    // Toast helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-100%)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
