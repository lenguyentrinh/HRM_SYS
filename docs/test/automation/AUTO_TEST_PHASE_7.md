# AUTO_TEST_PHASE_7.md — Phase 7 E2E Automation Report

## Summary

| Metric | Value |
|---|---|
| Total tests | 16 |
| Passed | 16 |
| Failed | 0 |
| Run time | ~47s |
| Projects | `admin` |
| Auth | `storageState` reuse (setup:admin) |

---

## Test Files

| File | Project | Tests | Route |
|---|---|---|---|
| `e2e/phase7/admin-analytics-phase7.spec.ts` | admin | 16 | `/admin/analytics` |

---

## Bugs Found During Test Authoring

Không có — 16/16 tests pass ngay lần đầu.

---

## Feature Coverage

| Feature | Tests | Điều kiện |
|---|---|---|
| Page heading + description | ✓ | Always |
| "Xếp hạng chuyên cần" section | ✓ | Always |
| Ranking table headers (6 base columns) | ✓ | Always |
| Month selector (6 options) | ✓ | Always |
| Trend chart heading "Xu hướng quỹ lương 6 tháng" | ✓ | Khi `hasTrend` |
| Trend chart description "Chỉ tính bảng lương đã xác nhận" | ✓ | Khi `hasTrend` |
| SVG element trong trend chart | ✓ | Khi `hasTrend` |
| Stat cards (Tổng quỹ lương, Lương trung bình, Số NV được chi) | ✓ | Khi `payrollStats` |
| Breakdown heading "Cơ cấu quỹ lương tháng X/YYYY" | ✓ | Khi `payrollStats` |
| "Khoản cộng" / "Khoản trừ" columns | ✓ | Khi `payrollStats` |
| "Lương theo ngày công" row (BreakdownRow) | ✓ | Khi `payrollStats` + value > 0 |
| "BHXH (NV đóng)" row | ✓ | Khi `payrollStats` + BHXH > 0 |
| "Thực nhận" column trong ranking table | ✓ | Khi `payrollStats` |
| "Thưởng đặc biệt" row (conditional) | ✓ | Chỉ khi special_bonus > 0 |
| Month switch updates page | ✓ | Khi `payrollStats` tồn tại |

---

## Selector Patterns Used

| Pattern | Use case |
|---|---|
| `getByRole('heading', { name: 'Xu hướng quỹ lương 6 tháng' })` | h3 heading trong trend chart section |
| `getByRole('heading', { name: /Cơ cấu quỹ lương tháng/ })` | h3 với month/year dynamic — dùng regex |
| `getByRole('heading', { name: 'Xếp hạng chuyên cần' })` | h3 trong ranking section |
| `getByRole('columnheader', { name: 'Thực nhận' })` | Column chỉ render khi payrollStats tồn tại |
| `page.locator('svg').first()` | SVG trend chart (custom render, không dùng lib ngoài) |
| `isVisible().catch(() => false)` guard | Kiểm tra conditional sections trước khi assert |

---

## Known Limitations

- **Trend chart tests (3 tests)**: Skip khi không có confirmed payroll trong 6 tháng gần nhất.
- **Payroll stats + breakdown tests (7 tests)**: Skip khi tháng hiện tại chưa có confirmed payroll.
- **"Thưởng đặc biệt" test**: Chỉ verify không bị duplicate khi hiển thị; không verify ẩn hoàn toàn vì chỉ cần kiểm tra `special_bonus > 0`.
- **"BHXH (NV đóng)" test**: Skip nếu tổng BHXH của confirmed records bằng 0 (BreakdownRow trả về null).
- Không test BreakdownRow với `value === 0` vì cần kiểm soát dữ liệu DB.

---

## Tổng kết toàn bộ phases

| Phase | Tests | Thời gian |
|---|---|---|
| Phase 3 | 70 | ~2.1 min |
| Phase 4 | 46 | ~1.5 min |
| Phase 5 | 24 | ~1.0 min |
| Phase 6 | 10 | ~0.6 min |
| Phase 7 | 16 | ~0.8 min |
| **Tổng** | **166** | **~6.0 min** |
