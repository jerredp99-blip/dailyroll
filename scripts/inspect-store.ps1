$raw = [System.IO.File]::ReadAllText('C:\Users\jobin\bonus-tracker\lib\store.ts')
$after = $raw.IndexOf('bonusUrl?: string;') + 'bonusUrl?: string;'.Length
$snippet = if ($after -ge 0) { $raw.Substring($after, [Math]::Min(260, $raw.Length - $after)) } else { 'NOT_FOUND' }
Write-Output 'after-bonusUrl-start=' + $after
Write-Output $snippet
