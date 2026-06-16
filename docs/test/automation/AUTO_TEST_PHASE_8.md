# AUTO_TEST_PHASE_8.md — Phase 8 E2E Automation Report

## Summary

| Metric | Value |
|---|---|
| Total tests | 15 |
| Passed | 15 |
| Failed | 0 |
| Run time | ~49s |
| Projects | `admin` |
| Auth | `storageState` reuse (setup:admin) |

---

## Test Files

| File | Project | Tests | Route |
|---|---|---|---|
| `e2e/phase8/admin-leave-export-csv.spec.ts` | admin | 7 | `/admin/leaves` |
| `e2e/phase8/admin-settings-allowance-tab.spec.ts` | admin | 8 | `/admin/settings` |

---

## Bugs Found During Test Authoring

1 bug found: `firstInput.tripleClick()` — không tồn tại trong Playwright API. Fix: dùng `firstInput.fill(...)` trực tiếp (`.fill()` clear + type nên không cần select-all trước).

---

## Feature Coverage

### Leave Export CSV (`/admin/leaves`)

| Feature | Tests | Điều kiện |
|---|---|---|
| Page heading "Nghỉ phép" | ✓ | Always |
| Status filter có 4 options | ✓ | Always |
| "Xuất CSV" visible khi có dữ liệu | ✓ | Khi `filtered.length > 0` |
| "Xuất CSV" hidden khi filtered empty | ✓ | Khi filter sang status không có records |
| Table headers (8 columns) | ✓ | Khi có đơn nghỉ phép |
| Empty state "Không có đơn nghỉ phép" | ✓ | Khi filtered rỗng |
| Switching filter updates list | ✓ | Always |

### Settings Allowance Tab (`/admin/settings`)

| Feature | Tests | Điều kiện |
|---|---|---|
| "Phụ cấp" tab visible | ✓ | Always |
| Click tab → card title "Phụ cấp mặc định theo loại nhân viên" | ✓ | Always |
| 2 inputs: Toàn thời gian + Bán thời gian (type=number, step=10000) | ✓ | Always |
| "Lưu" disabled khi pristine | ✓ | Always |
| "Lưu" enabled sau khi thay đổi giá trị | ✓ | Always |
| Reference-only note text | ✓ | Always |

---

## Selector Patterns Used

| Pattern | Use case |
|---|---|
| `getByRole('combobox')` | Status filter dropdown — consistent với các spec khác |
| `getByRole('option')` | Options trong combobox — `options.last()` = "Từ chối" (rejected) |
| `getByRole('columnheader', { name: '...' })` | Table headers — strict mode safe |
| `locator('input[type="number"][step="10000"]')` | Allowance inputs — kết hợp type + step để tránh nhầm với số khác |
| `getByRole('tab', { name: 'Phụ cấp' })` | Settings tab trigger |
| `getByRole('heading', { name: 'Phụ cấp mặc định theo loại nhân viên' })` | CardTitle trong AllowanceTab |

---

## Known Limitations

- **"Xuất CSV" hidden test**: Chỉ verify được khi filter sang "Từ chối" và không có đơn bị từ chối. Nếu có dữ liệu ở mọi status → test skip gracefully.
- **Table headers test**: Skip khi không có leave request nào trong DB (empty state shown).
- **Allowance tab inputs**: Không test round-trip save để tránh thay đổi cấu hình production.
- **"Lưu" enabled test**: Thay đổi giá trị trong input rồi kiểm tra enabled — không submit để tránh mutation.

---

## Tổng kết toàn bộ phases

| Phase | Tests | Thời gian |
|---|---|---|
| Phase 3 | 70 | ~2.1 min |
| Phase 4 | 46 | ~1.5 min |
| Phase 5 | 24 | ~1.0 min |
| Phase 6 | 10 | ~0.6 min |
| Phase 7 | 16 | ~0.8 min |
| Phase 8 | 15 | ~0.8 min |
| **Tổng** | **181** | **~6.8 min** |
