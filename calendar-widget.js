(() => {
 // 1. Handle query string and widget param injection
 function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        CongregationID: p.get("CongregationID") || "",
        TagList: p.get("TagList") || "",
        StartDate: p.get("StartDate"),
        EndDate: p.get("EndDate")
    };

}

function setWidgetParams() {
    const p = getUrlParams();
    const w = document.getElementById("MyCustomWidget");

    if (!p.StartDate || !p.EndDate) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const f = d => d.toISOString().split("T")[0];

        p.StartDate = p.StartDate || f(today);
        p.EndDate = p.EndDate || f(nextWeek);
        const u = new URL(window.location.href);
        u.searchParams.set("StartDate", p.StartDate);
        u.searchParams.set("EndDate", p.EndDate);
        return window.location.href = u.toString(); // reload with defaults
    }

    w.setAttribute("data-params", `@CongregationID=${p.CongregationID}&@TagList=${p.TagList}&@StartDate=${p.StartDate}&@EndDate=${p.EndDate}`);
    document.getElementById("startDate").value = p.StartDate;
    document.getElementById("endDate").value = p.EndDate;

    const formatPretty = (iso) => {
        const d = new Date(iso);
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    };

    if (picker) {
        const toLocalDate = (str) => {
            const [y, m, d] = str.split("-").map(Number);
            return new Date(y, m - 1, d); // Local date (not UTC)
        };
        picker.setDateRange(toLocalDate(p.StartDate), toLocalDate(p.EndDate));
    }

    // ✅ Add this to update the visible label
    const displayStart = new Date(p.StartDate);
    displayStart.setDate(displayStart.getDate() + 1);
    const displayEnd = new Date(p.EndDate);
    displayEnd.setDate(displayEnd.getDate() + 1);

    document.querySelector("#dateRangePicker").previousElementSibling.textContent =
        `📅 ${formatPretty(displayStart)} – ${formatPretty(displayEnd)}`;





}

function updateSearchParams() {
    const start = document.getElementById("startDate").value;
    const end = document.getElementById("endDate").value;
    if (!start || !end) return alert("Please select both dates");

    const selectedCampuses = Array.from(document.querySelectorAll("#selectedCampuses .badge"))
        .map(badge => badge.getAttribute("data-id"));

    const selectedTags = Array.from(document.querySelectorAll("#selectedTags .badge"))
        .map(badge => badge.getAttribute("data-id"));

    const u = new URL(window.location.href);
    u.searchParams.set("StartDate", start);
    u.searchParams.set("EndDate", end);
    u.searchParams.set("CongregationID", selectedCampuses.join(","));
    if (selectedTags.length > 0) {
        u.searchParams.set("TagList", selectedTags.join(","));
    } else {
        u.searchParams.delete("TagList");
    }


    window.location.href = u.toString();
}

let picker; // Declare at the top so it’s accessible

document.addEventListener("DOMContentLoaded", () => {
    picker = new Litepicker({
        element: document.getElementById("dateRangePicker"),
        singleMode: false,
        format: "YYYY-MM-DD",
        allowRepick: true,
        autoApply: true,
        lang: "en-US",
        numberOfMonths: window.innerWidth < 768 ? 1 : 2,
        numberOfColumns: window.innerWidth < 768 ? 1 : 2,
        setup: (pickerInstance) => {
            pickerInstance.on('selected', (startDate, endDate) => {
                const start = startDate.dateInstance;
                const end = endDate.dateInstance;

                const iso = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
                const pretty = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

                document.getElementById("startDate").value = iso(start);
                document.getElementById("endDate").value = iso(end);
                const toggleDiv = document.querySelector("#dateRangePicker").previousElementSibling;
                toggleDiv.textContent = `📅 ${pretty(start)} – ${pretty(end)}`;
            });

        }
    });


    setWidgetParams(); // ✅ Now safe to run this after picker exists
});

function toggleDropdown() {
    document.querySelector("#campusDropdownOptions").parentElement.classList.toggle("open");
}


