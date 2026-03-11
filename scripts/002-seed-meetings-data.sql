-- Seed sample meetings data
INSERT INTO meetings (id, title, type, start_time, end_time, content, status, location, format, online_link, created_by)
VALUES 
    (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Họp Chi bộ định kỳ tháng 3',
        'PERIODIC',
        '2026-03-15 14:00:00+07',
        '2026-03-15 16:00:00+07',
        'Nội dung: Đánh giá công tác tháng 2, triển khai nhiệm vụ tháng 3, thông qua nghị quyết.',
        'SCHEDULED',
        'Phòng họp A1 - Tầng 3',
        'OFFLINE',
        NULL,
        'admin'
    ),
    (
        'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        'Lễ kết nạp Đảng viên mới',
        'CEREMONY',
        '2026-03-20 09:00:00+07',
        '2026-03-20 11:00:00+07',
        'Lễ kết nạp đồng chí Nguyễn Văn A và Trần Thị B vào Đảng Cộng sản Việt Nam.',
        'SCHEDULED',
        'Hội trường lớn - Tầng 5',
        'OFFLINE',
        NULL,
        'admin'
    ),
    (
        'c3d4e5f6-a7b8-9012-cdef-345678901234',
        'Họp bất thường về công tác nhân sự',
        'EXTRAORDINARY',
        '2026-03-12 08:30:00+07',
        '2026-03-12 10:00:00+07',
        'Họp bất thường để thảo luận về công tác quy hoạch cán bộ quý II/2026.',
        'FINISHED',
        'Phòng họp B2 - Tầng 2',
        'ONLINE',
        'https://meet.google.com/abc-defg-hij',
        'admin'
    ),
    (
        'd4e5f6a7-b8c9-0123-defa-456789012345',
        'Kỷ niệm 95 năm thành lập Đảng',
        'CELEBRATION',
        '2026-02-03 08:00:00+07',
        '2026-02-03 12:00:00+07',
        'Lễ kỷ niệm 95 năm Ngày thành lập Đảng Cộng sản Việt Nam (3/2/1930 - 3/2/2025). Chương trình: Dâng hương, văn nghệ, trao huy hiệu Đảng.',
        'FINISHED',
        'Hội trường Nhà văn hóa',
        'OFFLINE',
        NULL,
        'admin'
    ),
    (
        'e5f6a7b8-c9d0-1234-efab-567890123456',
        'Hội nghị tổng kết năm 2025',
        'EVENT',
        '2026-01-10 08:00:00+07',
        '2026-01-10 17:00:00+07',
        'Hội nghị tổng kết công tác Đảng năm 2025 và phương hướng nhiệm vụ năm 2026.',
        'FINISHED',
        'Trung tâm Hội nghị Quốc gia',
        'OFFLINE',
        NULL,
        'admin'
    ),
    (
        'f6a7b8c9-d0e1-2345-fabc-678901234567',
        'Họp Chi bộ định kỳ tháng 4',
        'PERIODIC',
        '2026-04-12 14:00:00+07',
        '2026-04-12 16:00:00+07',
        'Nội dung: Đánh giá công tác tháng 3, triển khai nhiệm vụ tháng 4.',
        'SCHEDULED',
        'Phòng họp A1 - Tầng 3',
        'OFFLINE',
        NULL,
        'admin'
    ),
    (
        'a7b8c9d0-e1f2-3456-abcd-789012345678',
        'Lễ trao Huy hiệu 30 năm tuổi Đảng',
        'CELEBRATION',
        '2026-05-19 09:00:00+07',
        '2026-05-19 11:00:00+07',
        'Lễ trao Huy hiệu 30 năm tuổi Đảng cho các đồng chí đảng viên nhân dịp kỷ niệm sinh nhật Bác.',
        'SCHEDULED',
        'Hội trường lớn - Tầng 5',
        'OFFLINE',
        NULL,
        'admin'
    )
ON CONFLICT (id) DO NOTHING;
