# WebGIS Phương án sử dụng đất — xã Đại Phúc

Phương án sử dụng đất thu hồi từ Công ty Lâm nghiệp Thái Nguyên.
UBND xã Đại Phúc, tỉnh Thái Nguyên — Cơ quan tổ chức lập: **Phòng Xây dựng, Nông nghiệp và Môi trường**.

Đơn vị xây dựng: Công ty Cổ phần Công nghệ Tài nguyên - Môi trường Hà Nội — ĐT 035.293 7823.

Ứng dụng tĩnh (HTML + Leaflet), chạy trên GitHub Pages, không cần máy chủ.

## Cấu trúc
```
index.html            Giao diện (Bản đồ, Tra cứu, Thống kê, Biểu rà soát, Hướng dẫn, Liên hệ)
app.js                Logic bản đồ, lọc, thống kê, rà soát, xuất Excel/CSV/JSON
style.css             Giao diện
data/diachinh.geojson 528 thửa đã chuyển VN-2000 (KTT 106°30') → WGS-84
tools/convert_vn2000.py  Script chuyển đổi khi cập nhật dữ liệu từ QGIS
```

## Đưa lên GitHub Pages
1. Tạo repo mới (VD `daiphuc`), upload toàn bộ thư mục này (giữ nguyên thư mục `data/`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Sau 1–2 phút truy cập `https://<tài-khoản>.github.io/daiphuc/`.

## Cập nhật dữ liệu
Xuất lớp thửa từ QGIS ra GeoJSON (giữ tọa độ VN-2000, các trường `Hc_Xa_tu01, Sh_Tobd, Sh_thuadat,
Dtich_thua, Dtich_hoso, Dtich_cty_, Kyhieu_mad, Hotenho_HN, Pasdd_so_p`), rồi chạy:
```
pip install pyproj shapely
python tools/convert_vn2000.py websit.geojson data/diachinh.geojson
```
Script tự sửa các thửa có "lỗ" (thửa nằm trong thửa rừng phòng hộ bị xuất thành phần riêng),
và gắn cảnh báo khi DT hồ sơ lệch > 2% so với DT tính từ ranh thửa hoặc thiếu số liệu.

Nếu đối chiếu điểm khống chế thấy lớp thửa lệch nền ảnh, chỉnh hằng `OFFSET` ở đầu `app.js`.

## Lưu ý
Thông tin rà soát lưu trong trình duyệt (localStorage) của từng máy. Cán bộ xuất JSON ở tab
*Biểu rà soát*; máy tổng hợp dùng *Nhập JSON* để gộp (bản ghi có ngày rà soát mới hơn được giữ).
