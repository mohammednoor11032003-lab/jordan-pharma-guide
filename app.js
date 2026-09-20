/**
 * تطبيق دليل الصيدلاني — المنطق الرئيسي
 * Accordion + Live Search + Chapter Filter + Drug Modal
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════
  // DOM References
  // ═══════════════════════════════════════════
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const drugTree = $('#drugTree');
  const chapterFilter = $('#chapterFilter');
  const searchInput = $('#searchInput');
  const searchClear = $('#searchClear');
  const searchResults = $('#searchResults');
  const modalOverlay = $('#modalOverlay');
  const modalCard = $('#modalCard');
  const modalClose = $('#modalClose');
  const scrollTopBtn = $('#scrollTop');
  const statsEl = $('#stats');

  // ═══════════════════════════════════════════
  // Build Flat Index (for search & alternatives)
  // ═══════════════════════════════════════════
  let flatDrugs = []; // { trade_name, scientific_name, family, section, chapter, chapterNum, path, drugData }

  function buildFlatIndex() {
    flatDrugs = [];
    for (const chapter of DRUG_DATABASE.chapters) {
      for (const section of chapter.sections) {
        for (const family of section.families) {
          for (const drug of family.drugs) {
            for (const tn of drug.trade_names) {
              flatDrugs.push({
                trade_name: tn.trade_name,
                scientific_name: drug.scientific_name,
                family_name: family.name,
                family_number: family.number,
                section_name: section.name,
                section_number: section.number,
                chapter_name: chapter.name,
                chapter_number: chapter.number,
                genericDrug: drug,
                drugData: tn,
              });
            }
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // Render Stats
  // ═══════════════════════════════════════════
  function renderStats() {
    const chapCount = DRUG_DATABASE.chapters.length;
    const tradeCount = flatDrugs.length;
    const sciSet = new Set(flatDrugs.map(d => d.scientific_name));
    statsEl.innerHTML = `${chapCount} chapters · ${sciSet.size} scientific · ${tradeCount} trade`;
  }

  // ═══════════════════════════════════════════
  // Render Chapter Filter Buttons
  // ═══════════════════════════════════════════
  function renderChapterFilters() {
    for (const chapter of DRUG_DATABASE.chapters) {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.chapter = chapter.number;
      btn.textContent = `${chapter.number}. ${chapter.name}`;
      chapterFilter.appendChild(btn);
    }

    chapterFilter.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const val = btn.dataset.chapter;
      filterChapters(val);
    });
  }

  function filterChapters(value) {
    const chapters = $$('.accordion-chapter');
    chapters.forEach(ch => {
      if (value === 'all') {
        ch.style.display = '';
      } else {
        ch.style.display = ch.dataset.chapter === value ? '' : 'none';
      }
    });
  }

  // ═══════════════════════════════════════════
  // Build Accordion Tree
  // ═══════════════════════════════════════════
  function renderDrugTree() {
    drugTree.innerHTML = '';

    for (const chapter of DRUG_DATABASE.chapters) {
      const chapterEl = createChapter(chapter);
      drugTree.appendChild(chapterEl);
    }
  }

  function createChapter(chapter) {
    const el = document.createElement('div');
    el.className = 'accordion-chapter';
    el.dataset.chapter = String(chapter.number);

    el.innerHTML = `
      <button class="accordion-chapter-header" aria-expanded="false">
        <span class="chapter-number">Ch ${chapter.number}</span>
        <span class="chapter-name">
          ${chapter.name}
          <span class="chapter-name-en">${chapter.name_en}</span>
        </span>
        <span class="accordion-arrow">◀</span>
      </button>
      <div class="accordion-content"></div>
    `;

    const content = el.querySelector('.accordion-content');
    for (const section of chapter.sections) {
      content.appendChild(createSection(section));
    }

    setupAccordionToggle(el);
    return el;
  }

  function createSection(section) {
    const el = document.createElement('div');
    el.className = 'accordion-section';

    el.innerHTML = `
      <button class="accordion-section-header" aria-expanded="false">
        <span class="section-number">${section.number}</span>
        <span class="section-name">${section.name}</span>
        <span class="accordion-arrow">◀</span>
      </button>
      <div class="accordion-content"></div>
    `;

    const content = el.querySelector('.accordion-content');
    for (const family of section.families) {
      content.appendChild(createFamily(family));
    }

    setupAccordionToggle(el);
    return el;
  }

  function createFamily(family) {
    const el = document.createElement('div');
    el.className = 'accordion-family';

    el.innerHTML = `
      <button class="accordion-family-header" aria-expanded="false">
        <span class="accordion-arrow">◀</span>
        <span class="family-number">${family.number}</span>
        <span class="family-name">${family.name}</span>
      </button>
      <div class="accordion-content"></div>
    `;

    const content = el.querySelector('.accordion-content');
    for (const drug of family.drugs) {
      content.appendChild(createScientificGroup(drug));
    }

    setupAccordionToggle(el);
    return el;
  }

  function createScientificGroup(drug) {
    const el = document.createElement('div');
    el.className = 'scientific-group';

    const label = document.createElement('div');
    label.className = 'scientific-name-label';
    label.textContent = drug.scientific_name;
    el.appendChild(label);

    const list = document.createElement('div');
    list.className = 'trade-names-list';

    for (const tn of drug.trade_names) {
      const chip = document.createElement('button');
      chip.className = 'trade-name-chip';
      chip.innerHTML = `<span class="chip-icon">💊</span> ${tn.trade_name}`;
      chip.addEventListener('click', () => {
        const info = flatDrugs.find(
          d => d.trade_name === tn.trade_name && d.scientific_name === drug.scientific_name
        );
        if (info) openModal(info);
      });
      list.appendChild(chip);
    }

    el.appendChild(list);
    return el;
  }

  function setupAccordionToggle(el) {
    const header = el.children[0]; // The header button
    header.addEventListener('click', () => {
      const isOpen = el.classList.contains('accordion-open');
      el.classList.toggle('accordion-open');
      header.setAttribute('aria-expanded', !isOpen);
    });
  }

  // ═══════════════════════════════════════════
  // Live Search
  // ═══════════════════════════════════════════
  let searchTimeout = null;

  function setupSearch() {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      searchClear.classList.toggle('visible', query.length > 0);

      clearTimeout(searchTimeout);
      if (query.length < 3) {
        hideSearchResults();
        return;
      }

      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 150);
    });

    searchInput.addEventListener('focus', () => {
      const query = searchInput.value.trim();
      if (query.length >= 3) performSearch(query);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      hideSearchResults();
      searchInput.focus();
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        hideSearchResults();
      }
    });
  }

  function performSearch(query) {
    const q = query.toLowerCase();
    const results = flatDrugs.filter(d =>
      d.trade_name.toLowerCase().includes(q) ||
      d.scientific_name.toLowerCase().includes(q)
    );

    showSearchResults(results, query);
  }

  function showSearchResults(results, query) {
    searchResults.innerHTML = '';

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">لا توجد نتائج</div>';
      searchResults.classList.add('visible');
      return;
    }

    // Limit to 20 results for performance
    const limited = results.slice(0, 20);

    for (const drug of limited) {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.tabIndex = 0;

      const tradeName = highlightMatch(drug.trade_name, query);
      const sciName = highlightMatch(drug.scientific_name, query);
      const path = `Ch ${drug.chapter_number} ${drug.chapter_name} › ${drug.section_number} ${drug.section_name} › ${drug.family_number} ${drug.family_name}`;

      item.innerHTML = `
        <div class="search-result-name">${tradeName}</div>
        <div class="search-result-scientific">${sciName}</div>
        <div class="search-result-path">${path}</div>
      `;

      item.addEventListener('click', () => {
        openModal(drug);
        hideSearchResults();
        searchInput.blur();
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          openModal(drug);
          hideSearchResults();
        }
      });

      searchResults.appendChild(item);
    }

    if (results.length > 20) {
      const more = document.createElement('div');
      more.className = 'search-no-results';
      more.textContent = `... و ${results.length - 20} نتيجة أخرى — حاول تكون أدق`;
      searchResults.appendChild(more);
    }

    searchResults.classList.add('visible');
  }

  function hideSearchResults() {
    searchResults.classList.remove('visible');
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeRegex(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ═══════════════════════════════════════════
  // Drug Modal
  // ═══════════════════════════════════════════
  function openModal(drugInfo) {
    const drug = drugInfo.drugData;

    // Breadcrumb
    const breadcrumb = $('#modalBreadcrumb');
    breadcrumb.innerHTML = `
      <span>Ch ${drugInfo.chapter_number} ${drugInfo.chapter_name}</span>
      <span class="breadcrumb-sep">›</span>
      <span>${drugInfo.section_number} ${drugInfo.section_name}</span>
      <span class="breadcrumb-sep">›</span>
      <span>${drugInfo.family_number} ${drugInfo.family_name}</span>
    `;

    // Header
    $('#modalTradeName').textContent = drug.trade_name;
    $('#modalScientific').textContent = drugInfo.scientific_name;
    $('#modalFamily').textContent = drugInfo.family_name;

    // Image
    const imageContainer = $('#modalImage');
    if (drug.image) {
      imageContainer.innerHTML = `<img src="${drug.image}" alt="${escapeHtml(drug.trade_name)}">`;
    } else {
      imageContainer.innerHTML = '<span class="placeholder-icon">💊</span>';
    }

    // Dosage table
    const tbody = $('#modalDosageBody');
    tbody.innerHTML = '';
    const maxDoseEl = $('#modalMaxDose');
    const maxDoses = new Set();

    const dosageForms = Array.isArray(drug.dosage_forms) && drug.dosage_forms.length > 0
      ? drug.dosage_forms
      : (Array.isArray(drug.forms) && drug.forms.length > 0
          ? drug.forms.map(f => ({ form: f, strength: '—', dose: drug.dosage || 'غير محدد', max_dose: drug.max_dose || null }))
          : [{ form: 'غير محدد', strength: '—', dose: drug.dosage || 'غير محدد', max_dose: drug.max_dose || null }]);

    for (const df of dosageForms) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="form-cell">${escapeHtml(df.form || '—')}</td>
        <td class="strength-cell">${escapeHtml(df.strength || '—')}</td>
        <td class="dose-cell">${escapeHtml(df.dose || 'غير محدد')}</td>
      `;
      tbody.appendChild(tr);

      if (df.max_dose) {
        maxDoses.add(df.max_dose);
      }
    }

    if (drugInfo.genericDrug && drugInfo.genericDrug.max_dose) {
      maxDoses.add(drugInfo.genericDrug.max_dose);
    }

    if (maxDoses.size > 0) {
      maxDoseEl.textContent = `الجرعة القصوى: ${[...maxDoses].join(' | ')}`;
      maxDoseEl.classList.add('visible');
    } else {
      maxDoseEl.classList.remove('visible');
    }

    // Alternatives
    const altContainer = $('#modalAlternatives');
    altContainer.innerHTML = '';
    const alternatives = flatDrugs.filter(
      d => d.scientific_name === drugInfo.scientific_name
    );

    if (alternatives.length <= 1) {
      altContainer.innerHTML = '<span class="no-alternatives">لا توجد بدائل مسجلة بنفس الاسم العلمي</span>';
    } else {
      for (const alt of alternatives) {
        const chip = document.createElement('button');
        chip.className = 'alternative-chip';
        if (alt.trade_name === drug.trade_name) {
          chip.classList.add('current');
          chip.innerHTML = `${escapeHtml(alt.trade_name)} ✓`;
        } else {
          chip.textContent = alt.trade_name;
          chip.addEventListener('click', () => openModal(alt));
        }
        altContainer.appendChild(chip);
      }
    }

    // Counseling points
    const counselEl = $('#modalCounseling');
    const counselList = (Array.isArray(drug.counseling_points) && drug.counseling_points.length > 0)
      ? drug.counseling_points
      : (drugInfo.genericDrug && Array.isArray(drugInfo.genericDrug.counseling_points) && drugInfo.genericDrug.counseling_points.length > 0)
        ? drugInfo.genericDrug.counseling_points
        : [];

    if (counselList.length > 0) {
      const ul = document.createElement('ul');
      for (const point of counselList) {
        const li = document.createElement('li');
        li.textContent = point;
        ul.appendChild(li);
      }
      counselEl.innerHTML = '';
      counselEl.appendChild(ul);
    } else {
      counselEl.innerHTML = '<p class="empty-state">لم تُضَف بعد</p>';
    }

    // Show modal
    modalOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
    modalCard.scrollTop = 0;

    // Push state for back button
    if (!window.location.hash.startsWith('#drug-')) {
      history.pushState({ modal: true }, '', `#drug-${encodeURIComponent(drug.trade_name)}`);
    }
  }

  function closeModal() {
    modalOverlay.classList.remove('visible');
    document.body.style.overflow = '';

    if (window.location.hash.startsWith('#drug-')) {
      history.back();
    }
  }

  function setupModal() {
    modalClose.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('visible')) {
        closeModal();
      }
    });

    window.addEventListener('popstate', () => {
      if (modalOverlay.classList.contains('visible')) {
        modalOverlay.classList.remove('visible');
        document.body.style.overflow = '';
      }
    });
  }

  // ═══════════════════════════════════════════
  // Scroll to Top
  // ═══════════════════════════════════════════
  function setupScrollTop() {
    window.addEventListener('scroll', () => {
      scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });

    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ═══════════════════════════════════════════
  // Initialize
  // ═══════════════════════════════════════════
  function init() {
    buildFlatIndex();
    renderStats();
    renderChapterFilters();
    renderDrugTree();
    setupSearch();
    setupModal();
    setupScrollTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
