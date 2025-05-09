# README.md (Front-End Calendar Widget)

## 📅 Custom Calendar Widget for Ministry Platform

This is a modern, responsive calendar widget built to integrate with Ministry Platform (MP). It supports filtering by category, campus, and date range, and renders event cards dynamically via JavaScript. It uses Bootstrap 5 and Litepicker, and is designed to be fully client-side.

### 🔧 Features

* Multi-select tag (category) and campus filters
* Date range selector with Litepicker
* Pagination (48 events per page)
* Image fallback logic (event > program > stock image)
* Custom styling hooks
* Graceful "no events found" fallback with reset button

### 💻 Usage

```html
<div id="MyCustomWidget"
     data-component="CustomWidget"
     data-sp="api_Custom_LCOH_Calendar_List_Filter_v2"
     data-template="https://yourcdn.com/calendar.html"
     data-requireUser="false"
     data-cache="false"
     data-host="yourdomain"
     data-debug="true">
</div>

<script src="https://yourcdn.com/calendar-widget.js"></script>
<link rel="stylesheet" href="https://yourcdn.com/calendar-widget.css" />
```

### ⚙️ Setup

1. Host `calendar-widget.js` and `calendar-widget.css` on your preferred CDN or static file server.
2. Reference them in your HTML file.
3. Customize your `data-*` attributes as needed (API name, template URL, etc.).
4. Include a stored procedure on the MP backend (see below).

### 🧠 Tech Stack

* **JS:** Vanilla JavaScript (wrapped in IIFE)
* **CSS:** Bootstrap 5, custom styling
* **Picker:** [Litepicker](https://wakirin.github.io/Litepicker/)

---

# README-stored-procedure.md (SQL Procedure)

## 🛠 Stored Procedure: `api_Custom_LCOH_Calendar_List_Filter_v2`

This stored procedure provides the backend data for the custom Ministry Platform calendar widget.

### 🎯 Purpose

To return events within a given date range and filter set (tags, congregations) and deliver them in four datasets:

* **DataSet1:** List of days within the date range
* **DataSet2:** List of filtered events, formatted for front-end display
* **DataSet3:** Available tags for filtering
* **DataSet4:** Available campuses/congregations for filtering

### 🧾 Input Parameters

| Param             | Type            | Description                              |
| ----------------- | --------------- | ---------------------------------------- |
| `@DomainID`       | `int`           | Required by MP                           |
| `@CongregationID` | `nvarchar(256)` | Comma-separated list of campus IDs       |
| `@TagList`        | `nvarchar(256)` | Comma-separated list of tag IDs          |
| `@StartDate`      | `nvarchar(256)` | Start of the date range (or UNIX ms)     |
| `@EndDate`        | `nvarchar(256)` | End of the date range (or UNIX ms)       |
| `@SearchQuery`    | `nvarchar(256)` | Optional search string for event content |

### 🧠 Core Logic

1. **Start/End Parsing:** Accepts ISO date or UNIX timestamp, defaults to today + 7 days.
2. **DataSet1:** Builds a CTE of dates between Start and End.
3. **DataSet2:** Filters `Events` by:

   * Visibility, approval, cancellation
   * Congregation (if any)
   * Tag match (if any)
   * Search query match (optional)
   * Date range inclusive (uses `>= Start AND < End + 1 day`)
4. **Event Image Fallback:**

   * Event image > Program image > Stock photo
5. **Joins Tags and Rooms:**

   * Includes image, room, time, and location metadata.
6. **DataSet3/4:** Returns Tag and Congregation options (including which are selected)

### 🧪 Notes

* `dp_Split` is used to parse comma-separated lists.
* Dates are returned as ISO strings for JavaScript use.
* Events are only included if `Visibility_Level_ID = 4` (public), `_Web_Approved = 1`, `_Approved = 1`, and `Cancelled = 0`.
* `@SearchQuery` is used in a `LIKE` against title, description, and meeting instructions.

---

Let me know if you’d like to break this out into separate files or add versioning/tags.

is this markdown code?  i want the markdown code.  also, which license should i put on this?  i don't really want people to rip it off
