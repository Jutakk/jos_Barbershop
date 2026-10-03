# Jo's Barbershop: keeps this computer, GitHub and LocalWP in step with the Claude cloud session
# (Kresho, 03.10.2026), same as tools\zkf-sync.ps1 in Zum kleinen Feinen. Every 5 seconds:
# 1. New files dropped into reference\, images\ or hairs\ in D:\CLAUDE_CODE\jos-barbershop are committed once
#    they have stopped changing for one round (a copy still running waits) and pushed to GitHub, where Claude
#    picks them up.
# 2. New commits from Claude are pulled (rebase: own upload commits stay on top) and the theme is copied
#    into LocalWP (copy only, nothing there is deleted).
# Start: powershell -ExecutionPolicy Bypass -File "D:\CLAUDE_CODE\jos-barbershop\tools\jos-sync.ps1"
# Leave the window open while we work; Ctrl+C or closing the window stops it.
$repo    = 'D:\CLAUDE_CODE\jos-barbershop'
$branch  = 'claude/jos-barbershop-logo-xgtbba'
$src     = Join-Path $repo 'theme\jos-barbershop'
$sites   = 'C:\Users\User\Local Sites'
$uploads = @('reference', 'images', 'hairs')
$who     = @('-c', 'user.name=Kresho', '-c', 'user.email=kresho@iks.haus')

function Stamp { Get-Date -Format 'HH:mm:ss' }

# LocalWP site folder of Jo's Barbershop: the one Local Sites folder whose name contains "barber"
$site = @(Get-ChildItem -LiteralPath $sites -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'barber' })
if ($site.Count -ne 1) {
    Write-Host ('{0}  U {1} nisam nasao tocno jednu mapu s "barber" u imenu. Posalji Claudeu ovaj ispis:' -f (Stamp), $sites)
    Get-ChildItem -LiteralPath $sites -Directory -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ('    ' + $_.Name) }
    exit 1
}
$dst = Join-Path $site[0].FullName 'app\public\wp-content\themes\jos-barbershop'

git -C $repo fetch --quiet origin
git -C $repo checkout --quiet $branch
$last = ''
$pendingBefore = ''
Write-Host ('{0}  Sinkronizacija radi ({1}). Ostavi ovaj prozor otvoren.' -f (Stamp), $site[0].Name)
while ($true) {
    git -C $repo fetch --quiet origin $branch 2>$null
    $current = git -C $repo branch --show-current
    if ($current -ne $branch) {
        Write-Host ('{0}  D:\ nije na grani {1} (nego {2}). Sinkronizacija ceka.' -f (Stamp), $branch, $current)
        Start-Sleep -Seconds 5
        continue
    }

    # new or changed files in the upload folders: path and size of each; committed when the list is the same two rounds running
    $pending = (git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all -- $uploads | ForEach-Object {
        $file = Join-Path $repo ($_.Substring(3).Trim('"'))
        if (Test-Path -LiteralPath $file -PathType Leaf) { $_ + ' ' + (Get-Item -LiteralPath $file).Length } else { $_ }
    }) -join '|'
    if ($pending -and $pending -eq $pendingBefore) {
        git -C $repo add -- $uploads
        git -C $repo @who commit --quiet -m ('New files ' + (Get-Date -Format 'dd.MM.yyyy HH:mm'))
        $pending = ''
    }
    $pendingBefore = $pending

    $remote = git -C $repo rev-parse "origin/$branch"
    $ahead = [int](git -C $repo rev-list --count "origin/$branch..HEAD")
    if ($remote -ne $last -or $ahead -gt 0) {
        git -C $repo @who rebase --quiet "origin/$branch"
        if ($LASTEXITCODE -ne 0) {
            git -C $repo rebase --abort 2>$null
            Write-Host ('{0}  Git nije mogao povuci izmjene. Posalji Claudeu ovaj ispis.' -f (Stamp))
            Start-Sleep -Seconds 5
            continue
        }
        if ([int](git -C $repo rev-list --count "origin/$branch..HEAD") -gt 0) {
            git -C $repo push --quiet origin $branch
            if ($LASTEXITCODE -eq 0) {
                Write-Host ('{0}  Novi fajlovi poslani na GitHub. Claude ih sada vidi.' -f (Stamp))
            } else {
                Write-Host ('{0}  Push nije prosao. Posalji Claudeu ovaj ispis.' -f (Stamp))
            }
        }
        if ($remote -ne $last) {
            if (Test-Path -LiteralPath $src -PathType Container) {
                robocopy $src $dst /E /XD node_modules /XF package.json package-lock.json /NFL /NDL /NJH /NJS /NP | Out-Null
                Write-Host ('{0}  Local azuriran ({1}). Pritisni Ctrl+F5 u Chromeu.' -f (Stamp), $remote.Substring(0, 7))
            } else {
                Write-Host ('{0}  Povuceno ({1}). Tema jos ne postoji, Local ostaje kakav je.' -f (Stamp), $remote.Substring(0, 7))
            }
        }
        $last = git -C $repo rev-parse "origin/$branch"
    }
    Start-Sleep -Seconds 5
}
