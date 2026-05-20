# Ke Hoach Auto Update Desktop App

## 1. Muc Tieu

Khi co version moi, ung dung desktop phai tu kiem tra, tai ban cap nhat, thong bao cho nguoi dung dong app de cai dat, sau do tu mo lai app khi cap nhat xong.

## 2. Trang Thai Hien Tai

Du an da co san:

- `electron-updater` trong dependency goc.
- Cau hinh `build.publish` dung GitHub provider trong `package.json`.
- Electron main process.
- Preload bridge.
- React component `UpdateBanner`.

Da bo sung trong code:

- Electron main process lang nghe `update-available`, `download-progress`, `update-downloaded`, `error`.
- App chi kiem tra update khi chay ban packaged.
- Update duoc tai tu dong nhung khong cai dat cho den khi nguoi dung bam nut cap nhat.
- Renderer dung `window.electronAPI` dung voi preload.
- Nut `Tat app va cap nhat` goi `autoUpdater.quitAndInstall(false, true)` de cai va mo lai app.

## 3. Luong Nguoi Dung

1. Nguoi dung mo app desktop.
2. App packaged tu goi kiem tra update.
3. Neu co version moi, banner hien "Co ban cap nhat moi".
4. App tai update tu dong va hien tien do.
5. Khi tai xong, banner hien nut "Tat app va cap nhat".
6. Nguoi dung bam nut.
7. App dong, cai update, sau do tu mo lai.

## 4. Quy Uoc Version

- Version phai tang trong `package.json`.
- Nen dung semantic version:
- Patch: sua loi nho, vi du `1.4.3` -> `1.4.4`.
- Minor: them tinh nang tuong thich, vi du `1.4.3` -> `1.5.0`.
- Major: thay doi lon, co nguy co anh huong du lieu/quy trinh, vi du `1.4.3` -> `2.0.0`.

## 5. Quy Trinh Release

1. Dam bao worktree sach hoac chi co thay doi can release.
2. Chay `npm --prefix client run build`.
3. Chay local server/client va test nghiep vu.
4. Tang version trong `package.json`.
5. Chay `npm run desktop:pack`.
6. Tao GitHub Release trung version, vi du tag `v1.4.4`.
7. Upload file cai dat va metadata do electron-builder tao trong thu muc `release`.
8. Mo ban app version cu de xac nhan update banner xuat hien.
9. Bam "Tat app va cap nhat" va kiem tra app mo lai dung version moi.

## 5.1. Lenh Test/Pack Cho Version 1.5.0

- Chay test truoc release: `npm run test:release`
- Dong goi desktop: `npm run desktop:pack`
- Artifact du kien nam trong thu muc `release`
- Tag release du kien: `v1.5.0`

## 6. Dieu Kien De Auto Update Hoat Dong

- App phai la ban da dong goi, khong phai Vite dev browser.
- GitHub Release phai public hoac may nguoi dung phai co quyen truy cap neu repo private.
- Artifact release phai dung voi cau hinh `electron-builder`.
- `package.json` phai co `build.publish` dung owner/repo.
- Version moi phai cao hon version dang cai.

## 7. Checklist Test Truoc Release

- Cham cong Full/Half roi doi sang Nghi/Phep/Le, thong tin cong viec cu bi reset.
- Them/sua cong nhan.
- Xuat Excel tong hop thang.
- Xuat Excel/Word theo cong nhan.
- Backup va restore.
- Build client production thanh cong.
- Dong goi desktop thanh cong.
- Update tu ban cu sang ban moi thanh cong tren may test.

## 8. Rui Ro Va Bien Phap

- Neu release thieu metadata, app se khong thay update: can upload dung toan bo artifact do electron-builder sinh ra.
- Neu repo private, may nguoi dung co the khong tai duoc update: can cau hinh kenh phan phoi phu hop.
- Neu app dang ghi du lieu khi cap nhat, co nguy co mat thao tac vua lam: chi hien nut cap nhat sau khi tai xong va de nguoi dung chu dong bam.
- Neu version khong tang, auto-update se khong kich hoat: luon kiem tra `package.json` truoc khi pack.
