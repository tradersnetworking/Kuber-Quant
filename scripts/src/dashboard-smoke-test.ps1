# Dashboard API smoke test — login as each role and hit key endpoints
$base = "http://localhost:8080/api"
$roles = @(
  @{ name = "Investor"; email = "user@kuberquant.com"; password = "user123"; endpoints = @("/dashboard/summary", "/wallet", "/payments/deposit-accounts", "/investments", "/plans", "/notifications", "/kyc", "/referral/stats", "/trades", "/support/tickets") },
  @{ name = "Manager"; email = "manager@kuberquant.com"; password = "manager123"; endpoints = @("/manager/stats", "/manager/clients", "/manager/kyc", "/manager/transactions", "/manager/tickets") },
  @{ name = "Admin"; email = "admin@kuberquant.com"; password = "admin123"; endpoints = @("/admin/stats", "/admin/users", "/admin/kyc", "/admin/transactions", "/admin/plans", "/admin/tickets", "/admin/referral-stats", "/admin/managers") },
  @{ name = "Super Admin"; email = "superadmin@kuberquant.com"; password = "superadmin123"; endpoints = @("/super-admin/stats", "/super-admin/overview", "/super-admin/users", "/super-admin/mt5-requests", "/super-admin/ea-subscriptions", "/payments/deposit-accounts") },
  @{ name = "Support"; email = "support@kuberquant.com"; password = "support123"; endpoints = @("/support-team/stats", "/support-team/tickets") }
)

function Login($email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  try {
    $res = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 15
    return $res.token
  } catch {
    return $null
  }
}

function Test-Endpoint($token, $path) {
  try {
    $headers = @{ Authorization = "Bearer $token" }
    Invoke-RestMethod -Uri "$base$path" -Headers $headers -TimeoutSec 15 | Out-Null
    return "OK"
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) { return "FAIL $code" }
    return "FAIL"
  }
}

Write-Output "=== Kuber Dashboard API Smoke Test ==="
Write-Output ""

$allOk = $true
foreach ($role in $roles) {
  Write-Output "--- $($role.name) ---"
  $token = Login $role.email $role.password
  if (-not $token) {
    Write-Output "  LOGIN: FAIL"
    $allOk = $false
    continue
  }
  Write-Output "  LOGIN: OK"
  foreach ($ep in $role.endpoints) {
    $status = Test-Endpoint $token $ep
    Write-Output "  $ep : $status"
    if ($status -ne "OK") { $allOk = $false }
  }
  Write-Output ""
}

if ($allOk) {
  Write-Output "RESULT: ALL PASSED"
  exit 0
} else {
  Write-Output "RESULT: SOME FAILURES"
  exit 1
}
