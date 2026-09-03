Add-Type -AssemblyName System.Drawing

function Generate-HanjiturIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # White background
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, 0, 0, $size, $size)
    
    # Safe zone: centered, size around 58% of canvas
    $heartWidth = $size * 0.58
    $heartHeight = $size * 0.54
    $startX = ($size - $heartWidth) / 2
    $startY = ($size - $heartHeight) / 2 - ($size * 0.02)
    
    $penWidth = [Math]::Max(3.0, $size * 0.055)
    $greenColor = [System.Drawing.Color]::FromArgb(255, 82, 128, 105) # #528069
    $pen = New-Object System.Drawing.Pen($greenColor, $penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    
    # Heart Bézier Path
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    $topMidX = $startX + ($heartWidth / 2)
    $topMidY = $startY + ($heartHeight * 0.3)
    $bottomX = $startX + ($heartWidth / 2)
    $bottomY = $startY + $heartHeight
    
    $leftX = $startX
    $rightX = $startX + $heartWidth
    
    # Left lobe
    $path.AddBezier(
        [float]$topMidX, [float]$topMidY,
        [float]($topMidX - ($heartWidth * 0.28)), [float]($startY - ($heartHeight * 0.12)),
        [float]$leftX, [float]($startY + ($heartHeight * 0.2)),
        [float]$leftX, [float]($startY + ($heartHeight * 0.46))
    )
    $path.AddBezier(
        [float]$leftX, [float]($startY + ($heartHeight * 0.46)),
        [float]$leftX, [float]($startY + ($heartHeight * 0.72)),
        [float]($topMidX - ($heartWidth * 0.25)), [float]($bottomY - ($heartHeight * 0.15)),
        [float]$bottomX, [float]$bottomY
    )
    
    # Right lobe
    $path.AddBezier(
        [float]$bottomX, [float]$bottomY,
        [float]($topMidX + ($heartWidth * 0.25)), [float]($bottomY - ($heartHeight * 0.15)),
        [float]$rightX, [float]($startY + ($heartHeight * 0.72)),
        [float]$rightX, [float]($startY + ($heartHeight * 0.46))
    )
    $path.AddBezier(
        [float]$rightX, [float]($startY + ($heartHeight * 0.46)),
        [float]$rightX, [float]($startY + ($heartHeight * 0.2)),
        [float]($topMidX + ($heartWidth * 0.28)), [float]($startY - ($heartHeight * 0.12)),
        [float]$topMidX, [float]$topMidY
    )
    
    $path.CloseFigure()
    $g.DrawPath($pen, $path)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated $outputPath ($size x $size)"
}

$baseDir = "C:\Users\finan\.gemini\antigravity\scratch\hanjitur-organizer"
Generate-HanjiturIcon 512 "$baseDir\icon-512.png"
Generate-HanjiturIcon 192 "$baseDir\icon-192.png"
Generate-HanjiturIcon 180 "$baseDir\apple-touch-icon.png"
