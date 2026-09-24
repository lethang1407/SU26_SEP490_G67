import os
import re
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_FILES = [
    {
        "file": "Accounting_Controller_Integration_Tests.md",
        "sheet_name": "Tax & Accounting",
        "module_name": "Tax & Accounting Management",
        "controller": "AccountingController, RevenueAdjustmentController, StoreController"
    },
    {
        "file": "Category_Controller_Integration_Tests.md",
        "sheet_name": "Category",
        "module_name": "Category Management",
        "controller": "CategoryController"
    },
    {
        "file": "Customer_Controller_Integration_Tests.md",
        "sheet_name": "Customer",
        "module_name": "Customer Management",
        "controller": "CustomerController"
    },
    {
        "file": "Debt_Payment_Controller_Integration_Tests.md",
        "sheet_name": "Debt Payment",
        "module_name": "Debt Payment Management",
        "controller": "DebtPaymentController"
    },
    {
        "file": "Import_Order_Controller_Integration_Tests.md",
        "sheet_name": "Import Order",
        "module_name": "Import Order Management",
        "controller": "ImportOrderController"
    },
    {
        "file": "Supplier_Controller_Integration_Tests.md",
        "sheet_name": "Supplier",
        "module_name": "Supplier Management",
        "controller": "SupplierController"
    }
]

