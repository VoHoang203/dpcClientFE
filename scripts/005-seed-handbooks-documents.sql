-- Seed some sample handbooks data
INSERT INTO handbooks (title, slug, excerpt, content, category, status, is_featured, is_pinned, author_name, published_at) VALUES
(
    'Quy trinh ket nap Dang vien moi',
    'quy-trinh-ket-nap-dang-vien-moi',
    'Huong dan chi tiet quy trinh ket nap Dang vien moi tu chuan bi ho so den phe duyet.',
    '# Quy trinh ket nap Dang vien moi

## Buoc 1: Chuan bi ho so
Quan chung uu tu can chuan bi day du cac giay to sau:
- Don xin vao Dang (viet tay)
- Ly lich Dang vien (theo mau)
- Giay gioi thieu cua 2 Dang vien chinh thuc

## Buoc 2: Chi bo xem xet
Chi bo to chuc hop de xem xet, thao luan va bieu quyet ve viec ket nap.

### Yeu cau:
- Co mat it nhat 2/3 dang vien chinh thuc
- Bieu quyet bang phieu kin hoac gio tay
- Phai dat tren 50% dong y

## Buoc 3: Dang uy cap tren phe duyet
Ho so duoc gui len Dang uy cap tren de xet duyet chinh thuc.

### Thoi gian xu ly:
- Dang uy Bo phan: 15 ngay
- Dang uy co so: 30 ngay

## Luu y quan trong
- Dam bao ho so day du, chinh xac
- Quan chung phai du thoi gian theo doi, boi duong
- Tuan thu dung quy trinh, thoi han',
    'Quy trinh',
    'PUBLISHED',
    true,
    true,
    'Chi uy Chi bo',
    NOW() - INTERVAL '5 days'
),
(
    'Huong dan dong dang phi hang thang',
    'huong-dan-dong-dang-phi-hang-thang',
    'Huong dan chi tiet ve muc dong va cach thuc dong dang phi theo quy dinh moi nhat.',
    '# Huong dan dong Dang phi

## Muc dong Dang phi
Muc dang phi duoc tinh bang 1% thu nhap hang thang cua dang vien.

### Bang muc dong cu the:
| Thu nhap | Muc dong |
|----------|----------|
| Duoi 10 trieu | 1% |
| 10-20 trieu | 1% |
| Tren 20 trieu | 1% |

## Thoi han dong
- Dong truoc ngay 15 hang thang
- Co the dong truoc nhieu thang

## Hinh thuc dong
1. **Chuyen khoan**: Chuyen vao tai khoan Chi bo
2. **Tien mat**: Nop truc tiep cho thu quy Chi bo

## Luu y
- Giu lai bien lai dong dang phi
- Theo doi tren he thong quan ly
- Lien he Chi uy neu co thac mac',
    'Huong dan',
    'PUBLISHED',
    false,
    false,
    'Chi uy Chi bo',
    NOW() - INTERVAL '3 days'
),
(
    'Quy trinh Le Cong nhan Dang vien chinh thuc',
    'quy-trinh-le-cong-nhan-dang-vien-chinh-thuc',
    'Cac buoc va thu tuc cho le cong nhan Dang vien chinh thuc ket hop sinh hoat Chi bo dinh ky.',
    '# Quy trinh Le Cong nhan Dang vien chinh thuc

## Buoc 1: Nhan Quyet dinh
Chi uy Nhan Quyet dinh Cong nhan dang vien chinh thuc tu Dang uy Bo phan.

## Buoc 2: Lap ke hoach to chuc
Chi uy tien hanh lap ke hoach to chuc:
- Len du tru kinh phi
- Phan cong cong viec
- Xac dinh thoi gian, dia diem

### Du tru kinh phi:
- Thiet ke backdrop
- Hoa tuoi hoac qua tang
- Teabreak
- Tho chup anh

## Buoc 3: Chuan bi
- Email moi toan bo dang vien
- Chuan bi cac hang muc theo du tru
- Chuan bi kich ban MC

## Buoc 4: To chuc buoi le

### Trinh tu buoi le:
1. Chao co (hat Quoc ca, Quoc te ca)
2. Tuyen bo ly do, gioi thieu dai bieu
3. Bi thu doc quyet dinh
4. Trao quyet dinh cho dang vien
5. Dai dien Dang uy phat bieu
6. Hop chi bo dinh ky
7. Be mac
8. Chup anh luu niem + teabreak',
    'Quy trinh',
    'PUBLISHED',
    true,
    false,
    'Chi uy Chi bo',
    NOW() - INTERVAL '1 day'
),
(
    'Dieu le Dang Cong san Viet Nam 2024',
    'dieu-le-dang-cong-san-viet-nam-2024',
    'Tong hop cac dieu khoan quan trong trong Dieu le Dang duoc cap nhat theo Dai hoi XIII.',
    '# Dieu le Dang Cong san Viet Nam

## Chuong I: Dang vien

### Dieu 1: Tieu chuan Dang vien
Dang vien Dang Cong san Viet Nam la chien si cach mang trong doi tien phong cua giai cap cong nhan, nhan dan lao dong va dan toc Viet Nam.

### Dieu 2: Nhiem vu cua Dang vien
1. Tuyet doi trung thanh voi muc dich, ly tuong cach mang
2. Hoan thanh tot nhiem vu duoc giao
3. Lien he chat che voi nhan dan
4. Chap hanh nghiem chinh ky luat Dang

### Dieu 3: Quyen cua Dang vien
1. Duoc thong tin va thao luan cac van de
2. Phe binh, chat van trong to chuc Dang
3. Ung cu, de cu vao co quan lanh dao
4. Trinh bay y kien khi to chuc Dang quyet dinh

## Chuong II: Nguyen tac to chuc

### Dieu 9: Tap trung dan chu
Dang to chuc theo nguyen tac tap trung dan chu.

### Dieu 10: Co quan lanh dao
Co quan lanh dao cac cap cua Dang do bau cu lap ra.',
    'Dieu le Dang',
    'PUBLISHED',
    true,
    true,
    'Chi uy Chi bo',
    NOW() - INTERVAL '10 days'
),
(
    'Thong bao lich sinh hoat Chi bo thang 2/2025',
    'thong-bao-lich-sinh-hoat-chi-bo-thang-2-2025',
    'Thong bao ve lich sinh hoat Chi bo dinh ky va cac hoat dong trong thang 2/2025.',
    '# Thong bao Lich sinh hoat Chi bo thang 2/2025

## Lich sinh hoat dinh ky
- **Ngay**: 15/02/2025
- **Gio**: 14:00 - 16:00
- **Dia diem**: Phong hop A301

## Noi dung chinh
1. Bao cao tinh hinh thang 1/2025
2. Pho bien nghi quyet Dang uy
3. Danh gia, xep loai dang vien
4. Thao luan ke hoach hoat dong

## Thanh phan tham du
- Toan the dang vien Chi bo
- Dai dien Dang uy Bo phan (neu co)

## Yeu cau
- Den dung gio
- Chuan bi y kien dong gop
- Mang theo so tay dang vien

## Lien he
Chi uy: 0912.345.678
Email: chiuy@fpt.edu.vn',
    'Thong bao',
    'DRAFT',
    false,
    false,
    'Chi uy Chi bo',
    NULL
)
ON CONFLICT DO NOTHING;