function renderTagDropdown(dataSet3) {
    const dropdown = document.getElementById("tagDropdownOptions");
    const selectedContainer = document.getElementById("selectedTags");
    dropdown.innerHTML = "";
    selectedContainer.innerHTML = "";

    const selected = (new URLSearchParams(window.location.search).get("TagList") || "")
        .split(",")
        .filter(Boolean);

    dataSet3.forEach(tag => {
        const label = document.createElement("label");
        label.innerHTML = `
        <input type="checkbox" value="${tag.Tag_ID}" ${selected.includes(tag.Tag_ID.toString()) ? "checked" : ""}>
        ${tag.Tag_Name}
    `;
        dropdown.appendChild(label);
    });

    selected.forEach(id => {
        const name = dataSet3.find(tag => tag.Tag_ID.toString() === id)?.Tag_Name || id;
        addTagBadge(id, name);
    });

    dropdown.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
            if (cb.checked) {
                addTagBadge(cb.value, cb.parentElement.textContent.trim());
            } else {
                removeTagBadge(cb.value);
            }
        });
    });
}

function toggleTagDropdown() {
    document.querySelector("#tagDropdownOptions").parentElement.classList.toggle("open");
}

function addTagBadge(id, name) {
    const container = document.getElementById("selectedTags");
    if (container.querySelector(`[data-id='${id}']`)) return;

    const span = document.createElement("span");
    span.className = "badge";
    span.setAttribute("data-id", id);
    span.innerHTML = `${name} <span class="remove" onclick="removeTagBadge('${id}')">&times;</span>`;
    container.appendChild(span);
}

function removeTagBadge(id) {
    document.querySelector(`#selectedTags .badge[data-id="${id}"]`)?.remove();
    const checkbox = document.querySelector(`#tagDropdownOptions input[value="${id}"]`);
    if (checkbox) checkbox.checked = false;
}


function renderCampusDropdown(dataSet4) {
    const dropdown = document.getElementById("campusDropdownOptions");
    const selectedContainer = document.getElementById("selectedCampuses");
    dropdown.innerHTML = "";
    selectedContainer.innerHTML = "";

    const selected = (new URLSearchParams(window.location.search).get("CongregationID") || "")
        .split(",")
        .filter(Boolean);

    dataSet4.forEach(c => {
        const label = document.createElement("label");
        label.innerHTML = `
    <input type="checkbox" value="${c.Congregation_ID}" ${selected.includes(c.Congregation_ID.toString()) ? "checked" : ""}>
    ${c.Congregation_Name}
  `;
        dropdown.appendChild(label);
    });

    // Render badges for selected
    selected.forEach(id => {
        const name = dataSet4.find(c => c.Congregation_ID.toString() === id)?.Congregation_Name || id;
        addBadge(id, name);
    });

    // Handle checkbox change
    dropdown.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
            if (cb.checked) {
                addBadge(cb.value, cb.parentElement.textContent.trim());
            } else {
                removeBadge(cb.value);
            }
        });
    });
}

function addBadge(id, name) {
    const container = document.getElementById("selectedCampuses");
    if (container.querySelector(`[data-id='${id}']`)) return;

    const span = document.createElement("span");
    span.className = "badge";
    span.setAttribute("data-id", id);
    span.innerHTML = `${name} <span class="remove" onclick="removeBadge('${id}')">&times;</span>`;
    container.appendChild(span);
}

function removeBadge(id) {
    document.querySelector(`#selectedCampuses .badge[data-id="${id}"]`)?.remove();
    const checkbox = document.querySelector(`#campusDropdownOptions input[value="${id}"]`);
    if (checkbox) checkbox.checked = false;
}





