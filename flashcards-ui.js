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
    const chapterSelect = document.getElementById('chapterSelect');
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

    // حالة البطاقة الحالية
    let currentCard = null;

    // 4. تعبئة قائمة الشباتر في الـ Dropdown
    function populateChaptersDropdown() {
        chapterSelect.innerHTML = '<option value="all">🌟 جميع الشباتر (كامل قاعدة البيانات - 17 شابتر)</option>';
        const chapters = engine.getChaptersList();
        chapters.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.number;
            opt.textContent = `${ch.icon} Chapter ${ch.number}: ${ch.name}`;
            chapterSelect.appendChild(opt);
        });
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

        // تحديث الشارات العلوية
        const chapterLabel = `${card.chapter_icon} Ch ${card.chapter_number}: ${card.chapter_name}`;
        cardChapterBadge.textContent = chapterLabel;
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
        // Front Face
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
            <div class="card-front-subtitle">${card.family_name}</div>
            <div class="card-front-hint">👆 انقر على البطاقة لمعرفة الاسم العلمي والجرعة</div>
        `;

        // Back Face
        const back = card.back;
        cardBackBody.innerHTML = `
            <div class="back-info-item">
                <div class="back-info-label">الاسم العلمي (Generic Name)</div>
                <div class="back-info-value scientific">${back.scientific_name}</div>
                ${back.scientific_name_ar ? `<div style="color: var(--text-light); font-size: 0.95rem; margin-top: 2px;">${back.scientific_name_ar}</div>` : ''}
            </div>

            <div class="back-info-item">
                <div class="back-info-label">العائلة الدوائية (Drug Family)</div>
                <div class="back-info-value" style="color: var(--primary-dark);">${back.family_name}</div>
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
                <div class="back-info-label">العائلة الدوائية</div>
                <div class="back-info-value" style="color: var(--primary-dark); font-size: 1.1rem;">${back.family_name}</div>
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

    // تغيير الشابتر من القائمة المنسدلة
    chapterSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        engine.setChapterFilter(val);
        updateCounterBadge();
        nextCard();
    });

    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', (e) => {
        // المسافة أو الإدخال: قلب البطاقة
        if (e.code === 'Space' || e.key === 'Enter') {
            // تجنب تشغيل الاختصار إذا كان التركيز في قائمة منسدلة
            if (document.activeElement === chapterSelect) return;
            e.preventDefault();
            toggleFlip();
        }
        // السهم الأيمن أو السهم الأسفل: البطاقة التالية
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            if (document.activeElement === chapterSelect) return;
            e.preventDefault();
            nextCard();
        }
    });

    // 9. تشغيل الواجهة في البداية
    populateChaptersDropdown();
    updateCounterBadge();
    nextCard();
});