-- Seed some sample documents data
INSERT INTO documents (name, description, category, file_url, file_name, file_size, file_type, mime_type, is_public, is_pinned, uploader_name) VALUES
(
    'Dieu le Dang Cong san Viet Nam 2024',
    'Van ban day du Dieu le Dang Cong san Viet Nam duoc thong qua tai Dai hoi XIII',
    'Dieu le',
    '/documents/dieu-le-dang-2024.pdf',
    'dieu-le-dang-2024.pdf',
    2457600,
    'PDF',
    'application/pdf',
    true,
    true,
    'Admin'
),
(
    'Quy dinh ve danh gia, xep loai dang vien',
    'Quy dinh chi tiet ve tieu chi va quy trinh danh gia xep loai dang vien hang nam',
    'Quy dinh',
    '/documents/quy-dinh-danh-gia-dang-vien.docx',
    'quy-dinh-danh-gia-dang-vien.docx',
    876544,
    'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    true,
    false,
    'Bi thu'
),
(
    'Huong dan dong Dang phi 2025',
    'Huong dan muc dong va cach thuc dong dang phi nam 2025',
    'Huong dan',
    '/documents/huong-dan-dang-phi-2025.pdf',
    'huong-dan-dang-phi-2025.pdf',
    435200,
    'PDF',
    'application/pdf',
    true,
    false,
    'Chi uy'
),
(
    'Mau bao cao cong tac Dang vien',
    'Mau bao cao danh cho dang vien nop hang thang/quy',
    'Bieu mau',
    '/documents/mau-bao-cao-dang-vien.xlsx',
    'mau-bao-cao-dang-vien.xlsx',
    131072,
    'XLSX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    true,
    false,
    'Admin'
),
(
    'Nghi quyet Dai hoi Chi bo 2024',
    'Nghi quyet duoc thong qua tai Dai hoi Chi bo nhiem ky 2024-2027',
    'Nghi quyet',
    '/documents/nghi-quyet-dai-hoi-2024.pdf',
    'nghi-quyet-dai-hoi-2024.pdf',
    1228800,
    'PDF',
    'application/pdf',
    true,
    true,
    'Bi thu'
),
(
    'Mau don xin vao Dang',
    'Mau don xin vao Dang danh cho quan chung uu tu',
    'Bieu mau',
    '/documents/mau-don-xin-vao-dang.docx',
    'mau-don-xin-vao-dang.docx',
    65536,
    'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    true,
    false,
    'Chi uy'
),
(
    'Mau ly lich Dang vien',
    'Mau ly lich danh cho nguoi xin vao Dang',
    'Bieu mau',
    '/documents/mau-ly-lich-dang-vien.docx',
    'mau-ly-lich-dang-vien.docx',
    87040,
    'DOCX',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    true,
    false,
    'Chi uy'
),
(
    'Bao cao tong ket cong tac Dang nam 2024',
    'Bao cao tong ket hoat dong cua Chi bo nam 2024',
    'Bao cao',
    '/documents/bao-cao-tong-ket-2024.pdf',
    'bao-cao-tong-ket-2024.pdf',
    2097152,
    'PDF',
    'application/pdf',
    true,
    false,
    'Bi thu'
)
ON CONFLICT DO NOTHING;
