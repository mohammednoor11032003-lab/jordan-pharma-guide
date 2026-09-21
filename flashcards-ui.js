/**
 * Flashcards UI Controller
 * يربط واجهة المستخدم بمحرك FlashcardsEngine
 * ويدير حركة القلب 3D وتحديث البطاقات والتحكم التفاعلي
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من تحميل قاعدة البيانات
    if (typeof DRUG_DATABASE === 'undefined') {
        console.error("DRUG_DATABASE is not loaded!");
        alert("خطأ: لم يتم تحميل قاعدة البيانات data.js بنجاح.");
        return;
    }

    // 2. تهيئة المحرك
    const engine = new FlashcardsEngine(DRUG_DATABASE);

    // 3. عناصر الواجهة
    const chapterMultiselectContainer = document.getElementById('chapterMultiselectContainer');
    const multiselectTrigger = document.getElementById('multiselectTrigger');
    const triggerText = document.getElementById('triggerText');
    const multiselectDropdown = document.getElementById('multiselectDropdown');
    const multiselectList = document.getElementById('multiselectList');
    const btnSelectAll = document.getElementById('btnSelectAll');
    const btnClearAll = document.getElementById('btnClearAll');
    const chipsScrollTrack = document.getElementById('chipsScrollTrack');
    const poolCounter = document.getElementById('poolCounter');
    const modeCounterBtn = document.getElementById('modeCounterBtn');
    const modePrescriptionBtn = document.getElementById('modePrescriptionBtn');
    const flipCard = document.getElementById('flipCard');
    const btnFlip = document.getElementById('btnFlip');
    const btnNext = document.getElementById('btnNext');

    // عناصر البطاقة (Front Face)
    const cardChapterBadge = document.getElementById('cardChapterBadge');
    const cardFrontContent = document.getElementById('cardFrontContent');

    // عناصر البطاقة (Back Face)
    const cardBackBadge = document.getElementById('cardBackBadge');
    const cardBackBody = document.getElementById('cardBackBody');

    // حالة البطاقة الحالية والشباتر المحددة
    let currentCard = null;
    let selectedChapters = ['all'];
    const chaptersList = engine.getChaptersList();

    // 4. بناء واجهة التحديد المتعدد (Dropdown Checkboxes + Chips Bar)
    function populateMultiSelectUI() {
        // أ. تعبئة قائمة الـ Dropdown مع Checkboxes
        multiselectList.innerHTML = '';

        // خيار "جميع الشباتر"
        const allItem = document.createElement('label');
        allItem.className = 'multiselect-item active';
        allItem.dataset.chapter = 'all';
        allItem.innerHTML = `
            <input type="checkbox" value="all" checked>
            <span class="multiselect-item-text">🌟 جميع الشباتر (كامل قاعدة البيانات)</span>
        `;
        multiselectList.appendChild(allItem);

        // خيارات الشباتر 1-17
        chaptersList.forEach(ch => {
            const item = document.createElement('label');
            item.className = 'multiselect-item';
            item.dataset.chapter = String(ch.number);
            item.innerHTML = `
                <input type="checkbox" value="${ch.number}">
                <span class="multiselect-item-text">${ch.icon} Chapter ${ch.number}: ${ch.name}</span>
            `;
            multiselectList.appendChild(item);
        });

        // ب. تعبئة شريط التمرير الأفقي للأزرار (Chips)
        chipsScrollTrack.innerHTML = '';

        const allChip = document.createElement('button');
        allChip.type = 'button';
        allChip.className = 'chip-btn active';
        allChip.dataset.chapter = 'all';
        allChip.innerHTML = `<span>🌟</span> <span>الكل (17 شابتر)</span>`;
        chipsScrollTrack.appendChild(allChip);

        chaptersList.forEach(ch => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip-btn';
            chip.dataset.chapter = String(ch.number);
            chip.innerHTML = `<span>${ch.icon}</span> <span>Ch ${ch.number}: ${ch.name}</span>`;
            chipsScrollTrack.appendChild(chip);
        });
    }

    // مزامنة حالة عناصر الواجهة مع selectedChapters
    function updateFilterUI() {
        const isAll = selectedChapters.includes('all') || selectedChapters.length === 0;

        // 1. تحديث نص زر القائمة المنسدلة
        if (isAll) {
            triggerText.textContent = '🌟 جميع الشباتر (17 شابتر)';
        } else if (selectedChapters.length === 1) {
            const ch = chaptersList.find(c => c.number === selectedChapters[0]);
            triggerText.textContent = ch ? `${ch.icon} Ch ${ch.number}: ${ch.name}` : `شابتر ${selectedChapters[0]}`;
        } else {
            const sorted = [...selectedChapters].sort((a, b) => a - b);
            triggerText.textContent = `${sorted.length} شباتر محددة (Ch ${sorted.join(', ')})`;
        }

        // 2. تحديث الـ Checkboxes في القائمة
        const checkboxItems = multiselectList.querySelectorAll('.multiselect-item');
        checkboxItems.forEach(item => {
            const input = item.querySelector('input[type="checkbox"]');
            const val = input.value;
            if (val === 'all') {
                input.checked = isAll;
                item.classList.toggle('active', isAll);
            } else {
                const isSelected = !isAll && selectedChapters.includes(Number(val));
                input.checked = isSelected;
                item.classList.toggle('active', isSelected);
            }
        });

        // 3. تحديث الأزرار في شريط الـ Chips
        const chips = chipsScrollTrack.querySelectorAll('.chip-btn');
        chips.forEach(chip => {
            const val = chip.dataset.chapter;
            if (val === 'all') {
                chip.classList.toggle('active', isAll);
            } else {
                const isSelected = !isAll && selectedChapters.includes(Number(val));
                chip.classList.toggle('active', isSelected);
            }
        });
    }

    // تطبيق فلتر الشباتر المحددة واستدعاء المحرك وسحب أول بطاقة
    function applyChapterFilter(newSelection) {
        if (!newSelection || newSelection.length === 0 || newSelection.includes('all')) {
            selectedChapters = ['all'];
        } else {
            selectedChapters = newSelection.map(Number).filter(n => !isNaN(n));
            if (selectedChapters.length === 0 || selectedChapters.length === chaptersList.length) {
                selectedChapters = ['all'];
            }
        }

        engine.setChapterFilter(selectedChapters);
        updateCounterBadge();
        updateFilterUI();
        nextCard();
    }

    // 5. تحديث عداد المستودع
    function updateCounterBadge() {
        const stats = engine.getPoolStats();
        if (engine.currentMode === 'counter_challenge') {
            poolCounter.textContent = `${stats.counter_cards_count} بطاقة متاحة`;
        } else {
            poolCounter.textContent = `${stats.prescription_cards_count} مركب علمي متاح`;
        }
    }

    // 6. عرض محتوى البطاقة في الواجهة
    function renderCard(card) {
        if (!card) {
            cardFrontContent.innerHTML = `<div class="card-front-title">لا توجد بطاقات متاحة في هذا الشابتر</div>`;
            return;
        }

        currentCard = card;

        // إعادة البطاقة لوضعها الأمامي غير المقلوب
        flipCard.classList.remove('is-flipped');

        // إخفاء شارة الشابتر تماماً من الوجه الأمامي لمنع كشف الإجابة
        cardChapterBadge.style.display = 'none';

        // تحديث شارة الوجه الخلفي لتظهر كجزء من الإجابة بعد القلب
        const chapterLabel = `${card.chapter_icon} Ch ${card.chapter_number}: ${card.chapter_name}${card.chapter_name_en ? ' | ' + card.chapter_name_en : ''}`;
        cardBackBadge.textContent = chapterLabel;

        // بناء الوجه الأمامي والوجه الخلفي حسب الوضع
        if (card.mode === 'counter_challenge') {
            renderCounterCard(card);
        } else {
            renderPrescriptionCard(card);
        }
    }

    // عرض بطاقة تحدي الكاونتر والجرعات
    function renderCounterCard(card) {
        // Front Face - حصرياً: الصورة + الاسم التجاري فقط
        let visualHtml = '';
        if (card.front.has_image) {
            visualHtml = `
                <div class="card-image-box">
                    <img src="${card.front.image}" alt="${card.front.trade_name}" loading="lazy">
                </div>
            `;
        } else {
            visualHtml = `
                <div class="card-image-box">
                    <div class="card-fallback-icon">💊</div>
                </div>
            `;
        }

        cardFrontContent.innerHTML = `
            ${visualHtml}
            <div class="card-front-title">${card.front.trade_name}</div>
            <div class="card-front-hint">👆 انقر لمعرفة الاسم العلمي والعائلة والجرعة</div>
        `;

        // Back Face - الإجابة الكاملة بعد القلب
        const back = card.back;
        cardBackBody.innerHTML = `
            <div class="back-info-item">
                <div class="back-info-label">الاسم العلمي (Generic Name)</div>
                <div class="back-info-value scientific">${back.scientific_name}</div>
                ${back.scientific_name_ar ? `<div style="color: var(--text-light); font-size: 0.95rem; margin-top: 2px;">${back.scientific_name_ar}</div>` : ''}
            </div>

            <!-- الترتيب الهرمي المنطقي: الشابتر ثم القسم ثم العائلة الدوائية -->
            <div class="back-hierarchy-group">
                <!-- 1. الشابتر (N) -->
                <div class="back-info-item hierarchy-item">
                    <div class="back-info-label">1️⃣ الشابتر (Chapter)</div>
                    <div class="back-info-value hierarchy-val">
                        <span class="hierarchy-num">Ch ${back.chapter_number}</span>
                        <span class="hierarchy-name-ar">${back.chapter_name}</span>
                        ${back.chapter_name_en ? `<span class="hierarchy-name-en">| ${back.chapter_name_en}</span>` : ''}
                    </div>
                </div>

                <!-- 2. القسم (N.x) -->
                <div class="back-info-item hierarchy-item">
                    <div class="back-info-label">2️⃣ القسم (Section)</div>
                    <div class="back-info-value hierarchy-val">
                        <span class="hierarchy-num">${back.section_number}</span>
                        <span class="hierarchy-name-ar">${back.section_name}</span>
                        ${back.section_name_en ? `<span class="hierarchy-name-en">| ${back.section_name_en}</span>` : ''}
                    </div>
                </div>

                <!-- 3. العائلة الدوائية (N.x.x) -->
                <div class="back-info-item hierarchy-item">
                    <div class="back-info-label">3️⃣ العائلة الدوائية (Drug Family)</div>
                    <div class="back-info-value hierarchy-val">
                        <span class="hierarchy-num">${back.family_number}</span>
                        <span class="hierarchy-name-ar">${back.family_name}</span>
                        ${back.family_name_en ? `<span class="hierarchy-name-en">| ${back.family_name_en}</span>` : ''}
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="back-info-item">
                    <div class="back-info-label">الشركة المصنعة / الوكيل</div>
                    <div class="back-info-value" style="font-size: 0.95rem;">${back.manufacturer}</div>
                </div>
                <div class="back-info-item">
                    <div class="back-info-label">الشكل والعيار المتاح</div>
                    <div class="back-info-value" style="font-size: 0.95rem;">${back.forms}</div>
                </div>
            </div>

            <div class="back-info-item">
                <div class="back-info-label">الجرعة المعتمدة وطريقة الاستخدام (Standard Dosage)</div>
                <div class="back-info-value dosage-box">⏱️ ${back.dosage}</div>
            </div>
        `;
    }

    // عرض بطاقة تحدي الوصفات والبدائل التجارية
    function renderPrescriptionCard(card) {
        // Front Face
        cardFrontContent.innerHTML = `
            <div class="card-fallback-icon" style="font-size: 3.8rem; margin-bottom: 8px;">📋</div>
            <div class="card-front-title" style="color: var(--secondary);">${card.front.scientific_name}</div>
            ${card.front.scientific_name_ar ? `<div class="card-front-subtitle" style="font-size: 1.25rem;">${card.front.scientific_name_ar}</div>` : ''}
            <div style="background: var(--secondary-bg); color: var(--secondary); font-size: 0.9rem; font-weight: 700; padding: 6px 16px; border-radius: 20px; margin-top: 10px;">
                المطلوب: تذكر البدائل التجارية المسجلة في الأردن والجرعة
            </div>
            <div class="card-front-hint" style="margin-top: 14px;">👆 انقر على البطاقة لعرض كافة الأسماء التجارية والجرعات المعتمدة</div>
        `;

        // Back Face
        const back = card.back;
        let altRowsHtml = '';
        back.trade_names.forEach((trade, idx) => {
            altRowsHtml += `
                <div class="alternative-card">
                    <div class="alt-name-group">
                        <span class="alt-icon">${trade.has_image ? '📦' : '💊'}</span>
                        <div>
                            <div class="alt-name">${idx + 1}. ${trade.trade_name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-light);">${trade.manufacturer}</div>
                        </div>
                    </div>
                    <div class="alt-details">
                        <div style="font-weight: 600; color: var(--text);">${trade.forms}</div>
                        <div style="font-size: 0.76rem; color: #BF360C;">${trade.dosage}</div>
                    </div>
                </div>
            `;
        });

        cardBackBody.innerHTML = `
            <div class="back-info-item">
                <div class="back-info-label">العائلة الدوائية (Drug Family)</div>
                <div class="back-info-value" style="color: var(--primary-dark); font-size: 1.05rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="hierarchy-num">${back.family_number}</span>
                    <span>${back.family_name}</span>
                    ${back.family_name_en ? `<span class="hierarchy-name-en">| ${back.family_name_en}</span>` : ''}
                </div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <div class="back-info-item" style="flex: 1;">
                    <div class="back-info-label">جرعة البالغين</div>
                    <div class="back-info-value dosage-box" style="font-size: 0.85rem; padding: 6px 10px;">${back.adult_dose}</div>
                </div>
                ${back.pediatric_dose && back.pediatric_dose !== 'غير محدد' ? `
                <div class="back-info-item" style="flex: 1;">
                    <div class="back-info-label">جرعة الأطفال</div>
                    <div class="back-info-value dosage-box" style="font-size: 0.85rem; padding: 6px 10px; background: #EDE7F6; border-color: #673AB7; color: #4527A0;">${back.pediatric_dose}</div>
                </div>
                ` : ''}
            </div>

            <div class="back-info-item" style="border: 1.5px solid #90CAF9;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div class="back-info-label" style="margin: 0; color: var(--primary-dark);">الأسماء التجارية المسجلة في الأردن (بدائل متكافئة)</div>
                    <span style="background: var(--primary); color: #fff; font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;">${back.total_alternatives} بدائل</span>
                </div>
                <div class="alternatives-list">
                    ${altRowsHtml}
                </div>
            </div>
        `;
    }

    // 7. دالة سحب بطاقة جديدة مع تأثير انتقالي ناعم
    function nextCard() {
        // قلب البطاقة للوجه الأمامي أولاً إذا كانت مقلوبة
        flipCard.classList.remove('is-flipped');

        // سحب بطاقة جديدة
        const newCard = engine.drawRandomCard();
        if (newCard) {
            renderCard(newCard);
        }
    }

    // 8. دالة قلب البطاقة 3D
    function toggleFlip() {
        flipCard.classList.toggle('is-flipped');
    }

    // ═══════════ Event Listeners ═══════════

    // قلب البطاقة عند النقر على البطاقة نفسها
    flipCard.addEventListener('click', () => {
        toggleFlip();
    });

    // زر قلب البطاقة
    btnFlip.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFlip();
    });

    // زر التالي
    btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        nextCard();
    });

    // تبديل الأوضاع
    modeCounterBtn.addEventListener('click', () => {
        if (engine.currentMode === 'counter_challenge') return;
        modeCounterBtn.classList.add('active');
        modePrescriptionBtn.classList.remove('active');
        engine.setMode('counter_challenge');
        updateCounterBadge();
        nextCard();
    });

    modePrescriptionBtn.addEventListener('click', () => {
        if (engine.currentMode === 'prescription_challenge') return;
        modePrescriptionBtn.classList.add('active');
        modeCounterBtn.classList.remove('active');
        engine.setMode('prescription_challenge');
        updateCounterBadge();
        nextCard();
    });

    // فتح / إغلاق القائمة المنسدلة للفلترة
    multiselectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = multiselectDropdown.style.display === 'block';
        multiselectDropdown.style.display = isOpen ? 'none' : 'block';
        multiselectTrigger.setAttribute('aria-expanded', !isOpen);
    });

    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!chapterMultiselectContainer.contains(e.target)) {
            multiselectDropdown.style.display = 'none';
            multiselectTrigger.setAttribute('aria-expanded', 'false');
        }
    });

    // زر تحديد الكل
    btnSelectAll.addEventListener('click', (e) => {
        e.stopPropagation();
        applyChapterFilter(['all']);
    });

    // زر تفريغ التحديد
    btnClearAll.addEventListener('click', (e) => {
        e.stopPropagation();
        applyChapterFilter([]);
    });

    // التفاعل مع مربعات الاختيار (Checkboxes) في القائمة المنسدلة
    multiselectList.addEventListener('change', (e) => {
        const input = e.target.closest('input[type="checkbox"]');
        if (!input) return;

        const val = input.value;
        const isAll = selectedChapters.includes('all') || selectedChapters.length === 0;

        if (val === 'all') {
            applyChapterFilter(['all']);
        } else {
            const chNum = Number(val);
            if (isAll) {
                // إذا كان الكل مفعلاً واختار المستخدم شابتر معين، يتم عزله
                applyChapterFilter([chNum]);
            } else {
                let updated = [...selectedChapters];
                if (input.checked) {
                    if (!updated.includes(chNum)) updated.push(chNum);
                } else {
                    updated = updated.filter(n => n !== chNum);
                }
                applyChapterFilter(updated);
            }
        }
    });

    // التفاعل مع أزرار شريط التمرير الأفقي (Chips Bar)
    chipsScrollTrack.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-btn');
        if (!chip) return;

        const val = chip.dataset.chapter;
        const isAll = selectedChapters.includes('all') || selectedChapters.length === 0;

        if (val === 'all') {
            applyChapterFilter(['all']);
        } else {
            const chNum = Number(val);
            if (isAll) {
                // تفعيل هذا الشابتر تحديداً بدلاً من الكل
                applyChapterFilter([chNum]);
            } else {
                let updated = [...selectedChapters];
                if (updated.includes(chNum)) {
                    updated = updated.filter(n => n !== chNum);
                } else {
                    updated.push(chNum);
                }
                applyChapterFilter(updated);
            }
        }
    });

    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        // إذا كان التركيز داخل القائمة المنسدلة، اسمح للمستخدم بالتفاعل الطبيعي
        const isInsideFilter = chapterMultiselectContainer.contains(document.activeElement);

        if (e.key === 'Escape') {
            multiselectDropdown.style.display = 'none';
            multiselectTrigger.setAttribute('aria-expanded', 'false');
            return;
        }

        // المسافة أو الإدخال: قلب البطاقة
        if (e.code === 'Space' || e.key === 'Enter') {
            if (isInsideFilter) return;
            e.preventDefault();
            toggleFlip();
        }
        // السهم الأيمن أو السهم الأسفل: البطاقة التالية
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            if (isInsideFilter) return;
            e.preventDefault();
            nextCard();
        }
    });

    // 9. تشغيل الواجهة في البداية
    populateMultiSelectUI();
    updateFilterUI();
    updateCounterBadge();
    nextCard();
});