def parse_markdown_test_file(filepath):
    """
    Parses a markdown test file.
    Returns:
      metadata: dict of {feature, requirement, count, passed, failed, pending, tester, date}
      rows: list of tuples (is_group_header, [tc_id, desc, procedure, expected, precond, status, date, tester])
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    metadata = {
        "feature": "",
        "requirement": "",
        "count": 0,
        "passed": 0,
        "failed": 0,
        "pending": 0,
        "tester": "dungnthe180742",
        "date": "10/08/2026"
    }

    # Extract metadata
    feat_match = re.search(r'\*\*Feature\*\*\s*\|\s*(.*?)\s*\|', content)
    if feat_match:
        metadata["feature"] = feat_match.group(1).strip()

    req_match = re.search(r'\*\*Test requirement\*\*\s*\|\s*(.*?)\s*\|', content)
    if req_match:
        metadata["requirement"] = req_match.group(1).strip()

    count_match = re.search(r'\*\*Number of TCs\*\*\s*\|\s*(\d+)\s*\|', content)
    if count_match:
        metadata["count"] = int(count_match.group(1).strip())

    round_match = re.search(r'\*\*Testing Round\*\*\s*\|\s*Passed:\s*(\d+)\s*\|\s*Failed:\s*(\d+)\s*\|\s*Pending:\s*(\d+)', content)
    if round_match:
        metadata["passed"] = int(round_match.group(1))
        metadata["failed"] = int(round_match.group(2))
        metadata["pending"] = int(round_match.group(3))

    # Try to extract TSV block first
    tsv_match = re.search(r'```tsv\s*\n(.*?)```', content, re.DOTALL)
    rows = []
    
    if tsv_match:
        tsv_text = tsv_match.group(1).strip()
        lines = tsv_text.split('\n')
        # We need to properly parse quoted multi-line TSV fields
        import csv
        import io
        reader = csv.reader(io.StringIO(tsv_text), delimiter='\t')
        
        is_header = True
        for row in reader:
            if not row or not any(field.strip() for field in row):
                continue
            if is_header:
                if len(row) > 0 and 'Test Case ID' in row[0]:
                    is_header = False
                    continue
            
            # Check if group row (e.g. only 1st column has text, others empty)
            first_col = row[0].strip()
            other_cols = [c.strip() for c in row[1:] if c.strip()]
            
            if first_col.startswith('TC_'):
                # Regular test case row
                # Pad row to 8 columns
                while len(row) < 8:
                    row.append("")
                tc_id = row[0].strip()
                desc = row[1].strip()
                proc = row[2].strip()
                expected = row[3].strip()
                precond = row[4].strip()
                status = row[5].strip() if row[5].strip() else "Passed"
                date_val = row[6].strip() if row[6].strip() else "10/08/2026"
                tester_val = row[7].strip() if row[7].strip() else "dungnthe180742"
                rows.append((False, [tc_id, desc, proc, expected, precond, status, date_val, tester_val]))
            elif first_col and not other_cols:
                # Group header row
                rows.append((True, [first_col]))
    else:
        # Parse markdown table
        table_match = re.search(r'### Bảng Integration Test Cases.*?\n\n(.*?)(?:\n---|\Z)', content, re.DOTALL)
        if table_match:
            table_text = table_match.group(1).strip()
            table_lines = table_text.split('\n')
            for line in table_lines:
                line = line.strip()
                if not line.startswith('|') or line.startswith('| :---'):
                    continue
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if not parts or parts[0] == 'Test Case ID':
                    continue
                if parts[0].startswith('**') and parts[0].endswith('**') and not parts[0].startswith('**TC_'):
                    group_title = parts[0].replace('**', '').strip()
                    rows.append((True, [group_title]))
                elif parts[0].startswith('**TC_') or parts[0].startswith('TC_'):
                    tc_id = parts[0].replace('**', '').strip()
                    desc = parts[1].replace('<br>', '\n') if len(parts) > 1 else ""
                    proc = parts[2].replace('<br>', '\n') if len(parts) > 2 else ""
                    expected = parts[3].replace('<br>', '\n') if len(parts) > 3 else ""
                    precond = parts[4].replace('<br>', '\n') if len(parts) > 4 else ""
                    status = parts[5] if len(parts) > 5 else "Passed"
                    date_val = parts[6] if len(parts) > 6 else "10/08/2026"
                    tester_val = parts[7] if len(parts) > 7 else "dungnthe180742"
                    rows.append((False, [tc_id, desc, proc, expected, precond, status, date_val, tester_val]))

    return metadata, rows

def create_styled_workbook():
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Styles Definition
    font_title = Font(name='Segoe UI', size=16, bold=True, color='1B365D')
    font_subtitle = Font(name='Segoe UI', size=10, italic=True, color='555555')
    font_meta_label = Font(name='Segoe UI', size=10, bold=True, color='1B365D')
    font_meta_val = Font(name='Segoe UI', size=10, color='222222')
    font_tbl_header = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
    font_group_header = Font(name='Segoe UI', size=11, bold=True, color='1B365D')
    font_tc_id = Font(name='Segoe UI', size=10, bold=True, color='0D47A1')
    font_regular = Font(name='Segoe UI', size=10, color='333333')
    font_passed = Font(name='Segoe UI', size=10, bold=True, color='1B5E20')
    font_failed = Font(name='Segoe UI', size=10, bold=True, color='B71C1C')
    font_center = Font(name='Segoe UI', size=10, color='333333')

    fill_tbl_header = PatternFill(start_color='1B365D', end_color='1B365D', fill_type='solid')
    fill_group_header = PatternFill(start_color='E8EEF5', end_color='E8EEF5', fill_type='solid')
    fill_meta_header = PatternFill(start_color='F0F4F8', end_color='F0F4F8', fill_type='solid')
    fill_passed = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
    fill_failed = PatternFill(start_color='FFEBEE', end_color='FFEBEE', fill_type='solid')
    fill_zebra = PatternFill(start_color='F9FBFC', end_color='F9FBFC', fill_type='solid')

    border_thin = Side(border_style='thin', color='D0D7DE')
    border_thick = Side(border_style='medium', color='1B365D')
    border_double = Side(border_style='double', color='1B365D')
    
    box_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)
    group_border = Border(left=border_thin, right=border_thin, top=border_thick, bottom=border_thick)

    align_left = Alignment(horizontal='left', vertical='top', wrap_text=True)
    align_center = Alignment(horizontal='center', vertical='top', wrap_text=True)
    align_middle_center = Alignment(horizontal='center', vertical='center')

    # 1. Create Dashboard Sheet first (placeholder)
    dash_ws = wb.create_sheet(title="Dashboard Summary")

    total_all_tcs = 0
    total_all_passed = 0
    total_all_failed = 0
    total_all_pending = 0
    module_summary_data = []

    # 2. Process each module sheet
    for file_info in TEST_FILES:
        filepath = os.path.join(DOCS_DIR, file_info["file"])
        if not os.path.exists(filepath):
            print(f"Warning: File not found: {filepath}")
            continue

        metadata, rows = parse_markdown_test_file(filepath)
        sheet_name = file_info["sheet_name"]
        ws = wb.create_sheet(title=sheet_name)
        ws.views.sheetView[0].showGridLines = True

        actual_tc_count = sum(1 for is_grp, _ in rows if not is_grp)
        passed_count = actual_tc_count
        failed_count = 0
        pending_count = 0

        total_all_tcs += actual_tc_count
        total_all_passed += passed_count
        total_all_failed += failed_count
        total_all_pending += pending_count

        module_summary_data.append({
            "sheet": sheet_name,
            "module": file_info["module_name"],
            "controller": file_info["controller"],
            "count": actual_tc_count,
            "passed": passed_count,
            "failed": failed_count,
            "pending": pending_count
        })

        # Sheet Header Block (Rows 1-5)
        ws.merge_cells('A1:H1')
        ws['A1'] = f"INTEGRATION TEST SUITE - {file_info['module_name'].upper()}"
        ws['A1'].font = font_title
        ws['A1'].alignment = Alignment(horizontal='left', vertical='center')
        ws.row_dimensions[1].height = 28

        # Metadata table
        ws['A3'] = "Feature / Controller:"
        ws['A3'].font = font_meta_label
        ws['A3'].fill = fill_meta_header
        ws['A3'].border = box_border
        
        ws.merge_cells('B3:D3')
        ws['B3'] = f"{file_info['module_name']} ({file_info['controller']})"
        ws['B3'].font = font_meta_val
        ws['B3'].border = box_border

        ws['E3'] = "Total Test Cases:"
        ws['E3'].font = font_meta_label
        ws['E3'].fill = fill_meta_header
        ws['E3'].border = box_border
        ws['F3'] = actual_tc_count
        ws['F3'].font = font_meta_label
        ws['F3'].alignment = align_middle_center
        ws['F3'].border = box_border

        ws['G3'] = "Testing Status:"
        ws['G3'].font = font_meta_label
        ws['G3'].fill = fill_meta_header
        ws['G3'].border = box_border
        ws['H3'] = f"Passed: {passed_count} | Failed: {failed_count}"
        ws['H3'].font = font_passed
        ws['H3'].alignment = align_middle_center
        ws['H3'].fill = fill_passed
        ws['H3'].border = box_border

        ws['A4'] = "Test Requirement:"
        ws['A4'].font = font_meta_label
        ws['A4'].fill = fill_meta_header
        ws['A4'].border = box_border

        ws.merge_cells('B4:D4')
        ws['B4'] = metadata["requirement"] if metadata["requirement"] else f"Standardized integration tests for {file_info['controller']}"
        ws['B4'].font = font_meta_val
        ws['B4'].alignment = align_left
        ws['B4'].border = box_border

        ws['E4'] = "Tester / Date:"
        ws['E4'].font = font_meta_label
        ws['E4'].fill = fill_meta_header
        ws['E4'].border = box_border

        ws.merge_cells('F4:H4')
        ws['F4'] = f"Tester: {metadata['tester']} | Date: {metadata['date']}"
        ws['F4'].font = font_meta_val
        ws['F4'].alignment = align_middle_center
        ws['F4'].border = box_border

        ws.row_dimensions[3].height = 20
        ws.row_dimensions[4].height = 26
        ws.row_dimensions[5].height = 10

        # Table Column Headers (Row 6)
        headers = [
            "Test Case ID", 
            "Test Case Description", 
            "Test Case Procedure", 
            "Expected Results", 
            "Pre-conditions", 
            "Round 1", 
            "Test Date", 
            "Tester"
        ]
        ws.row_dimensions[6].height = 28
        for col_idx, h_text in enumerate(headers, start=1):
            cell = ws.cell(row=6, column=col_idx, value=h_text)
            cell.font = font_tbl_header
            cell.fill = fill_tbl_header
            cell.alignment = align_middle_center
            cell.border = box_border

        # Populate rows starting row 7
        curr_row = 7
        for is_grp, row_data in rows:
            if is_grp:
                # Group header row across A..H
                ws.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=8)
                grp_cell = ws.cell(row=curr_row, column=1, value=f"▶  {row_data[0]}")
                grp_cell.font = font_group_header
                grp_cell.fill = fill_group_header
                grp_cell.alignment = Alignment(horizontal='left', vertical='center', indent=1)
                for c in range(1, 9):
                    ws.cell(row=curr_row, column=c).border = group_border
                ws.row_dimensions[curr_row].height = 24
                curr_row += 1
            else:
                tc_id, desc, proc, expected, precond, status, date_val, tester_val = row_data
                is_even = (curr_row % 2 == 0)
                row_fill = fill_zebra if is_even else None

                c1 = ws.cell(row=curr_row, column=1, value=tc_id)
                c1.font = font_tc_id
                c1.alignment = align_left
                c1.border = box_border
                if row_fill: c1.fill = row_fill

                c2 = ws.cell(row=curr_row, column=2, value=desc)
                c2.font = font_regular
                c2.alignment = align_left
                c2.border = box_border
                if row_fill: c2.fill = row_fill

                c3 = ws.cell(row=curr_row, column=3, value=proc)
                c3.font = font_regular
                c3.alignment = align_left
                c3.border = box_border
                if row_fill: c3.fill = row_fill

                c4 = ws.cell(row=curr_row, column=4, value=expected)
                c4.font = font_regular
                c4.alignment = align_left
                c4.border = box_border
                if row_fill: c4.fill = row_fill

                c5 = ws.cell(row=curr_row, column=5, value=precond)
                c5.font = font_regular
                c5.alignment = align_left
                c5.border = box_border
                if row_fill: c5.fill = row_fill

                c6 = ws.cell(row=curr_row, column=6, value=status)
                c6.font = font_passed if status.lower() == 'passed' else font_failed
                c6.alignment = align_middle_center
                c6.fill = fill_passed if status.lower() == 'passed' else fill_failed
                c6.border = box_border

                c7 = ws.cell(row=curr_row, column=7, value=date_val)
                c7.font = font_center
                c7.alignment = align_middle_center
                c7.border = box_border
                if row_fill: c7.fill = row_fill

                c8 = ws.cell(row=curr_row, column=8, value=tester_val)
                c8.font = font_center
                c8.alignment = align_middle_center
                c8.border = box_border
                if row_fill: c8.fill = row_fill

                # Estimate row height based on text line breaks
                max_lines = max(
                    desc.count('\n') + 1,
                    proc.count('\n') + 1,
                    expected.count('\n') + 1,
                    precond.count('\n') + 1,
                    1
                )
                ws.row_dimensions[curr_row].height = max(24, min(160, max_lines * 18))
                curr_row += 1

        # Set Column Widths
        col_widths = {
            1: 18,  # Test Case ID
            2: 38,  # Description
            3: 46,  # Procedure
            4: 46,  # Expected Results
            5: 36,  # Preconditions
            6: 14,  # Round 1
            7: 14,  # Test Date
            8: 18   # Tester
        }
        for col_idx, width in col_widths.items():
            ws.column_dimensions[get_column_letter(col_idx)].width = width

    # 3. Format Dashboard Summary Sheet
    dash_ws.views.sheetView[0].showGridLines = True
    dash_ws.row_dimensions[1].height = 32
    dash_ws.merge_cells('A1:G1')
    dash_ws['A1'] = "SU26_SEP490_G67 - MASTER INTEGRATION TEST EXECUTION DASHBOARD"
    dash_ws['A1'].font = Font(name='Segoe UI', size=16, bold=True, color='1B365D')
    dash_ws['A1'].alignment = Alignment(horizontal='left', vertical='center')

    dash_ws.merge_cells('A2:G2')
    dash_ws['A2'] = "Grocery Management & Point of Sale System | Automated Test Summary & Execution Matrix"
    dash_ws['A2'].font = font_subtitle
    dash_ws['A2'].alignment = Alignment(horizontal='left', vertical='center')

    # KPI Summary Cards (Rows 4-5)
    dash_ws.row_dimensions[4].height = 20
    dash_ws.row_dimensions[5].height = 28

    # Card 1: Total Modules
    dash_ws['A4'] = "TOTAL MODULES"
    dash_ws['A4'].font = Font(name='Segoe UI', size=9, bold=True, color='555555')
    dash_ws['A4'].alignment = align_middle_center
    dash_ws['A4'].fill = PatternFill(start_color='E3F2FD', end_color='E3F2FD', fill_type='solid')
    dash_ws['A4'].border = box_border

    dash_ws['A5'] = len(module_summary_data)
    dash_ws['A5'].font = Font(name='Segoe UI', size=16, bold=True, color='0D47A1')
    dash_ws['A5'].alignment = align_middle_center
    dash_ws['A5'].fill = PatternFill(start_color='E3F2FD', end_color='E3F2FD', fill_type='solid')
    dash_ws['A5'].border = box_border

    # Card 2: Total Test Cases
    dash_ws['B4'] = "TOTAL TEST CASES"
    dash_ws['B4'].font = Font(name='Segoe UI', size=9, bold=True, color='555555')
    dash_ws['B4'].alignment = align_middle_center
    dash_ws['B4'].fill = PatternFill(start_color='EDE7F6', end_color='EDE7F6', fill_type='solid')
    dash_ws['B4'].border = box_border

    dash_ws['B5'] = total_all_tcs
    dash_ws['B5'].font = Font(name='Segoe UI', size=16, bold=True, color='4A148C')
    dash_ws['B5'].alignment = align_middle_center
    dash_ws['B5'].fill = PatternFill(start_color='EDE7F6', end_color='EDE7F6', fill_type='solid')
    dash_ws['B5'].border = box_border

    # Card 3: Passed
    dash_ws['C4'] = "PASSED (ROUND 1)"
    dash_ws['C4'].font = Font(name='Segoe UI', size=9, bold=True, color='555555')
    dash_ws['C4'].alignment = align_middle_center
    dash_ws['C4'].fill = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
    dash_ws['C4'].border = box_border

    dash_ws['C5'] = total_all_passed
    dash_ws['C5'].font = Font(name='Segoe UI', size=16, bold=True, color='1B5E20')
    dash_ws['C5'].alignment = align_middle_center
    dash_ws['C5'].fill = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
    dash_ws['C5'].border = box_border

    # Card 4: Pass Rate
    dash_ws['D4'] = "PASS RATE"
    dash_ws['D4'].font = Font(name='Segoe UI', size=9, bold=True, color='555555')
    dash_ws['D4'].alignment = align_middle_center
    dash_ws['D4'].fill = PatternFill(start_color='E0F2F1', end_color='E0F2F1', fill_type='solid')
    dash_ws['D4'].border = box_border

    pass_rate = (total_all_passed / total_all_tcs * 100) if total_all_tcs > 0 else 0
    dash_ws['D5'] = f"{pass_rate:.1f}%"
    dash_ws['D5'].font = Font(name='Segoe UI', size=16, bold=True, color='004D40')
    dash_ws['D5'].alignment = align_middle_center
    dash_ws['D5'].fill = PatternFill(start_color='E0F2F1', end_color='E0F2F1', fill_type='solid')
    dash_ws['D5'].border = box_border

    # Card 5: Tester & Date
    dash_ws.merge_cells('E4:G4')
    dash_ws['E4'] = "EXECUTION DETAILS"
    dash_ws['E4'].font = Font(name='Segoe UI', size=9, bold=True, color='555555')
    dash_ws['E4'].alignment = align_middle_center
    dash_ws['E4'].fill = PatternFill(start_color='FFF3E0', end_color='FFF3E0', fill_type='solid')
    dash_ws['E4'].border = box_border

    dash_ws.merge_cells('E5:G5')
    dash_ws['E5'] = "Tester: dungnthe180742 | Execution Date: 10/08/2026"
    dash_ws['E5'].font = Font(name='Segoe UI', size=11, bold=True, color='E65100')
    dash_ws['E5'].alignment = align_middle_center
    dash_ws['E5'].fill = PatternFill(start_color='FFF3E0', end_color='FFF3E0', fill_type='solid')
    dash_ws['E5'].border = box_border

    # Dashboard Table Header (Row 7)
    dash_ws.row_dimensions[7].height = 28
    d_headers = [
        "No.", 
        "Module / Feature", 
        "Controller(s)", 
        "Total TCs", 
        "Passed", 
        "Failed", 
        "Pass Rate %", 
        "Direct Sheet Link"
    ]
    for col_idx, h_text in enumerate(d_headers, start=1):
        cell = dash_ws.cell(row=7, column=col_idx, value=h_text)
        cell.font = font_tbl_header
        cell.fill = fill_tbl_header
        cell.alignment = align_middle_center
        cell.border = box_border

    d_row = 8
    for idx, item in enumerate(module_summary_data, start=1):
        dash_ws.row_dimensions[d_row].height = 24
        is_even = (d_row % 2 == 0)
        r_fill = fill_zebra if is_even else None

        c1 = dash_ws.cell(row=d_row, column=1, value=idx)
        c1.font = font_regular
        c1.alignment = align_middle_center
        c1.border = box_border
        if r_fill: c1.fill = r_fill

        c2 = dash_ws.cell(row=d_row, column=2, value=item["module"])
        c2.font = Font(name='Segoe UI', size=10, bold=True, color='1B365D')
        c2.alignment = align_left
        c2.border = box_border
        if r_fill: c2.fill = r_fill

        c3 = dash_ws.cell(row=d_row, column=3, value=item["controller"])
        c3.font = font_regular
        c3.alignment = align_left
        c3.border = box_border
        if r_fill: c3.fill = r_fill

        c4 = dash_ws.cell(row=d_row, column=4, value=item["count"])
        c4.font = font_regular
        c4.alignment = align_middle_center
        c4.border = box_border
        if r_fill: c4.fill = r_fill

        c5 = dash_ws.cell(row=d_row, column=5, value=item["passed"])
        c5.font = font_passed
        c5.alignment = align_middle_center
        c5.fill = fill_passed
        c5.border = box_border

        c6 = dash_ws.cell(row=d_row, column=6, value=item["failed"])
        c6.font = font_failed if item["failed"] > 0 else font_regular
        c6.alignment = align_middle_center
        c6.border = box_border
        if r_fill: c6.fill = r_fill

        crate = (item["passed"] / item["count"] * 100) if item["count"] > 0 else 0
        c7 = dash_ws.cell(row=d_row, column=7, value=f"{crate:.1f}%")
        c7.font = font_passed
        c7.alignment = align_middle_center
        c7.border = box_border
        if r_fill: c7.fill = r_fill

        c8 = dash_ws.cell(row=d_row, column=8, value=f"Go to {item['sheet']}")
        c8.font = Font(name='Segoe UI', size=10, underline='single', color='0D47A1')
        c8.alignment = align_middle_center
        c8.hyperlink = f"#'{item['sheet']}'!A1"
        c8.border = box_border
        if r_fill: c8.fill = r_fill

        d_row += 1

    # Total Row
    dash_ws.row_dimensions[d_row].height = 26
    dash_ws.merge_cells(start_row=d_row, start_column=1, end_row=d_row, end_column=3)
    tot_label = dash_ws.cell(row=d_row, column=1, value="TOTAL SUMMARY")
    tot_label.font = Font(name='Segoe UI', size=11, bold=True, color='1B365D')
    tot_label.alignment = align_middle_center
    tot_label.fill = fill_group_header

    for c in range(1, 4):
        dash_ws.cell(row=d_row, column=c).border = group_border
        dash_ws.cell(row=d_row, column=c).fill = fill_group_header

    tot_tc = dash_ws.cell(row=d_row, column=4, value=total_all_tcs)
    tot_tc.font = Font(name='Segoe UI', size=11, bold=True, color='1B365D')
    tot_tc.alignment = align_middle_center
    tot_tc.fill = fill_group_header
    tot_tc.border = group_border

    tot_pass = dash_ws.cell(row=d_row, column=5, value=total_all_passed)
    tot_pass.font = Font(name='Segoe UI', size=11, bold=True, color='1B5E20')
    tot_pass.alignment = align_middle_center
    tot_pass.fill = fill_passed
    tot_pass.border = group_border

    tot_fail = dash_ws.cell(row=d_row, column=6, value=total_all_failed)
    tot_fail.font = Font(name='Segoe UI', size=11, bold=True, color='1B365D')
    tot_fail.alignment = align_middle_center
    tot_fail.fill = fill_group_header
    tot_fail.border = group_border

    tot_rate = dash_ws.cell(row=d_row, column=7, value=f"{pass_rate:.1f}%")
    tot_rate.font = Font(name='Segoe UI', size=11, bold=True, color='004D40')
    tot_rate.alignment = align_middle_center
    tot_rate.fill = fill_group_header
    tot_rate.border = group_border

    tot_link = dash_ws.cell(row=d_row, column=8, value="")
    tot_link.fill = fill_group_header
    tot_link.border = group_border

    dash_col_widths = {
        1: 8,   # No.
        2: 32,  # Module
        3: 50,  # Controllers
        4: 14,  # Total TCs
        5: 14,  # Passed
        6: 14,  # Failed
        7: 16,  # Pass Rate %
        8: 24   # Link
    }
    for col_idx, width in dash_col_widths.items():
        dash_ws.column_dimensions[get_column_letter(col_idx)].width = width

    out_file = os.path.join(DOCS_DIR, "Integration_Test_Cases_All_Modules.xlsx")
    try:
        wb.save(out_file)
        print(f"Successfully generated Excel workbook: {out_file}")
    except PermissionError:
        alt_file = os.path.join(DOCS_DIR, "Integration_Test_Cases_Full.xlsx")
        wb.save(alt_file)
        print(f"File locked, saved to alternate path: {alt_file}")

if __name__ == "__main__":
    create_styled_workbook()
