# 活動ダッシュボードを更新して GitHub に送る(タスクスケジューラから3時間ごとに実行)
$ErrorActionPreference = 'Stop'
Set-Location 'P:\09_Claude Code\プロジェクト\活動ダッシュボード'
# P: (pCloud) は所有者を記録しないため、このスクリプトの中だけでフォルダを許可する
$env:GIT_CONFIG_COUNT = '1'; $env:GIT_CONFIG_KEY_0 = 'safe.directory'; $env:GIT_CONFIG_VALUE_0 = 'P:/09_Claude Code/プロジェクト/活動ダッシュボード'
$env:GH_TOKEN = (& 'C:\Program Files\GitHub CLI\gh.exe' auth token)
& 'C:\Program Files\nodejs\node.exe' scripts/update.mjs
& 'C:\Program Files\Git\cmd\git.exe' add data/latest.json
& 'C:\Program Files\Git\cmd\git.exe' diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  & 'C:\Program Files\Git\cmd\git.exe' -c user.name=oyusuke0603 -c user.email=o.yusuke0603@gmail.com commit -q -m 'auto: update dashboard data'
  & 'C:\Program Files\Git\cmd\git.exe' pull --rebase -q
  & 'C:\Program Files\Git\cmd\git.exe' push -q
}


