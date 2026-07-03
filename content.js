(() => {
    "use strict";

    const app = window.BupUcamExtension;
    if (!app || !app.features) return;

    [
        app.features.evaluationQuickSelect,
        app.features.examPlanner,
    ].forEach(feature => {
        if (feature && typeof feature.init === "function") feature.init();
    });
})();
