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
# It never stops by itself without saying so (05.10.2026):
# - a click into the window does not pause it (QuickEdit of the Windows console is switched off for this window);
# - the title of the window shows the time of the last round and the version in Local, so a living sync is seen;
# - a theme file that cannot be copied is reported instead of waiting for it without end (robocopy /R:2 /W:1);
# - a file changed by hand in this folder does not block the pull (rebase --autostash);
# - when a pull brings a new version of this script, it starts the new version in a new window and closes.
$repo    = Split-Path -Parent $PSScriptRoot
$branch  = 'claude/jos-barbershop-logo-xgtbba'
$src     = Join-Path $repo 'theme\jos-barbershop'
$site    = 'C:\Users\User\Local Sites\jos-barbershop'
$uploads = @('reference', 'images', 'hairs')
$who     = @('-c', 'user.name=Kresho', '-c', 'user.email=kresho@iks.haus')
$self    = $PSCommandPath
$selfHash = (Get-FileHash -LiteralPath $self).Hash

function Stamp { Get-Date -Format 'HH:mm:ss' }

# QuickEdit off: in the Windows console a click into the window starts selecting text, and while text is
# selected every script in it waits (until Enter or Esc), so the sync would stop without a word
try {
    Add-Type -Namespace JosSync -Name Console -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
'@
    $stdin = [JosSync.Console]::GetStdHandle(-10)
    $mode = [uint32]0
    if ([JosSync.Console]::GetConsoleMode($stdin, [ref]$mode)) {
        # ENABLE_EXTENDED_FLAGS (0x80) on, ENABLE_QUICK_EDIT_MODE (0x40) off
        $newMode = [uint32](([int64]$mode -bor 0x80) -band 0xFFFFFFBF)
        [void][JosSync.Console]::SetConsoleMode($stdin, $newMode)
    }
} catch {
    # another kind of window (Windows Terminal): there a click does not pause the script anyway
}

# LocalWP site of Jo's Barbershop (localhost:10098)
if (-not (Test-Path -LiteralPath $site -PathType Container)) {
    Write-Host ('{0}  Local stranica {1} ne postoji. Posalji Claudeu ovaj ispis.' -f (Stamp), $site)
    exit 1
}
$dst = Join-Path $site 'app\public\wp-content\themes\jos-barbershop'

git -C $repo fetch --quiet origin
git -C $repo checkout --quiet $branch
$last = ''
$inLocal = '-'
$pendingBefore = ''
$fetchWarned = [datetime]::MinValue
$env:GIT_TERMINAL_PROMPT = '0'   # git never waits for a typed password: it fails, and the failure is reported
Write-Host ('{0}  Sinkronizacija radi. Ostavi ovaj prozor otvoren.' -f (Stamp))
while ($true) {
    $Host.UI.RawUI.WindowTitle = ('Jo''s sync  {0}  Local: {1}' -f (Stamp), $inLocal)

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
        $rebaseOut = git -C $repo @who rebase --quiet --autostash "origin/$branch" 2>&1
        if ($LASTEXITCODE -ne 0) {
            git -C $repo rebase --abort 2>$null
            Write-Host ('{0}  Git nije mogao povuci izmjene. Posalji Claudeu ovaj ispis:' -f (Stamp))
            Write-Host ($rebaseOut | Out-String)
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
                robocopy $src $dst /E /R:2 /W:1 /XD node_modules /XF package.json package-lock.json /NFL /NDL /NJH /NJS /NP | Out-Null
                # robocopy: 0 to 7 is done, 8 and more is a file that could not be copied
                if ($LASTEXITCODE -ge 8) {
                    Write-Host ('{0}  Neki fajl teme nije kopiran u Local (zakljucan?). Sljedeci krug pokusava ponovno.' -f (Stamp))
                    Start-Sleep -Seconds 5
                    continue
                }
                $inLocal = $remote.Substring(0, 7)
                Write-Host ('{0}  Local azuriran ({1}). Otvorena stranica se sama osvjezi.' -f (Stamp), $inLocal)
            } else {
                Write-Host ('{0}  Povuceno ({1}). Tema jos ne postoji, Local ostaje kakav je.' -f (Stamp), $remote.Substring(0, 7))
            }
        }
        $last = git -C $repo rev-parse "origin/$branch"

        # a new version of this script came with the pull: it takes over in a new window
        if ((Get-FileHash -LiteralPath $self).Hash -ne $selfHash) {
            Write-Host ('{0}  Nova verzija sinkronizacije, pokrecem je u novom prozoru.' -f (Stamp))
            Start-Process powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $self))
            exit
        }
    }
    Start-Sleep -Seconds 5
}
