(() => {
    "use strict";

    const app = window.BupUcamExtension;
    if (!app) return;

    const { ids, classes, ratings, selectors } = app.config;
    const { getText } = app.util;

    function radioLabelText(radio) {
        return getText(radio.closest("td") || radio.parentElement);
    }

    function pageHasEvaluationRatings() {
        return Array.from(document.querySelectorAll(selectors.radio)).some(radio => {
            const label = radioLabelText(radio).toLowerCase();
            return ratings.some(rating => label.includes(rating.toLowerCase()));
        });
    }

    function selectEveryRating(targetRating) {
        const target = targetRating.toLowerCase();

        document.querySelectorAll(selectors.radio).forEach(radio => {
            if (!radioLabelText(radio).toLowerCase().includes(target)) return;

            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    function buildRatingButton(rating) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = classes.evaluationButton;
        button.textContent = `Select All ${rating}`;
        button.addEventListener("click", () => selectEveryRating(rating));
        return button;
    }

    function renderPanel() {
        if (!document.body || document.getElementById(ids.evaluationPanel) || !pageHasEvaluationRatings()) return;

        const panel = document.createElement("div");
        panel.id = ids.evaluationPanel;
        panel.setAttribute("aria-label", "BUP UCAM Extension evaluation quick select");

        ratings.forEach(rating => panel.appendChild(buildRatingButton(rating)));
        document.body.appendChild(panel);
    }

    function init() {
        renderPanel();
        setTimeout(renderPanel, 1000);
        setTimeout(renderPanel, 3000);
    }

    app.features.evaluationQuickSelect = { init };
})();
