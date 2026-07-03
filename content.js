(() => {
    "use strict";

    const app = window.BupUcam;
    if (!app || !app.features) return;

    [
        app.features.evaluationQuickSelect,
        app.features.examPlanner,
    ].forEach(feature => {
        if (feature && typeof feature.init === "function") feature.init();
    });
})();
