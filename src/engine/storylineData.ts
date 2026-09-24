/**
 * STORYLINE DATA DEFINITIONS
 * 
 * Chứa dữ liệu cốt lõi chuẩn hóa:
 * 1. 60 Siêu sao sân cỏ (Protagonists & Antagonists)
 * 2. 60 Nhân vật phụ hài hước (Secondary Characters: Quản lý, bảo vệ, chủ nợ, shipper...)
 * 3. 125 Sự kiện kích động (Inciting Incidents: Bố mẹ đi vắng, lẩu Wagyu $50k, flash sale 90s, giới nghiêm vợ, xe cứu hộ...)
 * 4. 100 Khúc cua và biến cố kịch tính trên đường đua (100 Track Twists: Xả nitro đột ngột, mèo hoang đỉnh dốc, bão nhiệt đới, khói âm thanh điện ảnh...)
 * 5. 100 Hình phạt hài hước (100 Consequences: Nhuộm tóc hồng neon, mặc váy tutu, múa quạt livestream, giặt giày cả năm...)
 */

export interface SecondaryCharacter {
  id: string;
  nameVi: string;
  nameEn: string;
  roleVi: string;
  roleEn: string;
}

export interface IncitingIncidentTemplate {
  cat: string;
  titleVi: string;
  titleEn: string;
  descVi: (p: string, a: string, s: string) => string;
  descEn: (p: string, a: string, s: string) => string;
  hookVi: string;
  hookEn: string;
}

// 60 Siêu sao bóng đá thế giới làm tay đua chính
export const STAR_DRIVERS: string[] = [
  'Cristiano Ronaldo', 'Lionel Messi', 'Neymar Jr', 'Kylian Mbappe', 'Erling Haaland',
  'Kevin De Bruyne', 'David Beckham', 'Son Heung-min', 'Vinicius Jr', 'Jude Bellingham',
  'Luka Modric', 'Karim Benzema', 'Mohamed Salah', 'Harry Kane', 'Robert Lewandowski',
  'Bruno Fernandes', 'Marcus Rashford', 'Harry Maguire', 'Casemiro', 'Alisson Becker',
  'Manuel Neuer', 'Sergio Ramos', 'Pepe', 'Zlatan Ibrahimovic', 'Ronaldinho',
  'Kaka', 'Zinedine Zidane', 'Wayne Rooney', 'Thierry Henry', 'Ronaldo Nazario',
  'Phil Foden', 'Bukayo Saka', 'Rodri', 'Bernardo Silva', 'Antoine Griezmann',
  'Toni Kroos', 'Thomas Muller', 'Angel Di Maria', 'Federico Valverde', 'Eduardo Camavinga',
  'Gavi', 'Pedri', 'Lamine Yamal', 'Darwin Nunez', 'Luis Diaz',
  'Virgil van Dijk', 'Ruben Dias', 'Emiliano Martinez', 'Thibaut Courtois', 'Lautaro Martinez',
  'Julian Alvarez', 'Victor Osimhen', 'Khvicha Kvaratskhelia', 'Declan Rice', 'Martin Odegaard',
  'William Saliba', 'Joshua Kimmich', 'Kingsley Coman', 'Rafael Leao', 'Ousmane Dembele'
];

