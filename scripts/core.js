(() => {
    "use strict";

    const config = Object.freeze({
        ids: {
            evaluationPanel: "bup-ucam-extension-evaluation-panel",
            updatePanel: "ctl00_MainContainer_UpdatePanel2",
            marksTable: "ctl00_MainContainer_gvgvExamMarkSummaryDetails",
            finalSection: "bup-ucam-extension-final-section",
            attendanceUpdatePanel: "ctl00_MainContainer_UpdatePanel03",
            attendanceSummaryTable: "ctl00_MainContainer_gvClassAttendanceSummary",
        },
        classes: {
            generatedRow: "bup-ucam-extension-row",
            totalRow: "bup-ucam-extension-total-row",
            missingSource: "bup-ucam-extension-source-missing",
            manualInput: "bup-ucam-extension-manual-input",
            currentFloor: "bup-ucam-extension-current-floor",
            evaluationButton: "bup-ucam-extension-evaluation-button",
            rowIcon: "bup-ucam-extension-row-icon",
            rowIconTotal: "bup-ucam-extension-row-icon-total",
            markBadge: "bup-ucam-extension-mark-badge",
            markPending: "bup-ucam-extension-mark-pending",
            markAchieved: "bup-ucam-extension-mark-achieved",
            markLimit: "bup-ucam-extension-mark-limit",
            totalBadge: "bup-ucam-extension-total-badge",
            totalLimit: "bup-ucam-extension-total-limit",
            finalHeader: "bup-ucam-extension-final-header",
            finalHeaderIcon: "bup-ucam-extension-final-header-icon",
            summary: "bup-ucam-extension-summary-banner",
            provisionalNote: "bup-ucam-extension-provisional-note",
            tableWrap: "bup-ucam-extension-final-table-wrap",
            finalTable: "bup-ucam-extension-final-table",
            rowNumber: "bup-ucam-extension-row-number",
            status: "bup-ucam-extension-status",
            statusAchieved: "bup-ucam-extension-status-achieved",
            statusImpossible: "bup-ucam-extension-status-impossible",
            footnote: "bup-ucam-extension-footnote",
            attendancePercentBadge: "bup-ucam-extension-attendance-percent",
            attendancePercentSafe: "bup-ucam-extension-attendance-percent-safe",
            attendancePercentRisk: "bup-ucam-extension-attendance-percent-risk",
        },
        selectors: {
            radio: "input[type='radio']",
            manualMarkInput: "[data-bup-ucam-extension-manual-key]",
            hostDataSection: ".data-section",
            hostTableWrapper: ".table-wrapper",
            presentCount: ".present-count",
            absentCount: ".absent-count",
        },
        ratings: ["Excellent", "Very good", "Good", "Average", "Poor"],
        gradeScale: [
            { grade: "A+", min: 80, max: 100, gpa: 4.00, desc: "Outstanding" },
            { grade: "A", min: 75, max: 79, gpa: 3.75, desc: "Excellent" },
            { grade: "A-", min: 70, max: 74, gpa: 3.50, desc: "Very Good" },
            { grade: "B+", min: 65, max: 69, gpa: 3.25, desc: "Good" },
            { grade: "B", min: 60, max: 64, gpa: 3.00, desc: "Satisfactory" },
            { grade: "B-", min: 55, max: 59, gpa: 2.75, desc: "Above Average" },
            { grade: "C+", min: 50, max: 54, gpa: 2.50, desc: "Average" },
            { grade: "C", min: 45, max: 49, gpa: 2.25, desc: "Below Average" },
            { grade: "D", min: 40, max: 44, gpa: 2.00, desc: "Pass" },
            { grade: "F", min: 0, max: 39, gpa: 0.00, desc: "Fail" },
        ],
    });

    const state = {
        manualMarksByRow: new Map(),
    };

    const htmlEntityMap = Object.freeze({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    });

    function getText(element) {
        const rawText = element && element.innerText !== undefined ? element.innerText : element && element.textContent;
        return (rawText || "").replace(/\s+/g, " ").trim();
    }

    function parseMark(value) {
        const text = String(value || "").trim();
        if (!text || /^-+$/.test(text) || /^n\/?a$/i.test(text) || /pending/i.test(text)) return null;

        const parsed = parseFloat(text.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatMark(value) {
        return (Math.round(value * 100) / 100).toFixed(2);
    }

    function hasUsableMark(value) {
        return value !== "" && value !== null;
    }

    function clampMark(value, max) {
        if (!hasUsableMark(value)) return value;

        const aboveZero = Math.max(value, 0);
        return max ? Math.min(aboveZero, max) : aboveZero;
    }

    function slugify(value) {
        return String(value)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => htmlEntityMap[character]);
    }

    function debounce(callback, wait) {
        let timeoutId;

        return function debouncedCallback(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => callback.apply(this, args), wait);
        };
    }

    window.BupUcamExtension = Object.freeze({
        config,
        state,
        features: {},
        util: Object.freeze({
            getText,
            parseMark,
            formatMark,
            hasUsableMark,
            clampMark,
            slugify,
            escapeHTML,
            debounce,
        }),
    });
})();
