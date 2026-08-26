$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('E:\Summer2026\SU26_SEP490_G67\docs\Report 5 - Integration Test.xlsx')
foreach ($sheet in $wb.Sheets) {
    Write-Output ("SHEET: " + $sheet.Name)
    $maxR = [Math]::Min(15, $sheet.UsedRange.Rows.Count)
    $maxC = [Math]::Min(15, $sheet.UsedRange.Columns.Count)
    for ($r = 1; $r -le $maxR; $r++) {
        $rowVal = @()
        for ($c = 1; $c -le $maxC; $c++) {
            $rowVal += $sheet.Cells.Item($r, $c).Text
        }
        Write-Output ($rowVal -join " | ")
    }
    Write-Output "=========================================="
}
$wb.Close($false)
$excel.Quit()
