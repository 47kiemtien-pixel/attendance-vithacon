# Software Requirements Specification: Attendance System

## 1. Thong Tin Tai Lieu

- Ten du an: Attendance System - Cham cong Viet Thanh
- Phien ban tai lieu: 1.0
- Ngay cap nhat: 2026-05-17
- Phien ban ung dung tham chieu: 1.5.0
- Chu so huu nghiep vu: Noi bo cong ty
- Doi tuong su dung: Quan ly, ke toan/nhan su, nguoi phu trach cham cong

## 2. Muc Tieu

He thong dung de quan ly danh sach cong nhan, cham cong theo ngay, ghi nhan cong viec/luong/nghi phep/tien xe, va xuat bao cao Excel/Word phuc vu doi chieu noi bo.

Muc tieu quan trong:

- Giam thao tac thu cong khi cham cong hang ngay.
- Dam bao du lieu cham cong co the sua lai ma khong de sot thong tin cu.
- Xuat bao cao theo thang va theo tung cong nhan.
- Dong goi duoc thanh ung dung desktop de cai dat cho nguoi dung khong ky thuat.
- Ho tro cap nhat ung dung theo version moi ma khong can thao tac thu cong phuc tap.

## 3. Pham Vi

Trong pham vi:

- Quan ly cong nhan.
- Cham cong theo tuan/thang.
- Quan ly trang thai cham cong: Du cong, Nua cong, Nghi, Nghi le, Phep, Di chuyen.
- Luu thong tin cong viec: vi tri, dia diem, muc luong/ngay, ghi chu, tien xe/di chuyen.
- Xuat bao cao Excel tong hop thang.
- Xuat bao cao Excel/Word theo cong nhan va khoang ngay.
- Sao luu va khoi phuc du lieu.
- Dong goi desktop app bang Electron.
- Kiem tra va cai dat cap nhat app khi co version moi.

Ngoai pham vi hien tai:

- Cham cong bang GPS, QR, khuon mat.
- Phan quyen nhieu cap chi tiet theo tung man hinh.
- Dong bo realtime nhieu may.
- Phe duyet don nghi phep theo workflow.
- Tinh luong tu dong day du theo quy che luong.

## 4. Vai Tro Nguoi Dung

- Quan ly he thong: Cai dat, sao luu/khoi phuc du lieu, cau hinh mau cong viec.
- Nguoi cham cong: Them/sua cong nhan, cham cong hang ngay, cap nhat trang thai ngay cong.
- Ke toan/nhan su: Xem bao cao, xuat Excel/Word, doi chieu tong cong va tien xe.

## 5. Yeu Cau Chuc Nang

### FR-01. Quan Ly Cong Nhan

Nguoi dung co the:

- Xem danh sach cong nhan.
- Them cong nhan moi.
- Sua thong tin cong nhan.
- Luu muc luong mac dinh, vi tri, dia diem lam viec neu co.

Tieu chi chap nhan:

- Cong nhan moi xuat hien trong bang cham cong ngay sau khi them.
- Cap nhat thong tin cong nhan khong lam mat du lieu cham cong da co.

### FR-02. Cham Cong Hang Ngay

Nguoi dung co the chon tung o theo cong nhan/ngay va cap nhat trang thai.

Trang thai ho tro:

- Full: Du cong.
- Half: Nua cong.
- Absent: Nghi.
- Holiday: Nghi le.
- Leave: Phep.
- Travel: Di chuyen.

Tieu chi chap nhan:

- Full/Half duoc tinh vao tong cong.
- Absent/Holiday/Leave/Travel khong tinh cong.
- Khi doi tu Full/Half sang Absent/Holiday/Leave, he thong phai reset dailyRate, position, location, travelCost ve gia tri rong/0.
- Khi doi sang Travel, he thong chi giu ghi chu va tien xe/di chuyen, khong giu luong/vi tri/dia diem cong viec.

### FR-03. Mau Cong Viec

Nguoi dung co the cau hinh mau cong viec gom vi tri, dia diem, muc luong.

Tieu chi chap nhan:

- Khi cham Full/Half, nguoi dung co the chon mau de tu dien thong tin.
- Mau cong viec khong ap dung cho Absent/Holiday/Leave.

### FR-04. Bao Cao Tong Hop Thang

Nguoi dung co the xuat bao cao Excel theo thang.

