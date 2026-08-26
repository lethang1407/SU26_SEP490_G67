$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open('E:\Summer2026\SU26_SEP490_G67\docs\Report 5 - Integration Test.xlsx')

$sheetsToDump = @("Authentication", "Product Management")

foreach ($sheetName in $sheetsToDump) {
    $sheet = $wb.Sheets.Item($sheetName)
    if ($sheet) {
        Write-Output ("=================== SHEET: " + $sheetName + " ===================")
        $maxR = $sheet.UsedRange.Rows.Count
        $maxC = $sheet.UsedRange.Columns.Count
        for ($r = 1; $r -le $maxR; $r++) {
            $rowVal = @()
            for ($c = 1; $c -le $maxC; $c++) {
                $rowVal += $sheet.Cells.Item($r, $c).Text
            }
            $line = ($rowVal -join " | ").TrimEnd(" |")
            if ($line.Trim() -ne "") {
                Write-Output ($r.ToString() + ": " + $line)
            }
        }
    }
}
$wb.Close($false)
$excel.Quit()
