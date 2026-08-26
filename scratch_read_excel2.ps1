$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('E:\Summer2026\SU26_SEP490_G67\docs\Report 5 - Integration Test.xlsx')
Write-Output "ALL SHEETS:"
foreach ($sheet in $wb.Sheets) {
    Write-Output ("Sheet Name: " + $sheet.Name + " | Rows: " + $sheet.UsedRange.Rows.Count)
}
$wb.Close($false)
$excel.Quit()
