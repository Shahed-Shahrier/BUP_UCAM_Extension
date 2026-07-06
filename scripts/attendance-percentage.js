(() => {
    "use strict";

    const app = window.BupUcamExtension;
    if (!app) return;

    const { ids, classes, selectors } = app.config;
    const { debounce, getText } = app.util;
    const requiredPresentPercent = 85;

    function parseCount(element) {
        const parsed = parseInt(getText(element).replace(/,/g, ""), 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatPercent(value) {
        if (Number.isInteger(value)) return `${value}%`;
        return `${value.toFixed(2)}%`;
    }

    function statusClassFor(percent) {
        return percent < requiredPresentPercent
            ? classes.attendancePercentRisk
            : classes.attendancePercentSafe;
    }

    function percentBadgeHTML(percent) {
        return `<span class="${classes.attendancePercentBadge} ${statusClassFor(percent)}" title="Present percentage">${formatPercent(percent)}</span>`;
    }

    function syncExistingBadge(badge, percent) {
        const percentText = formatPercent(percent);
        const statusClass = statusClassFor(percent);
        const staleStatusClass = statusClass === classes.attendancePercentRisk
            ? classes.attendancePercentSafe
            : classes.attendancePercentRisk;

        if (badge.textContent !== percentText) badge.textContent = percentText;
        badge.classList.add(statusClass);
        badge.classList.remove(staleStatusClass);
    }

    function renderRow(row) {
        const presentBadge = row.querySelector(selectors.presentCount);
        const absentBadge = row.querySelector(selectors.absentCount);
        if (!presentBadge || !absentBadge) return;

        const present = parseCount(presentBadge);
        const absent = parseCount(absentBadge);
        if (present === null || absent === null) return;

        const total = present + absent;
        const existingBadges = row.querySelectorAll(`.${classes.attendancePercentBadge}`);
        if (total <= 0) {
            existingBadges.forEach(badge => badge.remove());
            return;
        }

        const presentPercent = total > 0 ? (present / total) * 100 : 0;

        if (existingBadges.length) {
            const badge = existingBadges[0];
            syncExistingBadge(badge, presentPercent);
            if (badge.parentElement !== presentBadge.parentElement || badge.nextElementSibling !== presentBadge) {
                presentBadge.parentElement.insertBefore(badge, presentBadge);
            }
            Array.from(existingBadges).slice(1).forEach(badge => badge.remove());
            return;
        }

        presentBadge.insertAdjacentHTML("beforebegin", percentBadgeHTML(presentPercent));
    }

    function render() {
        const table = document.getElementById(ids.attendanceSummaryTable);
        if (!table) return;

        table.querySelectorAll("tr").forEach(renderRow);
    }

    function observeAttendanceArea(table) {
        const updatePanel = document.getElementById(ids.attendanceUpdatePanel);
        const observedElement = updatePanel || table;

        render();
        new MutationObserver(debounce(() => render(), 200)).observe(observedElement, { childList: true, subtree: true });
    }

    function startWhenTableIsReady() {
        const table = document.getElementById(ids.attendanceSummaryTable);
        if (!table) return false;

        observeAttendanceArea(table);
        return true;
    }

    function init() {
        if (startWhenTableIsReady()) return;

        const attachBootObserver = () => {
            if (!document.body) return;

            const bootObserver = new MutationObserver(() => {
                if (startWhenTableIsReady()) bootObserver.disconnect();
            });

            bootObserver.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => bootObserver.disconnect(), 15000);
        };

        if (document.body) attachBootObserver();
        else document.addEventListener("DOMContentLoaded", attachBootObserver, { once: true });
    }

    app.features.attendancePercentage = { init };
})();
