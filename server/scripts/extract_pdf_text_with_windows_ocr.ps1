param(
  [Parameter(Mandatory = $true)]
  [string]$InputPdf,

  [Parameter(Mandatory = $true)]
  [string]$OutputTxt
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]

$script:AsyncActionMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq "AsTask" -and
    -not $_.IsGenericMethod -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.FullName -eq "Windows.Foundation.IAsyncAction"
  } |
  Select-Object -First 1

$script:AsyncOperationMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq "AsTask" -and
    $_.IsGenericMethod -and
    $_.GetGenericArguments().Count -eq 1 -and
    $_.GetParameters().Count -eq 1 -and
    $_.ToString().Contains("IAsyncOperation")
  } |
  Select-Object -First 1

function Wait-AsyncAction {
  param([Parameter(Mandatory = $true)][object]$Action)

  $task = $script:AsyncActionMethod.Invoke($null, @($Action))
  $task.Wait()
}

function Wait-AsyncOperation {
  param(
    [Parameter(Mandatory = $true)][object]$Operation,
    [Parameter(Mandatory = $true)][Type]$ResultType
  )

  $method = $script:AsyncOperationMethod.MakeGenericMethod($ResultType)
  $task = $method.Invoke($null, @($Operation))
  $task.Wait()
  return $task.Result
}

$storageFile = Wait-AsyncOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($InputPdf)) ([Windows.Storage.StorageFile])
$pdfDocument = Wait-AsyncOperation ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($storageFile)) ([Windows.Data.Pdf.PdfDocument])
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()

if (-not $ocrEngine) {
  throw "Windows OCR engine is unavailable."
}

$pageTexts = New-Object System.Collections.Generic.List[string]

for ($pageIndex = 0; $pageIndex -lt $pdfDocument.PageCount; $pageIndex++) {
  $page = $pdfDocument.GetPage($pageIndex)

  try {
    $renderStream = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
    try {
      $renderOptions = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
      $renderOptions.DestinationWidth = [uint32][Math]::Max(1800, [int]([Math]::Round($page.Size.Width * 3)))
      $renderOptions.DestinationHeight = [uint32][Math]::Max(2400, [int]([Math]::Round($page.Size.Height * 3)))

      Wait-AsyncAction ($page.RenderToStreamAsync($renderStream, $renderOptions))
      $renderStream.Seek(0)

      $decoder = Wait-AsyncOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($renderStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
      $softwareBitmap = Wait-AsyncOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
      $ocrBitmap = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert(
        $softwareBitmap,
        [Windows.Graphics.Imaging.BitmapPixelFormat]::Gray8
      )

      try {
        $ocrResult = Wait-AsyncOperation ($ocrEngine.RecognizeAsync($ocrBitmap)) ([Windows.Media.Ocr.OcrResult])
        $pageText = [string]($ocrResult.Text)
        if ($pageText -and $pageText.Trim()) {
          [void]$pageTexts.Add($pageText.Trim())
        }
      } finally {
        try { $ocrBitmap.Dispose() } catch {}
        try { $softwareBitmap.Dispose() } catch {}
      }
    } finally {
      try { $renderStream.Dispose() } catch {}
    }
  } finally {
    try { $page.Dispose() } catch {}
  }
}

[System.IO.File]::WriteAllText(
  $OutputTxt,
  (($pageTexts | Where-Object { $_ -and $_.Trim() }) -join "`r`n`r`n"),
  [System.Text.Encoding]::UTF8
)