// 60 Nhân vật phụ hài hước
export const SECONDARY_CHARACTERS: SecondaryCharacter[] = [
  { id: 'sc_01', nameVi: 'HLV Trưởng Nghiêm Khắc', nameEn: 'Strict Head Coach', roleVi: 'Quản lý', roleEn: 'Management' },
  { id: 'sc_02', nameVi: 'Bác Bảo Vệ Tổ Dân Phố Gác Barie', nameEn: 'Neighborhood Barrier Guard', roleVi: 'Bảo vệ', roleEn: 'Security' },
  { id: 'sc_03', nameVi: 'Đại Ca Cho Vay Nặng Lãi Đòi Nợ Lẩu Dê', nameEn: 'Aggressive Loan Shark Enforcer', roleVi: 'Chủ nợ', roleEn: 'Creditor' },
  { id: 'sc_04', nameVi: 'Shipper Công Nghệ Chạy Xe Số Quái Kiệt', nameEn: 'Supersonic App Delivery Rider', roleVi: 'Shipper', roleEn: 'Courier' },
  { id: 'sc_05', nameVi: 'Trưởng Ban Kỷ Luật Liên Đoàn Bóng Đá', nameEn: 'Disciplinary Committee Chief', roleVi: 'Quản lý', roleEn: 'Management' },
  { id: 'sc_06', nameVi: 'Vợ Đại Ca Quyền Lực Ban Giới Nghiêm', nameEn: 'Authoritative Spouse Boss', roleVi: 'Gia đình', roleEn: 'Family' },
  { id: 'sc_07', nameVi: 'Em Người Yêu Kiêu Kỳ Dọa Chia Tay', nameEn: 'Demanding Diva Girlfriend', roleVi: 'Tình cảm', roleEn: 'Romance' },
  { id: 'sc_08', nameVi: 'Chủ Quán Phở Bò Sốt Vang Gia Truyền', nameEn: 'Master Beef Stew Pho Chef', roleVi: 'Ẩm thực', roleEn: 'Food' },
  { id: 'sc_09', nameVi: 'Trọng Tài VAR Cầm Thẻ Đỏ Trên Xe An Toàn', nameEn: 'VAR Official in Safety Car', roleVi: 'Trọng tài', roleEn: 'Referee' },
  { id: 'sc_10', nameVi: 'Bác Cứu Hộ Cẩu Xe 116 Chuyên Nghiệp', nameEn: 'Tow Truck 911 Recovery Crew', roleVi: 'Cứu hộ', roleEn: 'Rescue' },
  { id: 'sc_11', nameVi: 'Bà Hàng Xóm Camera Chạy Bằng Cơm', nameEn: 'Nosy Neighborhood Gossip', roleVi: 'Hàng xóm', roleEn: 'Neighbor' },
  { id: 'sc_12', nameVi: 'Chủ Tiệm Cầm Đồ Siêu Xe Lãi Ngày', nameEn: 'Exotic Pawnshop Master', roleVi: 'Chủ nợ', roleEn: 'Creditor' },
  { id: 'sc_13', nameVi: 'Chủ Tịch Tập Đoàn Tài Trợ Khó Tính', nameEn: 'Demanding Corporate Chairman', roleVi: 'Tài trợ', roleEn: 'Sponsor' },
  { id: 'sc_14', nameVi: 'Thợ Độ Xe Dỏm Bán Bùa Tăng Áp', nameEn: 'Shady Backyard Tuner Mechanic', roleVi: 'Kỹ thuật', roleEn: 'Tuning' },
  { id: 'sc_15', nameVi: 'Shipper Hỏa Tốc Giao Trà Sữa 15 Phút', nameEn: 'Express Boba Tea Courier', roleVi: 'Shipper', roleEn: 'Courier' },
  { id: 'sc_16', nameVi: 'Bảo Vệ Bãi Xe Trung Tâm Thương Mại', nameEn: 'Mall Underground Garage Guard', roleVi: 'Bảo vệ', roleEn: 'Security' },
  { id: 'sc_17', nameVi: 'Kẻ Đòi Nợ Thuê Cầm Loa Phóng Thanh', nameEn: 'Megaphone Debt Harasser', roleVi: 'Chủ nợ', roleEn: 'Creditor' },
  { id: 'sc_18', nameVi: 'Chú Cảnh Sát Giao Thông Chốt Đèn Đỏ', nameEn: 'Speed Trap Patrol Officer', roleVi: 'Cảnh sát', roleEn: 'Police' },
  { id: 'sc_19', nameVi: 'Quản Lý Chung Cư Cao Cấp Khóa Bánh', nameEn: 'Luxury Condo Wheel Clamp Manager', roleVi: 'Quản lý', roleEn: 'Management' },
  { id: 'sc_20', nameVi: 'Idol Tóp Tóp Múa Quạt Quấy Rối', nameEn: 'Viral TikTok Influencer', roleVi: 'Truyền thông', roleEn: 'Media' },
  { id: 'sc_21', nameVi: 'Chủ Nợ Lẩu Wagyu 50.000 Đô La', nameEn: 'Gourmet Wagyu Restaurant Owner', roleVi: 'Chủ nợ', roleEn: 'Creditor' },
  { id: 'sc_22', nameVi: 'Cô Chủ Quán Trà Chanh Chém Gió Vỉa Hè', nameEn: 'Sidewalk Lemon Tea Queen', roleVi: 'Hàng quán', roleEn: 'Street' },
  { id: 'sc_23', nameVi: 'Thợ Săn Ảnh Paparazzi Rình Bụi Cây', nameEn: 'Paparazzi Bush Stalker', roleVi: 'Truyền thông', roleEn: 'Media' },
  { id: 'sc_24', nameVi: 'Chuyên Gia Bàn Phím Phân Tích Kỷ Lục', nameEn: 'Armchair Tactician Critic', roleVi: 'Phân tích', roleEn: 'Analyst' },
  { id: 'sc_25', nameVi: 'Nhân Viên Bãi Đỗ Xe Hầm B3 Khó Tính', nameEn: 'Basement Parking Attendant', roleVi: 'Bảo vệ', roleEn: 'Security' },
  { id: 'sc_26', nameVi: 'Chủ Vựa Ve Chai Đòi Mua Xác Siêu Xe', nameEn: 'Scrap Metal Dealer', roleVi: 'Thương lái', roleEn: 'Merchant' },
  { id: 'sc_27', nameVi: 'Giám Đốc Truyền Thông Dọa Phạt Hợp Đồng', nameEn: 'Furious PR Director', roleVi: 'Quản lý', roleEn: 'Management' },
  { id: 'sc_28', nameVi: 'Shipper Giao Pizza 30 Phút Muộn Giờ', nameEn: 'Late Pizza Delivery Driver', roleVi: 'Shipper', roleEn: 'Courier' },
  { id: 'sc_29', nameVi: 'Thợ Máy Xưởng Đua Lỡ Vặn Trờn Ốc', nameEn: 'Clumsy Pitlane Chief Mechanic', roleVi: 'Kỹ thuật', roleEn: 'Tuning' },
  { id: 'sc_30', nameVi: 'Bác Tài Xe Tải Bấm Còi Hơi 120dB', nameEn: 'Air Horn Heavy Truck Driver', roleVi: 'Giao thông', roleEn: 'Traffic' },
  { id: 'sc_31', nameVi: 'Tổ Trưởng Dân Phố Đi Thu Tiền Rác', nameEn: 'Neighborhood Fee Collector', roleVi: 'Dân phố', roleEn: 'Community' },
  { id: 'sc_32', nameVi: 'Chủ Tiệm Cắt Tóc Tư Vấn Tình Cảm', nameEn: 'Philosophical Barber', roleVi: 'Dịch vụ', roleEn: 'Service' },
  { id: 'sc_33', nameVi: 'Nhân Viên Trực Cứu Hộ Giao Thông Khẩn', nameEn: 'Emergency Dispatcher Operator', roleVi: 'Cứu hộ', roleEn: 'Rescue' },
  { id: 'sc_34', nameVi: 'Chuyên Gia Phong Thủy Xem Giờ Xuất Bến', nameEn: 'Mystic Feng Shui Advisor', roleVi: 'Cố vấn', roleEn: 'Advisor' },
  { id: 'sc_35', nameVi: 'Đội Trưởng An Ninh Sân Bay Quốc Tế', nameEn: 'Airport Security Commander', roleVi: 'An ninh', roleEn: 'Security' },
  { id: 'sc_36', nameVi: 'Bác Bán Xôi Gấc Đầu Ngõ Tinh Mắt', nameEn: 'Eagle-Eyed Breakfast Street Vendor', roleVi: 'Ẩm thực', roleEn: 'Food' },
  { id: 'sc_37', nameVi: 'Chủ Nợ App Tài Chính Đen Gửi Tin Spam', nameEn: 'Lending App Blacklist Agent', roleVi: 'Chủ nợ', roleEn: 'Creditor' },
  { id: 'sc_38', nameVi: 'Thợ Sửa Ống Nước Vô Tình Ngáng Đường', nameEn: 'Accidental Plumber Obstacle', roleVi: 'Dịch vụ', roleEn: 'Service' },
  { id: 'sc_39', nameVi: 'Nhân Viên Trạm Thu Phí Không Dừng ETC', nameEn: 'Expressway Toll Booth Attendant', roleVi: 'Giao thông', roleEn: 'Traffic' },
  { id: 'sc_40', nameVi: 'Trợ Lý HLV Cầm Sổ Phạt Nội Quy', nameEn: 'Rulebook Enforcement Assistant', roleVi: 'Quản lý', roleEn: 'Management' },
  { id: 'sc_41', nameVi: 'Bác Bảo Vệ Công Viên Cấm Đua Trên Cỏ', nameEn: 'City Park Lawn Guard', roleVi: 'Bảo vệ', roleEn: 'Security' },
  { id: 'sc_42', nameVi: 'Chủ Tiệm Vàng Thông Báo Thẻ Thấu Chi', nameEn: 'Jewelry Merchant Card Decline', roleVi: 'Thương gia', roleEn: 'Merchant' },
  { id: 'sc_43', nameVi: 'Dân Anh Chị Bến Xe Đòi Thu Tiền Bến', nameEn: 'Bus Terminal Toll Bully', roleVi: 'Giang hồ', roleEn: 'Enforcer' },
  { id: 'sc_44', nameVi: 'Shipper Chở Màn Hình Tivi 85 Inch Run Rẩy', nameEn: 'Fragile 85-inch OLED TV Courier', roleVi: 'Shipper', roleEn: 'Courier' },
  { id: 'sc_45', nameVi: 'Người Yêu Cũ Đòi Lại Quà Sinh Nhật', nameEn: 'Vengeful Ex Demanding Gifts Back', roleVi: 'Tình cảm', roleEn: 'Romance' },
  { id: 'sc_46', nameVi: 'Bà Con Xóm Trọ Hò Reo Cuồng Nhiệt', nameEn: 'Cheering Tenement Mob', roleVi: 'Cộng đồng', roleEn: 'Community' },
  { id: 'sc_47', nameVi: 'Chủ Thầu Xây Dựng Giục Đổ Bê Tông', nameEn: 'Frantic Concrete Contractor', roleVi: 'Xây dựng', roleEn: 'Contractor' },
  { id: 'sc_48', nameVi: 'Anh Thợ Rửa Xe Lỡ Làm Trầy Gương Chiếu', nameEn: 'Nervous Car Detailing Apprentice', roleVi: 'Dịch vụ', roleEn: 'Service' },
  { id: 'sc_49', nameVi: 'Giám Khảo Chấm Thi Bằng Lái Xe Gắt Gao', nameEn: 'Ruthless Driving License Examiner', roleVi: 'Khảo thí', roleEn: 'Examiner' },
  { id: 'sc_50', nameVi: 'Kẻ Rải Đinh Bẫy Lốp Phục Kích', nameEn: 'Highway Spike Trap Villain', roleVi: 'Phản diện', roleEn: 'Antagonist' },
  { id: 'sc_51', nameVi: 'Nữ Streamer Bình Luận Dạo Triệu View', nameEn: 'Million-Follower Gossip Streamer', roleVi: 'Truyền thông', roleEn: 'Media' },
  { id: 'sc_52', nameVi: 'Nhân Viên Siêu Thị Tranh Thùng Mì Cuối', nameEn: 'Supermarket Clearance Clerk', roleVi: 'Thương mại', roleEn: 'Retail' },
  { id: 'sc_53', nameVi: 'Bác Thợ Điện Đu Dây Cột Đèn Xem Đua', nameEn: 'Lineman Watching From Power Pole', roleVi: 'Kỹ thuật', roleEn: 'Technician' },
  { id: 'sc_54', nameVi: 'Shipper Chở Tủ Lạnh Bằng Xe Wave Tàu', nameEn: 'Moped Refrigerator Transport Rider', roleVi: 'Shipper', roleEn: 'Courier' },
  { id: 'sc_55', nameVi: 'Trưởng Hội Phụ Huynh Đòi Họp Đột Xuất', nameEn: 'Stern PTA Committee President', roleVi: 'Giáo dục', roleEn: 'Community' },
  { id: 'sc_56', nameVi: 'Bác Lái Máy Xúc Chặn Ngang Làn Tránh', nameEn: 'Bulldozer Excavator Operator', roleVi: 'Công trường', roleEn: 'Worker' },
  { id: 'sc_57', nameVi: 'Nhân Viên Cây Xăng Bơm Nhầm Dầu Diesel', nameEn: 'Gas Station Diesel Mix-Up Attendant', roleVi: 'Nhiên liệu', roleEn: 'Fuel' },
  { id: 'sc_58', nameVi: 'Fan Cuồng Cầm Áo Đấu Đuổi Theo Trực Diện', nameEn: 'Jersey-Chasing Superfan', roleVi: 'Cổ động viên', roleEn: 'Fan' },
  { id: 'sc_59', nameVi: 'Người Đại Diện Cầu Thủ Đòi Tăng Phí 500%', nameEn: 'Greedy Football Agent Shark', roleVi: 'Đại diện', roleEn: 'Agent' },
  { id: 'sc_60', nameVi: 'Bác Sĩ Trưởng Khoa Nhắc Uống Thuốc Bổ', nameEn: 'Chief Orthopedic Surgeon', roleVi: 'Y tế', roleEn: 'Medical' }
];