// 2. Render event cards and pagination when widget is done
window.addEventListener("widgetLoaded", function (event) {
    const wrapper = document.getElementById("event-wrapper");
    const paginator = document.getElementById("calendar-pagination");

    if (!event.detail || !event.detail.data) return console.warn("No data in widgetLoaded");

    if (event.detail.data.DataSet4) {
        renderCampusDropdown(event.detail.data.DataSet4);
    }
    if (event.detail.data.DataSet3) {
        renderTagDropdown(event.detail.data.DataSet3);
    }


    const dataSet1 = event.detail.data.DataSet1 || [];
    const dataSet2 = event.detail.data.DataSet2 || [];
    const eventsPerPage = 48;
    let currentPage = 1;

    const allEvents = dataSet1.flatMap(day => {
        const dayKey = day.Date_Number.split("T")[0];
        const dayEvents = dataSet2.filter(e => e.Date_Number.startsWith(dayKey));
        return dayEvents.map(e => ({ ...e, dayText: day.Date_Text }));
    });
    // Handle no results
    if (allEvents.length === 0) {
        const wrapper = document.getElementById("event-wrapper");
        wrapper.innerHTML = `
    <div class="col-12 text-center">
        <h3>No events found for the selected filters. Please expand your date range, add more campuses, or add more categories.</h3>
        <div style="margin-bottom: 20px" class="row justify-content-center jb-block-button mt-3">
            <div class="col-auto wp-block-button">
                <a href="${window.location.pathname}" class="wp-block-button__link wp-element-button">
                    Reset Filters
                </a>
            </div>
        </div>
    </div>
`;
        document.getElementById("calendar-pagination").innerHTML = "";
        return; // Skip rendering
    }



    function renderPage(page) {
        wrapper.innerHTML = "";
        const start = (page - 1) * eventsPerPage;
        const end = start + eventsPerPage;
        const pageEvents = allEvents.slice(start, end);

        let currentDay = "";
        let groupWrapper;

        pageEvents.forEach(e => {
            if (e.dayText !== currentDay) {
                currentDay = e.dayText;

                // wrapper for this day
                groupWrapper = document.createElement("div");
                groupWrapper.classList.add("jb-events-item");

                // day heading
                const h = document.createElement("h2");
                h.classList.add("jb-events-item__title");
                h.textContent = currentDay;

                groupWrapper.appendChild(h);

                // inner row for event cards
                const row = document.createElement("div");
                row.classList.add("row");
                groupWrapper.appendChild(row);

                wrapper.appendChild(groupWrapper);
            }

            const col = document.createElement("div");
            col.classList.add("col-md-4", "mb-4");
            col.style.marginBottom = "1.5rem";
            col.innerHTML = `
    <a href="https://lutheranchurchofhope.org/event/?id=${e.Event_ID}" class="text-dark text-decoration-none h-100">
        <div class="event-card h-100 d-flex flex-column">
            <img src="${e.Event_Image_Url}" class="event-image mb-2" alt="${e.Event_Title}">
            <h3 style="margin-bottom: 0px;" class="event-title mt-2">${e.Event_Title}</h3>
            <div class="event-details mt-auto">
                <div>${e.Pretty_Date} at ${e.Start_Time}</div>
                <div>${e.Location_Name}${e.Event_Room ? ' - ' + e.Event_Room : ''}</div>
            </div>
        </div>
    </a>
`;

            // append to the latest row inside the group
            groupWrapper.lastElementChild.appendChild(col);
        });


        renderPagination();
        /*
        // scroll to top of widget
        const firstHeading = document.querySelector(".jb-events-item__title");
        if (firstHeading) {
            const yOffset = -150; // adjust based on your header height
            const y = firstHeading.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
        */

    }

    function renderPagination() {
        paginator.innerHTML = "";
        const totalPages = Math.ceil(allEvents.length / eventsPerPage);
        if (totalPages <= 1) return;

        const createBtn = (text, page, disabled = false, isActive = false) => {
            const btn = document.createElement("button");
            btn.className = `btn mx-1 ${isActive ? "btn-secondary" : "btn-outline-secondary"}`;
            btn.textContent = text;
            btn.disabled = disabled;

            btn.onclick = () => {
                currentPage = page;
                renderPage(page);

                // Scroll only when pagination button is clicked
                const firstHeading = document.querySelector(".jb-events-item__title");
                if (firstHeading) {
                    const yOffset = -150; // tweak as needed
                    const y = firstHeading.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: "smooth" });
                }
            };

            return btn;
        };


        const addEllipsis = () => {
            const span = document.createElement("span");
            span.textContent = "...";
            span.classList.add("mx-1", "text-muted");
            paginator.appendChild(span);
        };

        // Prev Arrow
        if (currentPage > 1) {
            paginator.appendChild(createBtn("«", currentPage - 1));
        }

        const range = [];
        const pageWindow = 1;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - pageWindow && i <= currentPage + pageWindow)
            ) {
                range.push(i);
            } else if (
                i === currentPage - pageWindow - 1 ||
                i === currentPage + pageWindow + 1
            ) {
                range.push("...");
            }
        }

        let last = 0;
        range.forEach(n => {
            if (n === "...") {
                addEllipsis();
            } else {
                paginator.appendChild(createBtn(n, n, false, n === currentPage));
                last = n;
            }
        });

        // Next Arrow
        if (currentPage < totalPages) {
            paginator.appendChild(createBtn("»", currentPage + 1));
        }
    }


    renderPage(currentPage);
});

})();