Tieu chi chap nhan:

- Bao cao co danh sach cong nhan.
- Moi ngay trong thang co gia tri cong tuong ung.
- Tong cong va tong tien xe duoc tinh dung theo du lieu hien tai.

### FR-05. Bao Cao Ca Nhan

Nguoi dung co the xuat bao cao theo cong nhan trong khoang ngay.

Tieu chi chap nhan:

- Bao cao hien thi ngay, dia diem, trang thai, ghi chu, tien xe.
- Tong cong va tong tien xe duoc tinh dung.
- Ho tro xuat Excel va Word.

### FR-06. Sao Luu Va Khoi Phuc

Nguoi dung co the xuat file backup JSON va nhap lai backup.

Tieu chi chap nhan:

- File backup gom workers, attendance, settings.
- Khi restore, he thong chuan hoa attendance record de tranh du lieu cu sai cau truc.

### FR-07. Auto Update Desktop App

Ung dung desktop phai kiem tra version moi khi chay ban da dong goi.

Tieu chi chap nhan:

- Khi co update, UI hien thong bao version moi va tai xuong tu dong.
- Khi update tai xong, UI yeu cau nguoi dung bam nut tat app va cap nhat.
- Sau khi cai dat xong, app tu mo lai.
- Update khong tu cai giua luc nguoi dung dang thao tac neu chua co xac nhan.

## 6. Yeu Cau Phi Chuc Nang

- Du lieu cham cong phai nhat quan sau moi lan sua.
- Ung dung local phai chay duoc khi khong co internet, tru tinh nang update.
- UI phai de thao tac tren man hinh desktop va laptop.
- Build production client khong duoc loi.
- Backend phai tra JSON on dinh cho client.
- Dong goi desktop phai gom client dist, server, data mac dinh va package metadata.

## 7. Kien Truc Hien Tai

- Client: React + Vite.
- Desktop shell: Electron.
- API server: Express.
- Data store chinh hien tai: JSON file trong thu muc data.
- Export: ExcelJS cho Excel, docx cho Word.
- Auto update: electron-updater + GitHub Releases theo cau hinh electron-builder.

Luon chay client qua API URL:

- Desktop packaged: Electron truyen `apiUrl` vao query string.
- Dev local: client dung `http://127.0.0.1:5005/api` mac dinh.

## 8. Mo Hinh Du Lieu Chinh

Worker:

- id
- name
- phone
- cccd
- position
- location
- dailyRate

Attendance entry:

- date: YYYY-MM-DD
- records: danh sach attendance record trong ngay

Attendance record:

- workerId
- status
- dailyRate
- position
- location
- note
- travelCost

Quy tac chuan hoa attendance record:

- Full/Half: co the co dailyRate, position, location, note, travelCost.
- Travel: chi giu note va travelCost.
- Absent/Holiday/Leave: chi giu note, cac thong tin cong viec va tien xe phai reset.

## 9. API Chinh

- `GET /api/workers`
- `POST /api/workers`
- `PUT /api/workers/:id`
- `GET /api/attendance`
- `POST /api/attendance`
- `POST /api/attendance/record`
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/export`
- `GET /api/export/worker`
- `GET /api/export/worker/docx`
- `GET /api/backup`
- `POST /api/restore`

## 10. Release Va Version

Version ung dung desktop duoc quan ly trong `package.json`.

Quy trinh release:

1. Hoan tat thay doi code va docs.
2. Chay build client.
3. Chay local server/client de test nghiep vu.
4. Tang version trong `package.json`.
5. Dong goi bang `npm run desktop:pack`.
6. Tao GitHub Release moi va upload artifact neu dung kenh publish GitHub.
7. Mo app version cu de xac nhan auto-update phat hien version moi.

## 11. Ranh Gioi Va Rui Ro

- Data JSON phu hop voi van hanh local don gian, nhung can quy trinh backup neu dung lau dai.
- Neu nhieu may cung sua du lieu rieng le, he thong chua co co che dong bo/xung dot.
- Auto-update chi hoat dong trong ban Electron da dong goi, khong chay trong Vite dev browser.
- Update can GitHub Release va metadata dung voi `electron-builder`.

## 12. Lich Su Thay Doi

- 2026-05-17: Tao SRS ban dau, bo sung yeu cau reset du lieu khi doi ngay cong sang ngay nghi va mo ta auto-update.
