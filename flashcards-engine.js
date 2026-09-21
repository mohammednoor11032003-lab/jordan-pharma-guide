/**
 * Flashcards Engine - محرك وضع التدريب التفاعلي
 * يعمل كـ Single Component مسترجعاً البيانات مباشرة وبدقة من DRUG_DATABASE
 * دون المساس بأي ملفات أساسية أو اختلاق أي بيانات.
 */

function cleanIcon(icon) {
    if (!icon || typeof icon !== 'string') return "💊";
    if (icon.includes("fa-")) {
        if (icon.includes("stethoscope")) return "🩺";
        if (icon.includes("pills")) return "💊";
        if (icon.includes("lungs")) return "🫁";
        if (icon.includes("shield")) return "🛡️";
        if (icon.includes("eye")) return "👁️";
        if (icon.includes("spa")) return "🧴";
        if (icon.includes("capsules")) return "💊";
        if (icon.includes("bone")) return "🦴";
        if (icon.includes("seedling")) return "🌿";
        return "💊";
    }
    return icon;
}

class FlashcardsEngine {
    constructor(database) {
        if (!database || !Array.isArray(database.chapters)) {
            throw new Error("Invalid DRUG_DATABASE provided to FlashcardsEngine");
        }
        this.db = database;
        this.currentChapterFilter = 'all'; // 'all' or chapter number (e.g. 1, 17)
        this.currentMode = 'counter_challenge'; // 'counter_challenge' (default) or 'prescription_challenge'
        
        // Pools
        this.counterPool = [];
        this.prescriptionPool = [];
        
        // Anti-consecutive duplication state
        this.lastCounterCardId = null;
        this.lastPrescriptionCardId = null;
        
        // Initialize pools
        this.rebuildPools();
    }

    /**
     * تحديد نطاق الفلترة (شابتر محدد أو كل الشباتر)
     * @param {string|number} chapterFilter - 'all' أو رقم الشابتر 1-17
     */
    setChapterFilter(chapterFilter) {
        this.currentChapterFilter = (chapterFilter === 'all' || chapterFilter === null || chapterFilter === undefined)
            ? 'all'
            : Number(chapterFilter);
        
        this.lastCounterCardId = null;
        this.lastPrescriptionCardId = null;
        this.rebuildPools();
        return this.getPoolStats();
    }

    /**
     * تبديل وضع التدريب
     * @param {string} mode - 'counter_challenge' أو 'prescription_challenge'
     */
    setMode(mode) {
        if (mode !== 'counter_challenge' && mode !== 'prescription_challenge') {
            throw new Error(`Unknown mode: ${mode}`);
        }
        this.currentMode = mode;
        return this.currentMode;
    }

