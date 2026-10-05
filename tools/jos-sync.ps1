# Jo's Barbershop: keeps this computer, GitHub and LocalWP in step with the Claude cloud session
# (Kresho, 03.10.2026), same as tools\zkf-sync.ps1 in Zum kleinen Feinen. Every 5 seconds:
# 1. New files dropped into reference\, images\ or hairs\ of this folder are committed once
#    they have stopped changing for one round (a copy still running waits) and pushed to GitHub, where Claude
#    picks them up.
# 2. New commits from Claude are pulled (rebase: own upload commits stay on top) and the theme is copied
#    into LocalWP (copy only, nothing there is deleted).
# Start: powershell -ExecutionPolicy Bypass -File "D:\CLAUDE_CODE\JoS_BARBER\jos-barbershop\tools\jos-sync.ps1"
# The folder of the project is the one this script lies in (its tools\ folder), so it can be moved anywhere.
# Leave the window open while we work; Ctrl+C or closing the window stops it.
$repo    = Split-Path -Parent $PSScriptRoot
$branch  = 'claude/jos-barbershop-logo-xgtbba'
$src     = Join-Path $repo 'theme\jos-barbershop'
$site    = 'C:\Users\User\Local Sites\jos-barbershop'
$uploads = @('reference', 'images', 'hairs')
$who     = @('-c', 'user.name=Kresho', '-c', 'user.email=kresho@iks.haus')

function Stamp { Get-Date -Format 'HH:mm:ss' }

# LocalWP site of Jo's Barbershop (localhost:10098)
if (-not (Test-Path -LiteralPath $site -PathType Container)) {
    Write-Host ('{0}  Local stranica {1} ne postoji. Posalji Claudeu ovaj ispis.' -f (Stamp), $site)
    exit 1
}
$dst = Join-Path $site 'app\public\wp-content\themes\jos-barbershop'

git -C $repo fetch --quiet origin
git -C $repo checkout --quiet $branch
$last = ''
$pendingBefore = ''
$fetchWarned = [datetime]::MinValue
$env:GIT_TERMINAL_PROMPT = '0'   # git never waits for a typed password: it fails, and the failure is reported
Write-Host ('{0}  Sinkronizacija radi. Ostavi ovaj prozor otvoren.' -f (Stamp))
while ($true) {
    # a failed fetch is reported (once a minute), so a sync that cannot reach GitHub never looks like a quiet one
    $fetchOut = git -C $repo fetch --quiet origin $branch 2>&1
    if ($LASTEXITCODE -ne 0) {
        if (((Get-Date) - $fetchWarned).TotalSeconds -ge 60) {
            Write-Host ('{0}  GitHub se ne javlja, nove izmjene ne stizu. Posalji Claudeu ovaj ispis:' -f (Stamp))
            Write-Host ($fetchOut | Out-String)
            $fetchWarned = Get-Date
        }
        Start-Sleep -Seconds 5
        continue
    }
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
                Write-Host ('{0}  Local azuriran ({1}). Otvorena stranica se sama osvjezi.' -f (Stamp), $remote.Substring(0, 7))
            } else {
                Write-Host ('{0}  Povuceno ({1}). Tema jos ne postoji, Local ostaje kakav je.' -f (Stamp), $remote.Substring(0, 7))
            }
        }
        $last = git -C $repo rev-parse "origin/$branch"
    }
    Start-Sleep -Seconds 5
}
