# Excel Upload Instructions

## Required Format

Your Excel file must have the following columns in the **first row**:

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| **SDG Goal** | **Problem Statement** | **Recommended Stakeholder 1** | **Recommended Stakeholder 2** | **Recommended Stakeholder 3** |

## Example:

| SDG Goal | Problem Statement | Recommended Stakeholder 1 | Recommended Stakeholder 2 | Recommended Stakeholder 3 |
|----------|-------------------|---------------------------|---------------------------|---------------------------|
| No Poverty | Public washrooms in cities are unclean... | Washroom cleaners | City officials | Health department |
| Zero Hunger | Food waste in restaurants... | Restaurant owners | Food bank managers | |

## Important Notes:

1. **Headers must be in Row 1** - No empty rows above the headers
2. **Column names are flexible** - The system will recognize:
   - "SDG Goal" or any column containing "SDG" and "Goal"
   - "Problem Statement" or any column containing "Problem" and "Statement"
   - "Recommended Stakeholder 1/2/3" or any column containing "Stakeholder"
3. **If exporting from Numbers:**
   - Delete the metadata row that says "This document was exported from Numbers..."
   - Make sure your headers are in the first row of the actual data
   - Export as Excel (.xlsx) format

## Troubleshooting:

If you get an error saying columns are not found:
1. Check that your headers are in Row 1 (first row)
2. Make sure column names contain the keywords: "SDG", "Goal", "Problem", "Statement"
3. Check the server console logs for detailed debugging information



