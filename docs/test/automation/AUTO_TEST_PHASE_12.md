# AUTO_TEST_PHASE_12.md — Phase 12 E2E Automation Report

## Summary

| Metric | Value |
|---|---|
| Total tests | 19 |
| Passed | 19 |
| Failed | 0 |
| Run time | ~1.1 min |
| Projects | `admin` |
| Auth | `storageState` reuse (setup:admin) |

---

## Test Files

| File | Project | Tests | Route |
|---|---|---|---|
| `e2e/phase12/admin-branch-list.spec.ts` | admin | 11 | `/admin/branches` |
| `e2e/phase12/admin-branch-switcher-sidebar.spec.ts` | admin | 8 | `/admin` |

---

## Bugs Found During Test Authoring

1 bug found: `getByText('Tên chi nhánh')` — strict mode violation vì match cả `<th>Tên chi nhánh</th>` trong table header lẫn `<label>Tên chi nhánh *</label>` trong dialog (cả 2 visible cùng lúc sau khi mở dialog). Fix: scope vào `page.getByRole('dialog').getByText(/Tên chi nhánh/)`.

---

## Feature Coverage

### BranchListPage (`/admin/branches`)

| Feature | Tests | Điều kiện |
|---|---|---|
| Heading "Quản lý chi nhánh" + description | ✓ | Always |
| Table headers: Tên chi nhánh, Địa chỉ, SĐT, Trạng thái, Thao tác | ✓ | Khi có branches |
| "Đang xem" badge trên chi nhánh đang active | ✓ | Khi có branches |
| "Hoạt động" status badge | ✓ | Khi có active branch |
| "Ngưng" hoặc "Kích hoạt" toggle button | ✓ | Khi có branches |
| "Thêm chi nhánh" button | ✓ | Always |
| Dialog "Thêm chi nhánh mới" opens | ✓ | Always |
| Dialog có 3 inputs (Tên, Địa chỉ, SĐT) | ✓ | Always |
| "Tạo chi nhánh" disabled khi tên trống | ✓ | Always |
| "Tạo chi nhánh" enabled sau khi nhập tên | ✓ | Always |
| "Hủy" đóng dialog | ✓ | Always |

### BranchSwitcher + Sidebar (`/admin`)

| Feature | Tests | Điều kiện |
|---|---|---|
| BranchSelectOverlay KHÔNG hiện sau session restore | ✓ | Always (activeBranchId persisted) |
| BranchSwitcher button visible trong topbar | ✓ | super_admin only |
| BranchSwitcher button hiển thị tên chi nhánh active | ✓ | Sau khi setup chọn branch |
| Click BranchSwitcher → dropdown "Chuyển chi nhánh" | ✓ | Always |
| Dropdown có ít nhất 1 branch option | ✓ | Always |
| "Chi nhánh" sidebar link visible | ✓ | super_admin only |
| "Chi nhánh" link → navigate `/admin/branches` | ✓ | Always |

---

## Selector Patterns Used

| Pattern | Use case |
|---|---|
| `page.getByRole('dialog').getByText(/Tên chi nhánh/)` | Scope label vào dialog để tránh match table header |
| `page.locator('header').locator('button[class*="outline"]').first()` | BranchSwitcher — outline button góc trái header |
| `page.getByRole('menuitem')` | DropdownMenuItem options trong BranchSwitcher |
| `page.locator('div.fixed.inset-0').filter({ hasText: 'Chọn chi nhánh' })` | BranchSelectOverlay detection (reuse pattern từ auth setup) |
| `page.getByRole('link', { name: 'Chi nhánh' })` | Sidebar NavLink — renders as `<a>` |

---

## Known Limitations

- **BranchSwitcher check mark test**: Không assert check mark icon trực tiếp vì SVG không có accessible name. Chỉ verify dropdown mở và có branch items.
- **"Chọn" button test**: Không test click "Chọn" để switch branch vì cần kiểm soát có ≥ 2 branches; chỉ verify toggle buttons visible.
- **"Ngưng" / "Kích hoạt" round-trip**: Không test mutation để tránh thay đổi trạng thái production.
- **"Tạo chi nhánh" round-trip**: Không submit form để tránh tạo branch test trong DB production.
- **Data isolation test**: Cần ≥ 2 branches với nhân viên riêng biệt — không thể assert via E2E mà không kiểm soát data.

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
| Phase 9 | 12 | ~0.6 min |
| Phase 12 | 19 | ~1.1 min |
| **Tổng** | **212** | **~8.5 min** |
