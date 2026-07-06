(() => {
    "use strict";

    const app = window.BupUcamExtension;
    if (!app) return;

    const { ids, classes, selectors, gradeScale } = app.config;
    const { manualMarksByRow } = app.state;
    const {
        clampMark,
        debounce,
        escapeHTML,
        formatMark,
        getText,
        hasUsableMark,
        parseMark,
        slugify,
    } = app.util;
    let lastRenderSignature = "";

    function rowKey(row) {
        return slugify(`${row.serial || row.sourceIndex}-${row.name}`) || `row-${row.sourceIndex}`;
    }

    function manualMarkFor(row) {
        const key = rowKey(row);
        return manualMarksByRow.has(key) ? manualMarksByRow.get(key) : "";
    }

    function obtainedMarkFor(row) {
        const mark = row.obtained !== null ? row.obtained : manualMarkFor(row);
        return clampMark(mark, row.max);
    }

    function isInjectedRow(row) {
        return row.classList.contains(classes.generatedRow) || row.classList.contains(classes.totalRow);
    }

    function readAssessmentRows(table) {
        return Array.from(table.querySelectorAll("tbody tr")).reduce((rows, tableRow, sourceIndex) => {
            if (tableRow.querySelector("th") || isInjectedRow(tableRow)) return rows;

            const cells = tableRow.querySelectorAll("td");
            if (cells.length < 4) return rows;

            rows.push({
                serial: getText(cells[0]),
                name: getText(cells[1]),
                max: parseMark(getText(cells[2])),
                obtained: parseMark(getText(cells[3])),
                obtainedCell: cells[3],
                rowElement: tableRow,
                sourceIndex,
            });

            return rows;
        }, []);
    }

    function scaledComponentScore(row, targetMax, missingLabel, missing) {
        if (!row) return null;

        const obtained = obtainedMarkFor(row);
        if (hasUsableMark(obtained) && row.max) return (obtained / row.max) * targetMax;

        missing.push(missingLabel);
        return null;
    }

    function directComponentScore(row, missingLabel, missing) {
        if (!row) return null;

        const obtained = obtainedMarkFor(row);
        if (hasUsableMark(obtained)) return obtained;

        missing.push(missingLabel);
        return null;
    }

    function calculateInCourse(rows) {
        const classTests = rows.filter(row => /class\s*test/i.test(row.name));
        const midTerm = rows.find(row => /mid[\s-]*term/i.test(row.name));
        const project = rows.find(row => /(project|assignment|term\s*paper|presentation)/i.test(row.name));
        const attendance = rows.find(row => /attendance/i.test(row.name));
        const missing = [];

        const validClassTests = classTests
            .map(row => Object.assign({}, row, { obtained: obtainedMarkFor(row) }))
            .filter(row => hasUsableMark(row.obtained) && row.max);
        const pendingClassTestCount = classTests.length - validClassTests.length;
        const topClassTests = validClassTests.sort((left, right) => right.obtained - left.obtained).slice(0, 3);

        let classTestScore = null;
        if (topClassTests.length) {
            const averageObtained = topClassTests.reduce((sum, row) => sum + row.obtained, 0) / topClassTests.length;
            const averageMax = topClassTests.reduce((sum, row) => sum + row.max, 0) / topClassTests.length;
            classTestScore = averageMax > 0 ? (averageObtained / averageMax) * 10 : 0;
        } else if (classTests.length) {
            missing.push("Class Test");
        }

        if (pendingClassTestCount > 0 && topClassTests.length) {
            missing.push(`${pendingClassTestCount} Class Test mark${pendingClassTestCount > 1 ? "s" : ""}`);
        }

        const midTermScore = scaledComponentScore(midTerm, 20, "Mid Term", missing);
        const projectScore = directComponentScore(project, "Project/Assignment/Presentation", missing);
        const attendanceScore = directComponentScore(attendance, "Attendance", missing);
        const classTestMax = classTests.length ? 10 : 0;
        const midTermMax = midTerm ? 20 : 0;
        const projectMax = project ? project.max || 0 : 0;
        const attendanceMax = attendance ? attendance.max || 0 : 0;
        const totalMax = classTestMax + midTermMax + projectMax + attendanceMax;
        const total = (classTestScore || 0) + (midTermScore || 0) + (projectScore || 0) + (attendanceScore || 0);

        return {
            classTests,
            midTerm,
            project,
            attendance,
            classTestScore,
            classTestMax,
            midTermScore,
            midTermMax,
            projectScore,
            projectMax,
            attendanceScore,
            attendanceMax,
            total,
            totalMax,
            isProvisional: missing.length > 0,
            missing,
        };
    }

    function finalRequirements(inCourseTotal) {
        return gradeScale.map(grade => {
            const requiredRaw = (grade.min - inCourseTotal) * 2;
            if (requiredRaw <= 0) return Object.assign({}, grade, { status: "achieved", requiredRaw: 0 });
            if (requiredRaw > 100) return Object.assign({}, grade, { status: "impossible", requiredRaw: null });
            return Object.assign({}, grade, { status: "needed", requiredRaw });
        });
    }

    function gradeForTotal(total) {
        return gradeScale.find(grade => total >= grade.min) || gradeScale[gradeScale.length - 1];
    }

    function renderManualInputs(rows) {
        rows.forEach(row => {
            if (row.obtained !== null || !row.max || !row.obtainedCell) return;

            const key = rowKey(row);
            row.rowElement.classList.add(classes.missingSource);
            row.obtainedCell.insertAdjacentHTML("beforeend", `
                <div class="${classes.manualInput}">
                    <input
                        type="number"
                        min="0"
                        max="${row.max}"
                        step="0.01"
                        inputmode="decimal"
                        data-bup-ucam-extension-manual-key="${key}"
                        value="${manualMarkFor(row)}"
                        placeholder="Enter mark"
                        aria-label="Enter ${escapeHTML(row.name)} mark"
                    >
                    <small>/ ${formatMark(row.max)}</small>
                </div>`);
        });
    }

    function markBadgeHTML(value) {
        if (value === null) return `<span class="${classes.markBadge} ${classes.markPending}">--</span>`;
        return `<span class="${classes.markBadge} ${classes.markAchieved}">${formatMark(value)}</span>`;
    }

    function limitBadgeHTML(value) {
        return `<span class="${classes.markBadge} ${classes.markLimit}">${formatMark(value)}</span>`;
    }

    function totalBadgeHTML(value, isLimit = false) {
        const limitClass = isLimit ? ` ${classes.totalLimit}` : "";
        return `<span class="${classes.totalBadge}${limitClass}">${formatMark(value)}</span>`;
    }

    function inCourseRowsHTML(inCourse) {
        const classTestNote = inCourse.classTests.length
            ? `Best 3 of ${inCourse.classTests.length}, scaled to /10`
            : "Best 3, scaled to /10";
        const provisionalLabel = inCourse.isProvisional ? " <small>(provisional)</small>" : "";

        return `
            <tr class="${classes.generatedRow}">
                <td align="center" valign="middle"><span class="${classes.rowIcon}">&#931;</span></td>
                <td align="center" valign="middle"><span class="bup-ucam-extension-component-name">Class Test Average <small>(${classTestNote})</small></span></td>
                <td align="center" valign="middle">${limitBadgeHTML(inCourse.classTestMax)}</td>
                <td align="center" valign="middle">${markBadgeHTML(inCourse.classTestScore)}</td>
            </tr>
            <tr class="${classes.generatedRow}">
                <td align="center" valign="middle"><span class="${classes.rowIcon}">&#931;</span></td>
                <td align="center" valign="middle"><span class="bup-ucam-extension-component-name">Mid Term <small>(scaled to /20)</small></span></td>
                <td align="center" valign="middle">${limitBadgeHTML(inCourse.midTermMax)}</td>
                <td align="center" valign="middle">${markBadgeHTML(inCourse.midTermScore)}</td>
            </tr>
            <tr class="${classes.totalRow}">
                <td align="center" valign="middle"><span class="${classes.rowIcon} ${classes.rowIconTotal}">&#8721;</span></td>
                <td align="center" valign="middle"><span class="bup-ucam-extension-total-label">TOTAL IN-COURSE MARKS${provisionalLabel}</span></td>
                <td align="center" valign="middle">${totalBadgeHTML(inCourse.totalMax, true)}</td>
                <td align="center" valign="middle">${totalBadgeHTML(inCourse.total)}</td>
            </tr>`;
    }

    function requirementCellHTML(requirement) {
        if (requirement.status === "achieved") {
            return `<span class="${classes.status} ${classes.statusAchieved}">Already Secured</span>`;
        }
        if (requirement.status === "impossible") {
            return `<span class="${classes.status} ${classes.statusImpossible}">Not Achievable</span>`;
        }
        return markBadgeHTML(requirement.requiredRaw);
    }

    function finalSectionHTML(inCourse, requirements) {
        const bestCaseTotal = inCourse.total + 50;
        const worstCaseTotal = inCourse.total;
        const bestGrade = gradeForTotal(Math.min(bestCaseTotal, 100));
        const worstGrade = gradeForTotal(worstCaseTotal);
        const provisionalNote = inCourse.isProvisional
            ? `<div class="${classes.provisionalNote}">Provisional - still awaiting: ${escapeHTML(inCourse.missing.join(", "))}. Figures below will update once those are posted.</div>`
            : "";
        const rows = requirements.map((requirement, index) => {
            const currentFloorClass = requirement.grade === worstGrade.grade ? ` class="${classes.currentFloor}"` : "";

            return `
                <tr${currentFloorClass}>
                    <td align="center" valign="middle"><span class="${classes.rowNumber}">${index + 1}</span></td>
                    <td align="center" valign="middle"><strong>${requirement.grade}</strong></td>
                    <td align="center" valign="middle">${requirement.min}.00 - ${requirement.max}.00</td>
                    <td align="center" valign="middle">${requirement.gpa.toFixed(2)}</td>
                    <td align="center" valign="middle">${escapeHTML(requirement.desc)}</td>
                    <td align="center" valign="middle">${requirementCellHTML(requirement)}</td>
                </tr>`;
        }).join("");

        return `
            <section id="${ids.finalSection}" aria-label="BUP UCAM Extension final exam planning">
                <div class="${classes.finalHeader}">
                    <span class="${classes.finalHeaderIcon}" aria-hidden="true">+</span>
                    <span>Final Exam Marks Needed for Each Grade</span>
                </div>
                <div class="${classes.summary}">
                    <div><strong>Total In-Course Marks:</strong> ${formatMark(inCourse.total)} / ${formatMark(inCourse.totalMax)}</div>
                    <div><strong>If you score 100 in Final:</strong> ${formatMark(bestCaseTotal)} / 100 -> <strong>${bestGrade.grade}</strong></div>
                    <div><strong>If you score 0 in Final:</strong> ${formatMark(worstCaseTotal)} / 100 -> <strong>${worstGrade.grade}</strong></div>
                </div>
                ${provisionalNote}
                <div class="${classes.tableWrap}">
                    <table class="${classes.finalTable}" cellspacing="0" border="0">
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Grade</th>
                                <th scope="col">Marks Range</th>
                                <th scope="col">GPA</th>
                                <th scope="col">Description</th>
                                <th scope="col">Required in Final (out of 100)</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="${classes.footnote}">
                    Final Exam is out of 100 and is scaled x0.5 into the overall result (Overall = In-Course /50 + Final x0.5).
                    BUP UCAM Extension estimate - please double-check against your course teacher's official scheme.
                </div>
            </section>`;
    }

    function renderSignature(rows) {
        const sourceSignature = rows
            .map(row => `${row.serial}:${row.sourceIndex}:${row.name}:${row.max}:${row.obtained}`)
            .join("|");
        const manualSignature = Array.from(manualMarksByRow.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${key}:${value}`)
            .join("|");

        return `${sourceSignature}::manual=${manualSignature}`;
    }

    function removeInjectedUI(table) {
        table
            .querySelectorAll(`.${classes.generatedRow}, .${classes.totalRow}, .${classes.manualInput}`)
            .forEach(element => element.remove());
        table
            .querySelectorAll(`.${classes.missingSource}`)
            .forEach(element => element.classList.remove(classes.missingSource));

        const finalSection = document.getElementById(ids.finalSection);
        if (finalSection) finalSection.remove();
    }

    function bindManualInputs(table) {
        table.querySelectorAll(selectors.manualMarkInput).forEach(input => {
            input.addEventListener("input", () => {
                const key = input.dataset.bupUcamExtensionManualKey;
                const mark = parseMark(input.value);

                if (mark === null) manualMarksByRow.delete(key);
                else manualMarksByRow.set(key, mark);

                render(true);

                const restoredInput = document.querySelector(`[data-bup-ucam-extension-manual-key="${key}"]`);
                if (restoredInput) restoredInput.focus();
            });
        });
    }

    function render(force = false) {
        const table = document.getElementById(ids.marksTable);
        if (!table) return;

        const rows = readAssessmentRows(table);
        if (!rows.length) return;

        const signature = renderSignature(rows);
        if (!force && signature === lastRenderSignature) return;
        lastRenderSignature = signature;

        removeInjectedUI(table);

        const inCourse = calculateInCourse(rows);
        renderManualInputs(rows);

        const tbody = table.querySelector("tbody");
        if (tbody) tbody.insertAdjacentHTML("beforeend", inCourseRowsHTML(inCourse));
        bindManualInputs(table);

        const wrapper = table.closest(selectors.hostTableWrapper);
        const section = wrapper ? wrapper.closest(selectors.hostDataSection) : null;
        if (section && section.parentElement) {
            section.insertAdjacentHTML("afterend", finalSectionHTML(inCourse, finalRequirements(inCourse.total)));
        }
    }

    function observeUpdatePanel(panel) {
        render();
        new MutationObserver(debounce(() => render(), 200)).observe(panel, { childList: true, subtree: true });
    }

    function startWhenPortalIsReady() {
        const panel = document.getElementById(ids.updatePanel);
        if (!panel) return false;

        observeUpdatePanel(panel);
        return true;
    }

    function init() {
        if (startWhenPortalIsReady()) return;

        const attachBootObserver = () => {
            if (!document.body) return;

            const bootObserver = new MutationObserver(() => {
                if (startWhenPortalIsReady()) bootObserver.disconnect();
            });

            bootObserver.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => bootObserver.disconnect(), 15000);
        };

        if (document.body) attachBootObserver();
        else document.addEventListener("DOMContentLoaded", attachBootObserver, { once: true });
    }

    app.features.examPlanner = { init };
})();
