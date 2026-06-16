# AUTO_TEST_PHASE_6.md — Phase 6 E2E Automation Report

## Summary

| Metric | Value |
|---|---|
| Total tests | 10 |
| Passed | 10 |
| Failed | 0 |
| Run time | ~34s |
| Projects | `admin` |
| Auth | `storageState` reuse (setup:admin) |

---

## Test Files

| File | Project | Tests | Route |
|---|---|---|---|
| `e2e/phase6/admin-employee-ot-multiplier.spec.ts` | admin | 10 | `/admin/employees/:id` (tab Lương & phụ cấp) |

---

## Bugs Found During Test Authoring

Không có — tất cả 10 tests pass ngay lần đầu.

---

## Feature Coverage

| QC Checklist item | Test | Notes |
|---|---|---|
| Tab "Lương & phụ cấp" → card "Hệ số OT ngày thường" | ✓ | Test 2 |
| Nhân viên chưa set → "Dùng mặc định hệ thống" | ✓ | Test 3 (graceful: also accepts override state) |
| Click "Chỉnh sửa" → input xuất hiện | ✓ | Tests 4, 5 |
| Input attributes: number, min=1.0, max=5.0, step=0.1 | ✓ | Test 4 |
| "Lưu" và "Hủy" buttons khi edit | ✓ | Tests 5, 7 |
| "Hủy" → input ẩn, "Chỉnh sửa" tái xuất | ✓ | Test 6 |
| "Lưu" enabled khi không pending | ✓ | Test 7 |
| Có override → "Xóa override" hiển thị | ✓ | Test 8 (skips if no override set) |
| Tab còn hiển thị lương cơ bản / phụ cấp | ✓ | Test 9 |
| Input < 1.0 → validation reject | — | Handler returns silently — không có UI feedback để assert |
| Lưu 1.8x → card hiển thị "1.8x (riêng nhân viên này)" | — | Cần write operation — tránh mutate data trong test môi trường |
| "Xóa override" → về "Dùng mặc định hệ thống" | — | Cần write operation |

---

## Selector Patterns

| Pattern | Use case |
|---|---|
| `getByRole('heading', { name: 'Hệ số OT ngày thường' })` | CardTitle h3 — unique trong tab salary |
| `locator('input[type="number"][placeholder="VD: 1.8"]')` | OT input — kết hợp type + placeholder để tránh nhầm với các number input khác |
| `getByText(/riêng nhân viên này/)` | Detect override-set state — text partial match |
| `getByText('Xóa override')` | Link/button xóa override — exact text |

---

## Known Limitations

- Tất cả 10 tests skip gracefully nếu không có employee nào trong DB.
- Tests 4–8 (edit mode tests) skip thêm nếu employee đang ở trạng thái override đã set (button "Chỉnh sửa" bị ẩn — thay bằng value display).
- Không test round-trip save/delete để tránh mutate dữ liệu production.
- Validation `value < 1.0` không có UI feedback → không thể assert qua E2E.

---

## Tổng kết toàn bộ phases

| Phase | Tests | Thời gian |
|---|---|---|
| Phase 3 | 70 | ~2.1 min |
| Phase 4 | 46 | ~1.5 min |
| Phase 5 | 24 | ~1.0 min |
| Phase 6 | 10 | ~0.6 min |
| **Tổng** | **150** | **~5.2 min** |
