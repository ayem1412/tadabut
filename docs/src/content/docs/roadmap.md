---
title: 'Roadmap'
description: "What's done, and what comes next."
---

What's done, and what comes next.

Done:

- [x] Project setup
- [x] Thin wrapper: typed columns, data loading, cleanup
- [x] React adapter
- [x] Inputs: text, number, date, checkbox, select
- [x] Custom editors (Select2, date pickers, …)
- [x] Row editing: save, cancel, validation errors
- [x] Chained selects
- [x] Show labels instead of raw values in cells
- [x] First release (0.1.0)
- [x] Your own classes on the table and buttons (`classNames`), and a Bootstrap 5 recipe
- [x] API reference site
- [x] Pass DataTables settings through (paging, page sizes, default order, language, extensions like Buttons), and column `width`, `visible`, `orderable`, `searchable` and `className`
- [x] Selects that also save their label in the row (`labelProp`), so the cell shows the new label after a save
- [x] Translations for Tadabut's own texts (buttons and error messages), French built in
- [x] Deleting rows, with a question first that you can replace (`confirmDelete`)
- [x] Adding new rows, at the top of the table (`add()` and `onAdd`)
- [x] Checkboxes with your own values, like `'O'` and `'N'` instead of `true` and `false`
- [x] Money inputs, formatted while typing (`12 500.00`)
- [x] Totals in the footer: sum, average, min, max, count or your own
- [x] A checkbox column to select rows, with "check all"
- [x] More events: when editing starts (and stopping it), after saving, adding and deleting, row click and double click, and double click to edit
- [x] Dates in any format (`dd/mm/yyyy`…), in the data and the cells, and sorting by the real date
- [x] Detail rows that open under a row, async and with JSX in React
- [x] Read-only, time and date-with-time inputs
- [x] Reading and changing rows from code: `getData`, `getRow`, `insertRow`, `updateRow`, `removeRow`, `getTotals`, `getOptions` and the DataTables API
- [x] Totals of the ticked rows only (`totalRows: 'selected'`)
- [x] A current row: clicking a row highlights it, one at a time, apart from the checkboxes
- [x] Turning editing on and off while the table is shown (`editable`, `setEditable`)
- [x] A new row that's always open (`autoAdd`)
- [x] Badges, links and icons in cells: `render` can return an element, built safely with `html`
- [x] Icons instead of text on the buttons (`icons`)
- [x] Shared settings for many tables (`Tadabut.extend`, `<TadabutDefaults>`)
- [x] Listening to events from anywhere (`table.on`, `table.off`)
- [x] Big tables: loading one page at a time from the server (`server`, `reload`)
- [x] A Vue component (`tadabut/vue`)

Next, roughly in this order:

- [ ] Choosing what turning editing off does: hide the buttons column or grey the buttons out, and cancel open rows or leave them open
- [ ] Choosing what clicking the current row again does: remove the highlight or keep it
- [ ] Keyboard navigation and theming
- [ ] A message under the new row when the id the user typed is already in the table, instead of only an error in the console

Later: popup editing, changing many rows in one go, a jQuery adapter.