    /**
     * بناء مستودعات البطاقات بناءً على الفلتر الحالي
     */
    rebuildPools() {
        this.counterPool = [];
        this.prescriptionPool = [];

        // خريطة لتجميع البدائل التجارية لكل اسم علمي بدقة
        const genericMap = new Map();

        const targetChapters = this.db.chapters.filter(ch => {
            if (this.currentChapterFilter === 'all') return true;
            return ch.number === this.currentChapterFilter;
        });

        targetChapters.forEach(chapter => {
            const chNum = chapter.number;
            const chName = chapter.name;
            const chIcon = cleanIcon(chapter.icon);

            (chapter.sections || []).forEach(section => {
                const secName = section.name;

                (section.families || []).forEach(family => {
                    const famName = family.name;

                    (family.drugs || []).forEach(drug => {
                        const genericKey = (drug.scientific_name || "").trim().toLowerCase();
                        if (!genericKey) return;

                        // 1. تجميع بيانات وضع الوصفات والبدائل (Prescription Challenge)
                        if (!genericMap.has(genericKey)) {
                            genericMap.set(genericKey, {
                                id: `presc_${chNum}_${drug.id || genericKey.replace(/\s+/g, '_')}`,
                                chapter_number: chNum,
                                chapter_name: chName,
                                chapter_icon: chIcon,
                                section_name: secName,
                                family_name: famName,
                                scientific_name: drug.scientific_name,
                                scientific_name_ar: drug.scientific_name_ar || "",
                                adult_dose: drug.adult_dose || "غير محدد",
                                pediatric_dose: drug.pediatric_dose || "غير محدد",
                                trade_names: []
                            });
                        }

                        const genericEntry = genericMap.get(genericKey);

                        // 2. تجميع بيانات وضع الكاونتر والجرعات (Counter Challenge)
                        (drug.trade_names || []).forEach((trade, idx) => {
                            const tradeId = `counter_${chNum}_${drug.id || 'd'}_${idx}_${trade.trade_name.replace(/\s+/g, '_')}`;
                            
                            // استخراج صورة العبوة الحقيقية كـ Base64 أو علامة بديلة
                            const hasRealImage = Boolean(trade.image && typeof trade.image === 'string' && trade.image.startsWith('data:image'));
                            const imageDisplay = hasRealImage ? trade.image : "";

                            // تجهيز بطاقة الكاونتر
                            const counterCard = {
                                id: tradeId,
                                mode: 'counter_challenge',
                                chapter_number: chNum,
                                chapter_name: chName,
                                chapter_icon: chIcon,
                                section_name: secName,
                                family_name: famName,
                                // الوجه الأمامي
                                front: {
                                    trade_name: trade.trade_name,
                                    image: imageDisplay,
                                    has_image: hasRealImage,
                                    fallback_icon: "💊",
                                    chapter_info: `Ch ${chNum}: ${chName}`
                                },
                                // الوجه الخلفي (عند النقر للقلب)
                                back: {
                                    scientific_name: drug.scientific_name,
                                    scientific_name_ar: drug.scientific_name_ar || "",
                                    family_name: famName,
                                    manufacturer: trade.manufacturer || "غير محدد",
                                    forms: trade.forms || "غير محدد",
                                    dosage: trade.dosage || "غير محدد",
                                    dosage_forms: trade.dosage_forms || []
                                }
                            };

                            this.counterPool.push(counterCard);

                            // إضافة هذا المستحضر التجاري إلى قائمة بدائل الاسم العلمي دون أي تكرار
                            const alreadyExists = genericEntry.trade_names.some(t => t.trade_name === trade.trade_name);
                            if (!alreadyExists) {
                                genericEntry.trade_names.push({
                                    trade_name: trade.trade_name,
                                    manufacturer: trade.manufacturer || "غير محدد",
                                    forms: trade.forms || "غير محدد",
                                    dosage: trade.dosage || "غير محدد",
                                    has_image: hasRealImage,
                                    image: imageDisplay
                                });
                            }
                        });
                    });
                });
            });
        });

        // تحويل خريطة الأسماء العلمية إلى مصفوفة بطاقات وضع الوصفات
        for (const [_, entry] of genericMap) {
            // فقط الأسماء التي تحتوي على مستحضرات تجارية
            if (entry.trade_names.length > 0) {
                this.prescriptionPool.push({
                    id: entry.id,
                    mode: 'prescription_challenge',
                    chapter_number: entry.chapter_number,
                    chapter_name: entry.chapter_name,
                    chapter_icon: entry.chapter_icon,
                    section_name: entry.section_name,
                    family_name: entry.family_name,
                    // الوجه الأمامي
                    front: {
                        scientific_name: entry.scientific_name,
                        scientific_name_ar: entry.scientific_name_ar,
                        chapter_info: `Ch ${entry.chapter_number}: ${entry.chapter_name}`
                    },
                    // الوجه الخلفي (عند النقر للقلب)
                    back: {
                        family_name: entry.family_name,
                        trade_names: entry.trade_names,
                        total_alternatives: entry.trade_names.length,
                        adult_dose: entry.adult_dose,
                        pediatric_dose: entry.pediatric_dose
                    }
                });
            }
        }
    }

    /**
     * إحصائيات المستودع الحالي
     */
    getPoolStats() {
        return {
            current_chapter_filter: this.currentChapterFilter,
            counter_cards_count: this.counterPool.length,
            prescription_cards_count: this.prescriptionPool.length,
            total_chapters_available: this.db.chapters.length
        };
    }

    /**
     * سحب بطاقة عشوائية مع خوارزمية منع التكرار المتتالي (Anti-Consecutive Duplication)
     * @param {string} [requestedMode] - اختياري لتحديد الوضع أثناء السحب
     */
    drawRandomCard(requestedMode) {
        const mode = requestedMode || this.currentMode;
        const pool = mode === 'counter_challenge' ? this.counterPool : this.prescriptionPool;
        const lastId = mode === 'counter_challenge' ? this.lastCounterCardId : this.lastPrescriptionCardId;

        if (!pool || pool.length === 0) {
            return null;
        }

        // إذا كان المستودع يحتوي على بطاقة واحدة فقط
        if (pool.length === 1) {
            const singleCard = pool[0];
            if (mode === 'counter_challenge') this.lastCounterCardId = singleCard.id;
            else this.lastPrescriptionCardId = singleCard.id;
            return singleCard;
        }

        // ترشيح المستودع لاستبعاد البطاقة التي ظهرت في السحبة السابقة مباشرة
        let availablePool = pool.filter(card => card.id !== lastId);
        if (availablePool.length === 0) {
            availablePool = pool;
        }

        const randomIndex = Math.floor(Math.random() * availablePool.length);
        const selectedCard = availablePool[randomIndex];

        // تحديث معرف البطاقة السابقة
        if (mode === 'counter_challenge') {
            this.lastCounterCardId = selectedCard.id;
        } else {
            this.lastPrescriptionCardId = selectedCard.id;
        }

        return selectedCard;
    }

    /**
     * استخراج قائمة الشباتر للاستخدام في الـ Dropdown
     */
    getChaptersList() {
        return this.db.chapters.map(ch => ({
            number: ch.number,
            name: ch.name,
            name_en: ch.name_en || "",
            icon: cleanIcon(ch.icon)
        }));
    }
}

// تصدير للاستخدام في المتصفح أو بيئة Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashcardsEngine;
}
if (typeof window !== 'undefined') {
    window.FlashcardsEngine = FlashcardsEngine;
}
