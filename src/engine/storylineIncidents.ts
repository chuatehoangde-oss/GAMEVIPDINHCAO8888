import { IncitingIncidentTemplate } from './storylineData';

export const INCITING_INCIDENTS: IncitingIncidentTemplate[] = [
  {
    cat: 'romance',
    titleVi: 'Tin Nhắn Bố Mẹ Đi Vắng Bất Ngờ',
    titleEn: 'The Parents Out Of Town Emergency Text',
    descVi: (p, a, s) => `Em người yêu của ${p} gửi tin nhắn nhầm cho cả ${a} và ${s}: "Bố mẹ em đi vắng 1 tiếng, ai phi tới trước em thưởng nóng bữa tối nến hoa!"`,
    descEn: (p, a, s) => `${p}'s girlfriend accidentally sent a broadcast text to ${a} and ${s}: "Parents left town for one hour, first to arrive gets an exclusive candlelit dinner!"`,
    hookVi: 'Nghe tin bố mẹ em đi vắng, cả đoàn xe đạp ga 650 km/h bạt mạng!',
    hookEn: 'That legendary text message turned this race into a supersonic dogfight!'
  },
  {
    cat: 'food',
    titleVi: 'Hóa Đơn Nồi Lẩu Bò Wagyu 50.000 Đô La',
    titleEn: 'The $50,000 Wagyu Hotpot Bill Ultimatum',
    descVi: (p, a, s) => `${s} chặn đầu đường đua dằn mặt: Hóa đơn nồi lẩu bò Wagyu dát vàng 50.000 USD chưa ai trả, kẻ về sau giữa ${p} và ${a} phải gánh toàn bộ!`,
    descEn: (p, a, s) => `${s} blocked the track with an ultimatum: The $50,000 gold-leaf Wagyu hotpot bill is unpaid, and whoever finishes behind between ${p} and ${a} pays in full!`,
    hookVi: 'Nỗi sợ viêm màng túi 50.000 đô tiền lẩu bò Wagyu khiến không ai dám nhả chân ga!',
    hookEn: 'A five-figure Wagyu tab is pushing these engines past their mechanical redline!'
  },
  {
    cat: 'shopping',
    titleVi: 'Đợt Giảm Giá Chớp Nhoáng Shopee 90 Giây',
    titleEn: 'The 90-Second Flash Sale Checkout Frenzy',
    descVi: (p, a, s) => `Sàn thương mại điện tử xả kho siêu xe giảm 99% chỉ trong 90 giây cuối, ${p} và ${a} phải đua về đích có trạm WiFi để bấm thanh toán giỏ hàng trước ${s}!`,
    descEn: (p, a, s) => `Online mega flash sale expires in 90 seconds flat; ${p} and ${a} must blast to the finish line WiFi router to checkout before ${s}!`,
    hookVi: 'Chỉ còn đúng 90 giây đếm ngược săn sale, các tay đua đạp lún sàn ga cứu giỏ hàng!',
    hookEn: 'Ninety seconds until flash sale expiration—pure shopping panic at 650 km/h!'
  },
  {
    cat: 'family',
    titleVi: 'Lệnh Giới Nghiêm 10 Giờ Đêm Của Vợ',
    titleEn: 'The 10 PM Spousal Curfew Countdown',
    descVi: (p, a, s) => `Vợ của ${p} gọi video đanh thép: Đúng 10 phút nữa không về tới cửa nhà, toàn bộ dàn siêu xe và thẻ tín dụng sẽ bị ${s} tịch thu thanh lý!`,
    descEn: (p, a, s) => `${p}'s wife issued a terrifying ultimatum: Be home in 10 minutes or your entire supercar fleet and black cards are handed to ${s}!`,
    hookVi: 'Sức mạnh từ lệnh giới nghiêm của nóc nhà đang biến những cỗ máy thành tên lửa!',
    hookEn: 'Nothing fuels horsepower quite like the existential dread of a spousal curfew!'
  },
  {
    cat: 'police',
    titleVi: 'Trường Hợp Khẩn Cấp Cần Xe Cứu Hộ',
    titleEn: 'Emergency Tow Truck Impound Alert',
    descVi: (p, a, s) => `${s} đang điều động dàn xe cẩu 116 vây ráp bãi đỗ xe của ${p} và ${a}, buộc hai tay đua phải phóng tháo chạy để không bị cẩu xế cưng về bãi!`,
    descEn: (p, a, s) => `${s} dispatched heavy tow trucks to impound ${p} and ${a}'s prized vehicles, forcing an all-out emergency escape run!`,
    hookVi: 'Chạy trốn xe cẩu cứu hộ khẩn cấp, các chiến thần phi bạt mạng bất chấp ranh giới!',
    hookEn: 'A high-stakes sprint against emergency tow trucks looking to impound hypercars!'
  },
  {
    cat: 'food',
    titleVi: 'Bát Phở Bò Tái Gầu Gia Truyền Cuối Cùng',
    titleEn: 'The Final Rare Beef Pho Bowl',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bát phở bò gia truyền cuối cùng trước giờ dọn hàng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the final rare beef pho bowl'}! A high-stakes speed war erupts.`,
    hookVi: 'Một bát phở nóng hổi đang thôi thúc động cơ gào thét long trời lở đất!',
    hookEn: 'Một bát phở nóng hổi đang thôi thúc động cơ gào thét long trời lở đất!'
  },
  {
    cat: 'food',
    titleVi: 'Cốc Trà Sữa Trân Châu Full Topping Bị Uống Trộm',
    titleEn: 'The Stolen Boba Milk Tea Showdown',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cốc trà sữa trân châu đường đen size L để dành trong tủ lạnh'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the stolen boba milk tea showdown'}! A high-stakes speed war erupts.`,
    hookVi: 'Trận chiến tốc độ đòi lại công lý cho cốc trà sữa trân châu!',
    hookEn: 'Trận chiến tốc độ đòi lại công lý cho cốc trà sữa trân châu!'
  },
  {
    cat: 'food',
    titleVi: 'Chiếc Bánh Pizza Hải Sản Phô Mai Tràn Viền',
    titleEn: 'The Cheese-Crust Seafood Pizza Dispute',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'miếng pizza phô mai hảo hạng cuối cùng của bữa tiệc'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the cheese-crust seafood pizza dispute'}! A high-stakes speed war erupts.`,
    hookVi: 'Vì miếng pizza phô mai cuối cùng, một tấc nhựa đường cũng không nhường!',
    hookEn: 'Vì miếng pizza phô mai cuối cùng, một tấc nhựa đường cũng không nhường!'
  },
  {
    cat: 'food',
    titleVi: 'Thùng Mì Tôm Hảo Hảo Giữa Đêm Khuya',
    titleEn: 'Midnight Instant Noodle Box Raid',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thùng mì tôm chua cay cuối cùng trong siêu thị mini'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'midnight instant noodle box raid'}! A high-stakes speed war erupts.`,
    hookVi: 'Cơn đói cồn cào đêm khuya biến các tay đua thành thú dữ!',
    hookEn: 'Cơn đói cồn cào đêm khuya biến các tay đua thành thú dữ!'
  },
  {
    cat: 'food',
    titleVi: 'Đĩa Cơm Tấm Sườn Bì Chả Đặc Biệt',
    titleEn: 'The Legendary Broken Rice Platter Duel',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'đĩa cơm tấm sườn nướng mật ong bốc khói nghi ngút'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the legendary broken rice platter duel'}! A high-stakes speed war erupts.`,
    hookVi: 'Hương vị sườn nướng mật ong thôi thúc cú tạt đầu khét lẹt!',
    hookEn: 'Hương vị sườn nướng mật ong thôi thúc cú tạt đầu khét lẹt!'
  },
  {
    cat: 'food',
    titleVi: 'Nồi Lẩu Thái Chua Cay Khổng Lồ Cho Cả Đội',
    titleEn: 'Giant Tom Yum Hotpot Team Bounty',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nồi lẩu Thái 9 tầng hải sản treo thưởng cho người về nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'giant tom yum hotpot team bounty'}! A high-stakes speed war erupts.`,
    hookVi: 'Nồi lẩu hải sản khổng lồ đang vẫy gọi ở vạch đích!',
    hookEn: 'Nồi lẩu hải sản khổng lồ đang vẫy gọi ở vạch đích!'
  },
  {
    cat: 'food',
    titleVi: 'Mẻ Bánh Mì Pa-tê Trứng Nóng Giòn Rụm',
    titleEn: 'Crispy Pate Egg Baguette Run',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'ổ bánh mì pa-tê đặc biệt của tiệm bánh nổi tiếng nhất phố'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'crispy pate egg baguette run'}! A high-stakes speed war erupts.`,
    hookVi: 'Mùi bánh mì nóng giòn kích hoạt toàn bộ mã lực ẩn giấu!',
    hookEn: 'Mùi bánh mì nóng giòn kích hoạt toàn bộ mã lực ẩn giấu!'
  },
  {
    cat: 'food',
    titleVi: 'Chai Rượu Vang Pháp Thượng Hạng Của Chủ Tịch',
    titleEn: 'The Chairman Vintage French Wine Dispute',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chai vang cổ điển quý giá bị mang ra làm tiền cược'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the chairman vintage french wine dispute'}! A high-stakes speed war erupts.`,
    hookVi: 'Chai vang thượng hạng đang đặt cược sinh mệnh trên từng khúc cua!',
    hookEn: 'Chai vang thượng hạng đang đặt cược sinh mệnh trên từng khúc cua!'
  },
  {
    cat: 'food',
    titleVi: 'Xiên Thịt Nướng Vỉa Hè Thơm Nức Mũi',
    titleEn: 'Street BBQ Skewer Sprint',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'những xiên thịt nướng cuối cùng của quán quen'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'street bbq skewer sprint'}! A high-stakes speed war erupts.`,
    hookVi: 'Khói thịt nướng hòa lẫn khói lốp đốt cháy bầu không khí!',
    hookEn: 'Khói thịt nướng hòa lẫn khói lốp đốt cháy bầu không khí!'
  },
  {
    cat: 'food',
    titleVi: 'Bọc Xôi Gà Xé Nấm Hương Mẹ Nấu',
    titleEn: 'Shredded Chicken Sticky Rice Bounty',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hộp xôi gà nóng hổi chuẩn bị cho bữa sáng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'shredded chicken sticky rice bounty'}! A high-stakes speed war erupts.`,
    hookVi: 'Bữa sáng thượng hạng đang chờ đón kẻ chiến thắng duy nhất!',
    hookEn: 'Bữa sáng thượng hạng đang chờ đón kẻ chiến thắng duy nhất!'
  },
  {
    cat: 'food',
    titleVi: 'Hộp Kem Socola Bỉ Nguyên Chất Tan Chảy',
    titleEn: 'Melting Belgian Chocolate Ice Cream',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hộp kem hảo hạng đang tan chảy từng giây dưới trời nóng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'melting belgian chocolate ice cream'}! A high-stakes speed war erupts.`,
    hookVi: 'Chạy đua với độ tan chảy của kem, tốc độ phá vỡ rào cản âm thanh!',
    hookEn: 'Chạy đua với độ tan chảy của kem, tốc độ phá vỡ rào cản âm thanh!'
  },
  {
    cat: 'food',
    titleVi: 'Nồi Nước Dùng Bún Bò Huế 48 Tiếng Hầm Xương',
    titleEn: 'The 48-Hour Simmered Spicy Beef Noodle Pot',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nồi nước dùng bún bò gia truyền sắp cạn đáy'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 48-hour simmered spicy beef noodle pot'}! A high-stakes speed war erupts.`,
    hookVi: 'Mùi sả ớt cay nồng hòa cùng tiếng gầm động cơ 800 mã lực!',
    hookEn: 'Mùi sả ớt cay nồng hòa cùng tiếng gầm động cơ 800 mã lực!'
  },
  {
    cat: 'romance',
    titleVi: 'Bức Thư Tình Viết Tay Bị Lộ Cho Cả Đội',
    titleEn: 'The Leaked Handwritten Love Letter',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bức thư tình sến sẩm viết cho hotgirl bị rơi vào tay đối thủ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the leaked handwritten love letter'}! A high-stakes speed war erupts.`,
    hookVi: 'Thu hồi bức thư tình trước khi bị phát tán lên mạng xã hội!',
    hookEn: 'Thu hồi bức thư tình trước khi bị phát tán lên mạng xã hội!'
  },
  {
    cat: 'romance',
    titleVi: 'Bó Hoa Hồng 999 Bông Cho Buổi Tỏ Tình',
    titleEn: 'The 999 Rose Bouquet Proposal Dash',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bó hoa hồng khổng lồ cần giao trước giờ nàng lên máy bay'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 999 rose bouquet proposal dash'}! A high-stakes speed war erupts.`,
    hookVi: 'Chạy đua vì tình yêu đích thực trên từng mét đường đèo!',
    hookEn: 'Chạy đua vì tình yêu đích thực trên từng mét đường đèo!'
  },
  {
    cat: 'romance',
    titleVi: 'Lời Hẹn Hò Ăn Tối Trên Tầng 81 LandMark',
    titleEn: 'Skyline Penthouse Dinner Date Rush',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bàn tiệc ngắm hoàng hôn độc quyền chỉ giữ chỗ trong 15 phút'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'skyline penthouse dinner date rush'}! A high-stakes speed war erupts.`,
    hookVi: 'Không kịp tới bàn tiệc thì cơ hội tình yêu tan biến vĩnh viễn!',
    hookEn: 'Không kịp tới bàn tiệc thì cơ hội tình yêu tan biến vĩnh viễn!'
  },
  {
    cat: 'romance',
    titleVi: 'Tin Nhắn Chia Tay Kèm Điều Kiện Về Nhất',
    titleEn: 'The Win-Or-Breakup Ultimatum',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tối hậu thư: nếu không thắng cuộc đua hôm nay thì chấm dứt'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the win-or-breakup ultimatum'}! A high-stakes speed war erupts.`,
    hookVi: 'Đua vì tương lai tình ái, ánh mắt rực lửa không hề chớp!',
    hookEn: 'Đua vì tương lai tình ái, ánh mắt rực lửa không hề chớp!'
  },
  {
    cat: 'romance',
    titleVi: 'Món Quà Kỷ Niệm 100 Ngày Yêu Nhau Bị Thất Lạc',
    titleEn: 'The Lost 100-Day Anniversary Gift',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc nhẫn kim cương để quên trên ghế sau xe đối thủ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the lost 100-day anniversary gift'}! A high-stakes speed war erupts.`,
    hookVi: 'Truy đuổi chiếc nhẫn định mệnh với vận tốc chóng mặt!',
    hookEn: 'Truy đuổi chiếc nhẫn định mệnh với vận tốc chóng mặt!'
  },
  {
    cat: 'romance',
    titleVi: 'Cuộc Hẹn Đầu Tiên Với Nàng Hoa Hậu Thân Thiện',
    titleEn: 'First Date With The Miss Universe Finalist',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cuộc hẹn cà phê bí mật chỉ có đúng 10 phút để gặp mặt'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'first date with the miss universe finalist'}! A high-stakes speed war erupts.`,
    hookVi: 'Sức hút từ nàng hoa hậu khiến chân ga đạp hết hành trình!',
    hookEn: 'Sức hút từ nàng hoa hậu khiến chân ga đạp hết hành trình!'
  },
  {
    cat: 'romance',
    titleVi: 'Thử Thách Lấy Lòng Bố Vợ Tương Lai Khó Tính',
    titleEn: 'Impressing The Future Father-In-Law',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bố nàng tuyên bố chỉ gả con gái cho tay đua số 1'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'impressing the future father-in-law'}! A high-stakes speed war erupts.`,
    hookVi: 'Chứng minh bản lĩnh trước phụ huynh khó tính bằng tốc độ thần sầu!',
    hookEn: 'Chứng minh bản lĩnh trước phụ huynh khó tính bằng tốc độ thần sầu!'
  },
  {
    cat: 'romance',
    titleVi: 'Tấm Vé Máy Bay Đuổi Theo Người Yêu Sang Paris',
    titleEn: 'The Chasing Flight To Paris Passport Rush',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hộ chiếu và vé máy bay đang trên xe chạy ra phi trường'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the chasing flight to paris passport rush'}! A high-stakes speed war erupts.`,
    hookVi: 'Pha rượt đuổi nghẹt thở chặn đầu chuyến bay định mệnh!',
    hookEn: 'Pha rượt đuổi nghẹt thở chặn đầu chuyến bay định mệnh!'
  },
  {
    cat: 'romance',
    titleVi: 'Vòng Cổ Khắc Tên Nửa Kia Bị Rơi Ở Điểm Hẹn',
    titleEn: 'The Engraved Couple Locket Retrieve',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'vật đính ước vô giá đang nằm trơ trọi ven vỉa hè'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the engraved couple locket retrieve'}! A high-stakes speed war erupts.`,
    hookVi: 'Một cú cua sát sạt để giật lại kỷ vật tình yêu!',
    hookEn: 'Một cú cua sát sạt để giật lại kỷ vật tình yêu!'
  },
  {
    cat: 'romance',
    titleVi: 'Trận Chiến Tranh Giành Trái Tim Nữ Thần Xa Lộ',
    titleEn: 'Duel For The Heart Of The Circuit Queen',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nụ hôn chiến thắng của hoa khôi đường đua dành cho người về nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'duel for the heart of the circuit queen'}! A high-stakes speed war erupts.`,
    hookVi: 'Trái tim người đẹp chỉ dành cho kẻ thống trị vạch đích!',
    hookEn: 'Trái tim người đẹp chỉ dành cho kẻ thống trị vạch đích!'
  },
  {
    cat: 'romance',
    titleVi: 'Tin Nhắn Tha Thứ Sau 3 Tháng Giận Hờn',
    titleEn: 'The Forgiveness Text Message Dash',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cơ hội chuộc lỗi duy nhất nếu có mặt trước khi nàng khóa cửa'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the forgiveness text message dash'}! A high-stakes speed war erupts.`,
    hookVi: 'Cứu vãn tình yêu bằng cú nước rút xé toạc màn đêm!',
    hookEn: 'Cứu vãn tình yêu bằng cú nước rút xé toạc màn đêm!'
  },
  {
    cat: 'romance',
    titleVi: 'Bữa Tiệc Cầu Hôn Bất Ngờ Dưới Pháo Hoa',
    titleEn: 'The Surprise Fireworks Proposal Stunt',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thời điểm bắn pháo hoa cầu hôn chỉ còn đúng 2 phút'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the surprise fireworks proposal stunt'}! A high-stakes speed war erupts.`,
    hookVi: 'Đến trước phát pháo hoa đầu tiên hoặc hỏng bét cả kế hoạch!',
    hookEn: 'Đến trước phát pháo hoa đầu tiên hoặc hỏng bét cả kế hoạch!'
  },
  {
    cat: 'family',
    titleVi: 'Tiếng Hét Triệu Tập Bữa Cơm Gia Đình Lúc Trưa',
    titleEn: 'Maternal Lunch Call Emergency',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'mâm cơm canh cua cà pháo của mẹ đã dọn xong'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'maternal lunch call emergency'}! A high-stakes speed war erupts.`,
    hookVi: 'Lời mẹ dạy là thánh chỉ, trễ 1 giây là ăn đòn no nê!',
    hookEn: 'Lời mẹ dạy là thánh chỉ, trễ 1 giây là ăn đòn no nê!'
  },
  {
    cat: 'family',
    titleVi: 'Nhiệm Vụ Đón Con Tan Học Đúng Giờ Tan Tầm',
    titleEn: 'The Rush-Hour School Pickup Mission',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tiếng chuông tan trường reo lên và bác bảo vệ sắp đóng cổng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the rush-hour school pickup mission'}! A high-stakes speed war erupts.`,
    hookVi: 'Pha luồn lách giữa dòng xe cộ vì đứa con thân yêu!',
    hookEn: 'Pha luồn lách giữa dòng xe cộ vì đứa con thân yêu!'
  },
  {
    cat: 'family',
    titleVi: 'Bố Nhờ Mua Gói Thuốc Lào Và Bao Diêm Gấp',
    titleEn: 'Dad Urgent Tobacco Errands Call',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'gói thuốc lào đặc sản bố dặn mang về trước trận bóng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'dad urgent tobacco errands call'}! A high-stakes speed war erupts.`,
    hookVi: 'Hoàn thành nhiệm vụ gia đình với phong thái một nhà vô địch!',
    hookEn: 'Hoàn thành nhiệm vụ gia đình với phong thái một nhà vô địch!'
  },
  {
    cat: 'family',
    titleVi: 'Bà Nội Kêu Về Ăn Giỗ Đúng 11 Giờ Trưa',
    titleEn: 'Grandmother 11 AM Ancestral Feast Deadline',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'mâm cỗ gia tộc đang chờ người cháu đích tôn thắp nhang'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'grandmother 11 am ancestral feast deadline'}! A high-stakes speed war erupts.`,
    hookVi: 'Về kịp giờ thắp nhang gia tiên, tốc độ vượt mọi giới hạn!',
    hookEn: 'Về kịp giờ thắp nhang gia tiên, tốc độ vượt mọi giới hạn!'
  },
  {
    cat: 'family',
    titleVi: 'Hộ Tống Xe Mẹ Đi Chợ Tết Mua Cành Đào',
    titleEn: 'Escorting Mom For Lunar New Year Peach Tree',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chuyến chở mẹ đi chợ hoa sắm tết đông nghẹt người'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'escorting mom for lunar new year peach tree'}! A high-stakes speed war erupts.`,
    hookVi: 'Tay lái lụa đưa mẹ sắm cành đào tết rực rỡ nhất phố!',
    hookEn: 'Tay lái lụa đưa mẹ sắm cành đào tết rực rỡ nhất phố!'
  },
  {
    cat: 'family',
    titleVi: 'Cuộc Gọi Của Em Gái Cần Người Đèo Đi Thi Đại Học',
    titleEn: 'Sister College Entrance Exam Emergency Ride',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thời gian đóng cổng phòng thi đại học chỉ còn 8 phút'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'sister college entrance exam emergency ride'}! A high-stakes speed war erupts.`,
    hookVi: 'Vì tương lai đại học của em gái, chân ga biến thành hỏa tiễn!',
    hookEn: 'Vì tương lai đại học của em gái, chân ga biến thành hỏa tiễn!'
  },
  {
    cat: 'family',
    titleVi: 'Bác Trưởng Họ Giục Về Họp Hội Đồng Gia Tộc',
    titleEn: 'Clan Council Emergency Meeting Summons',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bác trưởng họ đếm ngược từng phút điểm danh cả họ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'clan council emergency meeting summons'}! A high-stakes speed war erupts.`,
    hookVi: 'Tránh bị ghi tên vào sổ phạt gia tộc bằng cú phi thần tốc!',
    hookEn: 'Tránh bị ghi tên vào sổ phạt gia tộc bằng cú phi thần tốc!'
  },
  {
    cat: 'family',
    titleVi: 'Bỏ Quên Chùm Chìa Khóa Nhà Trên Xe Của Vợ',
    titleEn: 'Front Door Keys Trapped In Wife Car',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chùm chìa khóa két sắt và nhà đang nằm trong cốp xe đối thủ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'front door keys trapped in wife car'}! A high-stakes speed war erupts.`,
    hookVi: 'Ép dừng chiếc xe giữ chìa khóa nhà trước khi trời sập tối!',
    hookEn: 'Ép dừng chiếc xe giữ chìa khóa nhà trước khi trời sập tối!'
  },
  {
    cat: 'family',
    titleVi: 'Mẹ Vợ Thông Báo Đến Chơi Nhà Đột Xuất',
    titleEn: 'Mother-In-Law Surprise Home Visit',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'mẹ vợ đã đứng trước cửa và cần người mở cửa đón tiếp chu đáo'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'mother-in-law surprise home visit'}! A high-stakes speed war erupts.`,
    hookVi: 'Tốc độ phản ứng trước mẹ vợ nhanh hơn cả vận tốc âm thanh!',
    hookEn: 'Tốc độ phản ứng trước mẹ vợ nhanh hơn cả vận tốc âm thanh!'
  },
  {
    cat: 'family',
    titleVi: 'Nhiệm Vụ Mua Bỉm Sữa Khẩn Cấp Cho Bé Con',
    titleEn: 'Midnight Diaper & Formula Powder Sprint',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hộp sữa công thức cuối cùng ở nhà vừa hết sạch'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'midnight diaper & formula powder sprint'}! A high-stakes speed war erupts.`,
    hookVi: 'Trách nhiệm làm cha thôi thúc màn bứt tốc không tưởng!',
    hookEn: 'Trách nhiệm làm cha thôi thúc màn bứt tốc không tưởng!'
  },
  {
    cat: 'family',
    titleVi: 'Bữa Cơm Sinh Nhật Tròn 1 Tuổi Của Quý Tử',
    titleEn: 'First Birthday Celebration Countdown',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nghi lễ thôi nôi chọn đồ chơi cho con trai sắp bắt đầu'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'first birthday celebration countdown'}! A high-stakes speed war erupts.`,
    hookVi: 'Về kịp lễ thôi nôi của con cưng với chiếc cúp vô địch trên tay!',
    hookEn: 'Về kịp lễ thôi nôi của con cưng với chiếc cúp vô địch trên tay!'
  },
  {
    cat: 'family',
    titleVi: 'Cuộc Họp Gia Đình Phân Chia Trách Nhiệm Rửa Bát',
    titleEn: 'Family Dishwashing Duty Summit',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'ai về sau cùng phải bao trọn việc rửa chén bát cả dịp lễ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'family dishwashing duty summit'}! A high-stakes speed war erupts.`,
    hookVi: 'Cuộc chiến trốn việc rửa bát đạt tới đỉnh cao kịch tính!',
    hookEn: 'Cuộc chiến trốn việc rửa bát đạt tới đỉnh cao kịch tính!'
  },
  {
    cat: 'shopping',
    titleVi: 'Cơn Sốt Mở Bán iPhone Mới Nhất Xếp Hàng Thứ 1',
    titleEn: 'Midnight Flagship Phone Queue Duel',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'vị trí số 1 tại cửa hàng Apple Store mở bán lúc bình minh'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'midnight flagship phone queue duel'}! A high-stakes speed war erupts.`,
    hookVi: 'Tranh chiếc vé số 1 sở hữu siêu phẩm công nghệ hàng đầu thế giới!',
    hookEn: 'Tranh chiếc vé số 1 sở hữu siêu phẩm công nghệ hàng đầu thế giới!'
  },
  {
    cat: 'shopping',
    titleVi: 'Giày Sneaker Bản Giới Hạn 1/1 Trên Toàn Thế Giới',
    titleEn: 'The 1-of-1 Ultra-Rare Sneaker Claim',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'đôi giày kim cương độc bản duy nhất của thương hiệu danh giá'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 1-of-1 ultra-rare sneaker claim'}! A high-stakes speed war erupts.`,
    hookVi: 'Đôi giày thể hiện đẳng cấp đang chờ chủ nhân đích thực!',
    hookEn: 'Đôi giày thể hiện đẳng cấp đang chờ chủ nhân đích thực!'
  },
  {
    cat: 'shopping',
    titleVi: 'Voucher Nghỉ Dưỡng 6 Sao Maldives Miễn Phí',
    titleEn: 'The All-Inclusive 6-Star Maldives Voucher',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kỳ nghỉ xa hoa trên đảo thiên đường cho người dẫn đầu'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the all-inclusive 6-star maldives voucher'}! A high-stakes speed war erupts.`,
    hookVi: 'Thiên đường nghỉ dưỡng Maldives kích nổ toàn bộ bình oxy nitro!',
    hookEn: 'Thiên đường nghỉ dưỡng Maldives kích nổ toàn bộ bình oxy nitro!'
  },
  {
    cat: 'shopping',
    titleVi: 'Chiếc Áo Da Vintage Độc Bản Tại Hội Chợ Đồ Hiệu',
    titleEn: 'Vintage Leather Jacket Auction Chase',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'món đồ hiệu độc bản từ thập niên 90 sắp gõ búa thanh toán'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'vintage leather jacket auction chase'}! A high-stakes speed war erupts.`,
    hookVi: 'Chạy đua giật lại món đồ cổ vô giá ngay trên đầu đối thủ!',
    hookEn: 'Chạy đua giật lại món đồ cổ vô giá ngay trên đầu đối thủ!'
  },
  {
    cat: 'shopping',
    titleVi: 'Bộ Sưu Tập Đồng Hồ Kim Cương Giảm Giá Độc Quyền',
    titleEn: 'Private Diamond Watch Vault Access',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'căn phòng trưng bày đồng hồ xa xỉ chỉ mở cửa cho 1 người'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'private diamond watch vault access'}! A high-stakes speed war erupts.`,
    hookVi: 'Cánh cửa kho báu kim cương sắp sập lại sau tích tắc!',
    hookEn: 'Cánh cửa kho báu kim cương sắp sập lại sau tích tắc!'
  },
  {
    cat: 'shopping',
    titleVi: 'Cơ Hội Sở Hữu Siêu Xe Bản Mui Trần Duy Nhất',
    titleEn: 'The Final Prototype Hypercar Contract',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hợp đồng đặt cọc chiếc siêu xe hypercar bản thử nghiệm'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the final prototype hypercar contract'}! A high-stakes speed war erupts.`,
    hookVi: 'Đặt bút ký vào bản hợp đồng siêu xe huyền thoại ngay tại vạch đích!',
    hookEn: 'Đặt bút ký vào bản hợp đồng siêu xe huyền thoại ngay tại vạch đích!'
  },
  {
    cat: 'shopping',
    titleVi: 'Gói Thẻ Cầu Thủ Huyền Thoại Mở Ra Tỷ Lệ 0.01%',
    titleEn: 'The 0.01% Legendary Pack Pull Duel',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'gói thẻ game độc quyền chứa huyền thoại bóng đá thế giới'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 0.01% legendary pack pull duel'}! A high-stakes speed war erupts.`,
    hookVi: 'Đua vì phẩm chất nhân phẩm mở thẻ tối thượng!',
    hookEn: 'Đua vì phẩm chất nhân phẩm mở thẻ tối thượng!'
  },
  {
    cat: 'shopping',
    titleVi: 'Chiếc Túi Hermès Birkin Da Cá Sấu Hiếm Có',
    titleEn: 'Rare Crocodile Leather Handbag Heist',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc túi xách quý giá mà cả giới thượng lưu thèm khát'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'rare crocodile leather handbag heist'}! A high-stakes speed war erupts.`,
    hookVi: 'Giá trị chiếc túi tiền tỷ nâng tầm cuộc đua lên tầm cỡ quốc tế!',
    hookEn: 'Giá trị chiếc túi tiền tỷ nâng tầm cuộc đua lên tầm cỡ quốc tế!'
  },
  {
    cat: 'shopping',
    titleVi: 'Vé Máy Bay Thương Gia Đi Milan Xem Tuần Lễ Thời Trang',
    titleEn: 'First-Class Milan Fashion Week Passes',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chỗ ngồi VIP trên thảm đỏ tuần lễ thời trang Milan'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'first-class milan fashion week passes'}! A high-stakes speed war erupts.`,
    hookVi: 'Tới Milan với phong cách của một chiến thần tốc độ đích thực!',
    hookEn: 'Tới Milan với phong cách của một chiến thần tốc độ đích thực!'
  },
  {
    cat: 'shopping',
    titleVi: 'Phiếu Giảm Giá 50 Triệu Mua Đồ Nội Thất Cao Cấp',
    titleEn: 'Luxury Furniture Mega Discount Voucher',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'voucher mua sắm phòng khách hoàng gia sắp hết hạn'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'luxury furniture mega discount voucher'}! A high-stakes speed war erupts.`,
    hookVi: 'Lướt sóng nhựa đường rinh trọn phòng khách hoàng gia!',
    hookEn: 'Lướt sóng nhựa đường rinh trọn phòng khách hoàng gia!'
  },
  {
    cat: 'shopping',
    titleVi: 'Đấu Giá Bức Tranh Nghệ Thuật Triệu Đô Giờ Chót',
    titleEn: 'Million-Dollar Art Auction Last Call',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tiếng gõ búa lần thứ hai của phiên đấu giá nghệ thuật'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'million-dollar art auction last call'}! A high-stakes speed war erupts.`,
    hookVi: 'Chặn đứng búa đấu giá bằng vận tốc tên lửa đạn đạo!',
    hookEn: 'Chặn đứng búa đấu giá bằng vận tốc tên lửa đạn đạo!'
  },
  {
    cat: 'shopping',
    titleVi: 'Mẻ Nước Hoa Pháp Phiên Bản Hoàng Gia Giới Hạn',
    titleEn: 'Royal Limited Edition French Perfume',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'lọ nước hoa cuối cùng mang mùi hương vương giả'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'royal limited edition french perfume'}! A high-stakes speed war erupts.`,
    hookVi: 'Mùi hương quý tộc dẫn lối những pha ôm cua không tưởng!',
    hookEn: 'Mùi hương quý tộc dẫn lối những pha ôm cua không tưởng!'
  },
  {
    cat: 'police',
    titleVi: 'Biệt Đội Xe Cứu Hộ Chuẩn Bị Cẩu Toàn Bộ Xe',
    titleEn: 'Tow Truck Squad Impound Trap',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'dàn xe cứu hộ cẩu kéo đang áp sát bãi đậu xe sai quy định'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'tow truck squad impound trap'}! A high-stakes speed war erupts.`,
    hookVi: 'Giải cứu dàn xế hộp bạc triệu trước mũi xe cứu hộ 116!',
    hookEn: 'Giải cứu dàn xế hộp bạc triệu trước mũi xe cứu hộ 116!'
  },
  {
    cat: 'police',
    titleVi: 'Chốt Đo Nồng Độ Cồn Đột Xuất Ven Đại Lộ',
    titleEn: 'Midnight Checkpoint Radar Ambush',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chốt kiểm tra giao thông yêu cầu dừng xe kiểm tra giấy tờ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'midnight checkpoint radar ambush'}! A high-stakes speed war erupts.`,
    hookVi: 'Pha né chốt điệu nghệ đi vào lịch sử ngành đua xe!',
    hookEn: 'Pha né chốt điệu nghệ đi vào lịch sử ngành đua xe!'
  },
  {
    cat: 'police',
    titleVi: 'Nốt Đỗ Xe Cuối Cùng Ở Hầm Trung Tâm Mùa Nắng 45 Độ',
    titleEn: 'Last Shaded Underground Parking Space',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chỗ đỗ râm mát duy nhất dưới tầng hầm giữa trưa hè bỏng rát'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'last shaded underground parking space'}! A high-stakes speed war erupts.`,
    hookVi: 'Tranh chiếc chuồng đỗ xe râm mát như tranh đoạt ngai vàng!',
    hookEn: 'Tranh chiếc chuồng đỗ xe râm mát như tranh đoạt ngai vàng!'
  },
  {
    cat: 'police',
    titleVi: 'Trọng Tài VAR Đuổi Theo Rút Thẻ Phạt Kỷ Luật',
    titleEn: 'VAR Official High-Speed Red Card Pursuit',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'trọng tài trên xe an toàn đang vẫy thẻ đỏ đòi đình chỉ thi đấu'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'var official high-speed red card pursuit'}! A high-stakes speed war erupts.`,
    hookVi: 'Tẩu thoát khỏi thẻ phạt của trọng tài VAR bằng Mach 1!',
    hookEn: 'Tẩu thoát khỏi thẻ phạt của trọng tài VAR bằng Mach 1!'
  },
  {
    cat: 'police',
    titleVi: 'Bác Bảo Vệ Khu Biệt Thự Khóa Cổng Xích Lúc 10 Giờ',
    titleEn: 'Locked Villa Gates Sidewalk Exile',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bác bảo vệ chuẩn bị tra ổ khóa xích cổng khu đô thị'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'locked villa gates sidewalk exile'}! A high-stakes speed war erupts.`,
    hookVi: 'Về trước giờ đóng cổng sắt nếu không muốn ngủ ngoài đường!',
    hookEn: 'Về trước giờ đóng cổng sắt nếu không muốn ngủ ngoài đường!'
  },
  {
    cat: 'police',
    titleVi: 'Thiết Bị Khóa Bánh Xe Của Ban Quản Lý Chung Cư',
    titleEn: 'Wheel Clamp Enforcer In Pursuit',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nhân viên quản lý đang cầm kẹp khóa bánh xe rình rập'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'wheel clamp enforcer in pursuit'}! A high-stakes speed war erupts.`,
    hookVi: 'Chạy nhanh hơn cả tốc độ vặn ốc của nhân viên khóa bánh!',
    hookEn: 'Chạy nhanh hơn cả tốc độ vặn ốc của nhân viên khóa bánh!'
  },
  {
    cat: 'police',
    titleVi: 'Đội Tuần Tra Giao Thông Yêu Cầu Xuất Trình Giấy Tờ',
    titleEn: 'Expressway Highway Patrol Pursuit',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'còi hụ inh ỏi phía sau đòi kiểm tra bằng lái và đăng kiểm'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'expressway highway patrol pursuit'}! A high-stakes speed war erupts.`,
    hookVi: 'Đưa cuộc rượt đuổi lên sàn đấu tốc độ đỉnh cao của thế giới!',
    hookEn: 'Đưa cuộc rượt đuổi lên sàn đấu tốc độ đỉnh cao của thế giới!'
  },
  {
    cat: 'police',
    titleVi: 'Camera Phạt Nguội Tự Động Bắn Tốc Độ Đỉnh Đèo',
    titleEn: 'Speed Trap Radar Flash On The Mountain Pass',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hệ thống camera phạt nguội ghi nhận vận tốc không tưởng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'speed trap radar flash on the mountain pass'}! A high-stakes speed war erupts.`,
    hookVi: 'Phá vỡ giới hạn máy đo tốc độ tự động trên đỉnh đèo!',
    hookEn: 'Phá vỡ giới hạn máy đo tốc độ tự động trên đỉnh đèo!'
  },
  {
    cat: 'police',
    titleVi: 'Biên Bản Phạt Lấn Làn Đang Được Soạn Thảo',
    titleEn: 'Lane Violation Citation Draft In Progress',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tập biên bản vi phạm giao thông đang chờ chữ ký kẻ thua cuộc'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'lane violation citation draft in progress'}! A high-stakes speed war erupts.`,
    hookVi: 'Né tờ biên bản phạt bằng cách cán đích đầu tiên!',
    hookEn: 'Né tờ biên bản phạt bằng cách cán đích đầu tiên!'
  },
  {
    cat: 'police',
    titleVi: 'Trạm Cân Tải Trọng Đột Xuất Đòi Khám Xe Đua',
    titleEn: 'Weigh Station Inspection Ambush',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'trạm cân tải trọng nghi ngờ xe độ quá công suất cho phép'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'weigh station inspection ambush'}! A high-stakes speed war erupts.`,
    hookVi: 'Vút qua trạm kiểm tra như một bóng ma vô hình!',
    hookEn: 'Vút qua trạm kiểm tra như một bóng ma vô hình!'
  },
  {
    cat: 'police',
    titleVi: 'Còi Báo Động An Ninh Trung Tâm Đô Thị Hú Vang',
    titleEn: 'Citywide Gridlock Security Alarm Alert',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hệ thống an ninh phong tỏa các ngả đường ra ngoại ô'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'citywide gridlock security alarm alert'}! A high-stakes speed war erupts.`,
    hookVi: 'Xuyên thủng vòng vây an ninh đô thị bằng kỹ thuật drift đỉnh cao!',
    hookEn: 'Xuyên thủng vòng vây an ninh đô thị bằng kỹ thuật drift đỉnh cao!'
  },
  {
    cat: 'police',
    titleVi: 'Thanh Tra Môi Trường Đo Nồng Độ Khói Ống Xả',
    titleEn: 'Emissions Inspector Chasing The Exhaust Flame',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'đội kiểm tra khí thải đòi phạt chiếc xe phụt lửa sau đuôi'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'emissions inspector chasing the exhaust flame'}! A high-stakes speed war erupts.`,
    hookVi: 'Ngọn lửa ống xả biến thành động cơ phản lực bất khả chiến bại!',
    hookEn: 'Ngọn lửa ống xả biến thành động cơ phản lực bất khả chiến bại!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Nhuộm Tóc Hồng Cánh Sen Mặc Váy Ba-lê',
    titleEn: 'The Neon Pink Hair & Tutu Press Conference Bet',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kèo cá cược: kẻ thua phải nhuộm tóc hồng và mặc váy tutu họp báo'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the neon pink hair & tutu press conference bet'}! A high-stakes speed war erupts.`,
    hookVi: 'Để không phải diện váy hồng trước triệu khán giả, chân ga bị ép lún sàn!',
    hookEn: 'Để không phải diện váy hồng trước triệu khán giả, chân ga bị ép lún sàn!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Cạo Trọc Đầu Livestream Múa Quạt 8 Tiếng',
    titleEn: 'The Bald Head & Viral Fan Dance Livestream',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua trận phải cạo sạch tóc và múa quạt suốt 8 tiếng trực tiếp'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the bald head & viral fan dance livestream'}! A high-stakes speed war erupts.`,
    hookVi: 'Bảo vệ mái tóc triệu đô bồng bềnh bằng mọi giá trên từng mét cua!',
    hookEn: 'Bảo vệ mái tóc triệu đô bồng bềnh bằng mọi giá trên từng mét cua!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Rửa Xe Và Bơm Lốp Cho Cả Đội Suốt 1 Năm',
    titleEn: 'One Year Indentured Pitlane Washing Duty',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua cuộc phải làm culi lau xe bơm lốp không công 365 ngày'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'one year indentured pitlane washing duty'}! A high-stakes speed war erupts.`,
    hookVi: 'Tránh kiếp làm thợ rửa xe cả năm, các siêu sao ghì chặt vô-lăng!',
    hookEn: 'Tránh kiếp làm thợ rửa xe cả năm, các siêu sao ghì chặt vô-lăng!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Mặc Đồ Mascot Khủng Long Đi Tập Bóng Suốt Tuần',
    titleEn: 'Dinosaur Mascot Suit Training Punishment',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kẻ thua phải mặc đồ khủng long bông khổng lồ ra sân tập'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'dinosaur mascot suit training punishment'}! A high-stakes speed war erupts.`,
    hookVi: 'Không muốn hóa thân thành khủng long tấu hài, tay lái siết chặt!',
    hookEn: 'Không muốn hóa thân thành khủng long tấu hài, tay lái siết chặt!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Đi Xe Đạp Cút Kít 3 Bánh Đi Dự Sự Kiện Gala',
    titleEn: 'Toddler Tricycle Red Carpet Arrival Bet',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua cuộc phải cưỡi xe đạp trẻ em ba bánh lên thảm đỏ Quả Bóng Vàng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'toddler tricycle red carpet arrival bet'}! A high-stakes speed war erupts.`,
    hookVi: 'Giữ gìn thể diện quý ông trên thảm đỏ bằng chiến thắng áp đảo!',
    hookEn: 'Giữ gìn thể diện quý ông trên thảm đỏ bằng chiến thắng áp đảo!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Đăng Video Hát Tỏ Tình Với Bác Bảo Vệ Lên Mạng',
    titleEn: 'Serenading The Security Guard Viral Video',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua phải quay video hát tình ca tặng bác bảo vệ chung cư'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'serenading the security guard viral video'}! A high-stakes speed war erupts.`,
    hookVi: 'Màn đánh cược thể diện lớn nhất trong lịch sử các huyền thoại!',
    hookEn: 'Màn đánh cược thể diện lớn nhất trong lịch sử các huyền thoại!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Bị Tịch Thu Toàn Bộ Điện Thoại Xài Máy Cục Gạch',
    titleEn: 'Smartphone Confiscation & Dumbphone Downgrade',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua trận phải nộp smartphone và xài máy bàn cổ điển 6 tháng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'smartphone confiscation & dumbphone downgrade'}! A high-stakes speed war erupts.`,
    hookVi: 'Nỗi sợ mất kết nối mạng xã hội thôi thúc tinh thần chiến đấu!',
    hookEn: 'Nỗi sợ mất kết nối mạng xã hội thôi thúc tinh thần chiến đấu!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Uống Hết Nước Lẩu Chua Cay Trước Toàn Đội',
    titleEn: 'Drinking The Spicy Broth Team Challenge',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kẻ thua phải húp cạn bát nước lẩu ớt hiểm trước mắt đồng đội'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'drinking the spicy broth team challenge'}! A high-stakes speed war erupts.`,
    hookVi: 'Bảo vệ dạ dày trước bát nước lẩu cay xé họng!',
    hookEn: 'Bảo vệ dạ dày trước bát nước lẩu cay xé họng!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Đi Giày Cao Gót 15 Phân Lái Siêu Xe Về Nhà',
    titleEn: 'High Heels Driving Challenge Bet',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kẻ thua phải mang giày cao gót nữ điều khiển bàn đạp ga'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'high heels driving challenge bet'}! A high-stakes speed war erupts.`,
    hookVi: 'Một ván cược danh dự mà không người đàn ông nào muốn thất bại!',
    hookEn: 'Một ván cược danh dự mà không người đàn ông nào muốn thất bại!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Cõng Trợ Lý HLV Chạy 20 Vòng Sân Vận Động',
    titleEn: 'Carrying Assistant Coach For 20 Stadium Laps',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua cuộc phải cõng người nặng 90kg chạy bộ giữa trưa hè'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'carrying assistant coach for 20 stadium laps'}! A high-stakes speed war erupts.`,
    hookVi: 'Cơ bắp căng cứng vì nỗi sợ 20 vòng cõng người trừng phạt!',
    hookEn: 'Cơ bắp căng cứng vì nỗi sợ 20 vòng cõng người trừng phạt!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Đổi Tên Tài Khoản Thành Kẻ Về Nhì Mãi Mãi',
    titleEn: 'Forever Second Place Social Media Rename',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thua trận phải đổi bio tài khoản mạng xã hội thành danh xưng nhục nhã'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'forever second place social media rename'}! A high-stakes speed war erupts.`,
    hookVi: 'Không bao giờ chấp nhận danh xưng kẻ về nhì trong sự nghiệp!',
    hookEn: 'Không bao giờ chấp nhận danh xưng kẻ về nhì trong sự nghiệp!'
  },
  {
    cat: 'bet',
    titleVi: 'Kèo Nộp 100% Lương Tháng Này Vào Quỹ Ăn Vặt',
    titleEn: 'Monthly Salary Surrender To Snack Fund',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kẻ thua phải chuyển toàn bộ tiền lương triệu euro vào quỹ ăn chơi'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'monthly salary surrender to snack fund'}! A high-stakes speed war erupts.`,
    hookVi: 'Tiền bạc và danh dự hội tụ trong phát đạn nước rút cuối cùng!',
    hookEn: 'Tiền bạc và danh dự hội tụ trong phát đạn nước rút cuối cùng!'
  },
  {
    cat: 'gaming',
    titleVi: 'Tranh Cãi Chỉ Số Tốc Độ 99 Trong Tựa Game Bóng Đá',
    titleEn: 'The 99 Pace Rating Video Game Dispute',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'nhà phát hành hạ chỉ số chạy nhanh khiến hai ngôi sao nổi đóa'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 99 pace rating video game dispute'}! A high-stakes speed war erupts.`,
    hookVi: 'Phân định ai xứng đáng danh hiệu chiến thần tốc độ thực tế!',
    hookEn: 'Phân định ai xứng đáng danh hiệu chiến thần tốc độ thực tế!'
  },
  {
    cat: 'gaming',
    titleVi: 'Kèo Trả Thù Bàn Thua Bù Giờ Phút 90+6 Oan Nghiệt',
    titleEn: 'The 96th-Minute Penalty Revenge Feud',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'quả penalty tranh cãi đêm qua được đưa lên trường đua thanh toán'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 96th-minute penalty revenge feud'}! A high-stakes speed war erupts.`,
    hookVi: 'Rửa sạch mối thù sân cỏ bằng tốc độ 600 km/h rực lửa!',
    hookEn: 'Rửa sạch mối thù sân cỏ bằng tốc độ 600 km/h rực lửa!'
  },
  {
    cat: 'gaming',
    titleVi: 'Tranh Chấp Chiếc Cúp Vô Địch Giải Đấu FIFA Online',
    titleEn: 'Esports Championship Trophy Rivalry',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'trận chung kết giải game online bị hòa và chuyển sang đua xe thật'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'esports championship trophy rivalry'}! A high-stakes speed war erupts.`,
    hookVi: 'Từ bàn phím chuyển sang vô-lăng sợi carbon chân thực!',
    hookEn: 'Từ bàn phím chuyển sang vô-lăng sợi carbon chân thực!'
  },
  {
    cat: 'gaming',
    titleVi: 'Lời Khiêu Chiến Của Streamer Triệu Sub Đỉnh Bảng',
    titleEn: 'Top Streamer Asphalt Challenge',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'lời thách đấu công khai trên sóng trực tiếp trước 500.000 người'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'top streamer asphalt challenge'}! A high-stakes speed war erupts.`,
    hookVi: 'Đáp lại lời khiêu chiến bằng màn trình diễn lái xe đẳng cấp thế giới!',
    hookEn: 'Đáp lại lời khiêu chiến bằng màn trình diễn lái xe đẳng cấp thế giới!'
  },
  {
    cat: 'gaming',
    titleVi: 'Tài Khoản Rank Cao Nhất Máy Chủ Bị Thách Đấu',
    titleEn: 'Top 1 Server Rank Title Showdown',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'ngôi vương người chơi xuất sắc nhất máy chủ bị lung lay'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'top 1 server rank title showdown'}! A high-stakes speed war erupts.`,
    hookVi: 'Khẳng định vị thế độc tôn bằng tiếng rít lốp rợn người!',
    hookEn: 'Khẳng định vị thế độc tôn bằng tiếng rít lốp rợn người!'
  },
  {
    cat: 'gaming',
    titleVi: 'Cú Đúp Bàn Thắng Ảo Tưởng Bị Đối Thủ Chê Cười',
    titleEn: 'Mocked Trickshot Goal Grudge Match',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'đối thủ cười nhạo pha ghi bàn may mắn trong game bóng đá'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'mocked trickshot goal grudge match'}! A high-stakes speed war erupts.`,
    hookVi: 'Chứng minh tài năng thực chiến không có yếu tố may rủi!',
    hookEn: 'Chứng minh tài năng thực chiến không có yếu tố may rủi!'
  },
  {
    cat: 'gaming',
    titleVi: 'Tranh Chiếc Ghế Chơi Game Công Thái Học Bọc Vàng',
    titleEn: 'Gold-Plated Ergonomic Gaming Chair Duel',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc ghế game bọc da cao cấp duy nhất của phòng giải trí'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'gold-plated ergonomic gaming chair duel'}! A high-stakes speed war erupts.`,
    hookVi: 'Chiếc ngai vàng của phòng game đang chờ chủ nhân xứng đáng!',
    hookEn: 'Chiếc ngai vàng của phòng game đang chờ chủ nhân xứng đáng!'
  },
  {
    cat: 'gaming',
    titleVi: 'Ván Cược Xóa Tài Khoản Game Chơi Suốt 10 Năm',
    titleEn: 'Delete 10-Year Gaming Account Wager',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kẻ thua cuộc phải xóa vĩnh viễn tài khoản game đầy ắp kỷ niệm'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'delete 10-year gaming account wager'}! A high-stakes speed war erupts.`,
    hookVi: 'Tất cả tâm huyết 10 năm được đặt cược trên 4 bánh xe!',
    hookEn: 'Tất cả tâm huyết 10 năm được đặt cược trên 4 bánh xe!'
  },
  {
    cat: 'gaming',
    titleVi: 'Hội Game Thủ Thách Thức Kỷ Lục Thời Gian Vòng Đua',
    titleEn: 'Lap Record Time Trial Leaderboard Challenge',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kỷ lục vòng đua nhanh nhất thế giới đang chờ bị xô đổ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'lap record time trial leaderboard challenge'}! A high-stakes speed war erupts.`,
    hookVi: 'Xô đổ kỷ lục thế giới bằng một vòng đua hoàn hảo không tì vết!',
    hookEn: 'Xô đổ kỷ lục thế giới bằng một vòng đua hoàn hảo không tì vết!'
  },
  {
    cat: 'gaming',
    titleVi: 'Bộ Máy Tính Gaming 2 Tỷ Đồng Treo Thưởng Về Nhất',
    titleEn: 'Supercomputer Gaming Rig Bounty',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'dàn PC tản nhiệt nước dát vàng dành cho tay đua xuất sắc nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'supercomputer gaming rig bounty'}! A high-stakes speed war erupts.`,
    hookVi: 'Cỗ máy công nghệ trong mơ đang thúc giục từng vòng tua máy!',
    hookEn: 'Cỗ máy công nghệ trong mơ đang thúc giục từng vòng tua máy!'
  },
  {
    cat: 'gaming',
    titleVi: 'Cuộc Đua Bù Cho Ván Đấu Bị Rớt Mạng Đáng Tiếc',
    titleEn: 'Disconnect Disconnection Rematch Race',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'mất mạng lúc gay cấn khiến hai tay đua quyết định ra đường đua thật'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'disconnect disconnection rematch race'}! A high-stakes speed war erupts.`,
    hookVi: 'Không còn lỗi mạng, chỉ có kỹ năng lái xe chân thực quyết định!',
    hookEn: 'Không còn lỗi mạng, chỉ có kỹ năng lái xe chân thực quyết định!'
  },
  {
    cat: 'gaming',
    titleVi: 'Biệt Danh Vua Trò Chơi Bị Đối Thủ Nghi Ngờ',
    titleEn: 'King Of Games Title Defense',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'danh xưng huyền thoại thi đấu thể thao điện tử bị thách thức'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'king of games title defense'}! A high-stakes speed war erupts.`,
    hookVi: 'Bảo vệ danh xưng huyền thoại bằng tốc độ rực lửa trên đường nhựa!',
    hookEn: 'Bảo vệ danh xưng huyền thoại bằng tốc độ rực lửa trên đường nhựa!'
  },
  {
    cat: 'music',
    titleVi: 'Cặp Vé VIP Hàng Ghế Đầu Xem Đại Nhạc Hội Quốc Tế',
    titleEn: 'Front-Row VIP Stadium Concert Passes',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cặp vé xem ban nhạc đình đám nhất thế giới biểu diễn tối nay'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'front-row vip stadium concert passes'}! A high-stakes speed war erupts.`,
    hookVi: 'Âm thanh của động cơ hòa cùng giai điệu cuồng nhiệt của buổi concert!',
    hookEn: 'Âm thanh của động cơ hòa cùng giai điệu cuồng nhiệt của buổi concert!'
  },
  {
    cat: 'music',
    titleVi: 'Vị Trí Trung Tâm Thảm Đỏ Lễ Trao Giải Âm Nhạc Toàn Cầu',
    titleEn: 'Global Music Awards Red Carpet Prime Spot',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'vị trí bước xuống xe chụp ảnh đẹp nhất trước rừng ống kính phóng viên'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'global music awards red carpet prime spot'}! A high-stakes speed war erupts.`,
    hookVi: 'Ánh đèn flash và sự chú ý toàn cầu đang chờ đợi người dẫn đầu!',
    hookEn: 'Ánh đèn flash và sự chú ý toàn cầu đang chờ đợi người dẫn đầu!'
  },
  {
    cat: 'music',
    titleVi: 'Cơ Hội Chụp Ảnh Cùng Thần Tượng Âm Nhạc Hàng Đầu',
    titleEn: 'Backstage Photo Opportunity With Mega Pop Star',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'vé vào hậu trường gặp gỡ thần tượng độc quyền duy nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'backstage photo opportunity with mega pop star'}! A high-stakes speed war erupts.`,
    hookVi: 'Gặp gỡ thần tượng bằng pha cán đích không thể ngoạn mục hơn!',
    hookEn: 'Gặp gỡ thần tượng bằng pha cán đích không thể ngoạn mục hơn!'
  },
  {
    cat: 'music',
    titleVi: 'Chiếc Đàn Guitar Điện Có Chữ Ký Của Huyền Thoại Rock',
    titleEn: 'Signed Legendary Rock Electric Guitar Claim',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cây đàn guitar có chữ ký của ngôi sao nhạc rock quá cố'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'signed legendary rock electric guitar claim'}! A high-stakes speed war erupts.`,
    hookVi: 'Giai điệu rock n roll bùng cháy trong từng cú bốc đầu vượt mặt!',
    hookEn: 'Giai điệu rock n roll bùng cháy trong từng cú bốc đầu vượt mặt!'
  },
  {
    cat: 'music',
    titleVi: 'Bộ Tai Nghe Mạ Vàng Của DJ Số 1 Thế Giới',
    titleEn: 'Gold-Plated Master DJ Headphones Bounty',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bộ tai nghe kiểm âm đẳng cấp được trao cho người về đích đầu tiên'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'gold-plated master dj headphones bounty'}! A high-stakes speed war erupts.`,
    hookVi: 'Đắm chìm trong âm thanh tốc độ đỉnh cao của đường đua!',
    hookEn: 'Đắm chìm trong âm thanh tốc độ đỉnh cao của đường đua!'
  },
  {
    cat: 'music',
    titleVi: 'Suất Hát Đơn Ca Mở Màn Đêm Chung Kết Hoa Hậu',
    titleEn: 'Solo Opening Act At The Miss World Finale',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cơ hội biểu diễn trước hàng tỷ khán giả truyền hình trực tiếp'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'solo opening act at the miss world finale'}! A high-stakes speed war erupts.`,
    hookVi: 'Tự tin tỏa sáng trên sân khấu lớn sau chiến thắng rực rỡ!',
    hookEn: 'Tự tin tỏa sáng trên sân khấu lớn sau chiến thắng rực rỡ!'
  },
  {
    cat: 'music',
    titleVi: 'Chiếc Loa Marshall Cổ Điển Cực Hiếm Bị Cầm Nhầm',
    titleEn: 'Vintage Marshall Speaker Custody Duel',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc loa nghe nhạc cổ điển quý giá bị đối thủ mang đi mất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'vintage marshall speaker custody duel'}! A high-stakes speed war erupts.`,
    hookVi: 'Đòi lại món đồ âm thanh yêu thích bằng cú tạt đầu sấm sét!',
    hookEn: 'Đòi lại món đồ âm thanh yêu thích bằng cú tạt đầu sấm sét!'
  },
  {
    cat: 'music',
    titleVi: 'Lời Hẹn Cùng Đi Xem Lễ Hội Âm Nhạc Tomorrowland',
    titleEn: 'Tomorrowland Festival VIP Helicopter Ride',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chuyến trực thăng hạ cánh xuống đại lễ hội âm nhạc điện tử'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'tomorrowland festival vip helicopter ride'}! A high-stakes speed war erupts.`,
    hookVi: 'Bay đến Tomorrowland với tư cách nhà vô địch bất khả chiến bại!',
    hookEn: 'Bay đến Tomorrowland với tư cách nhà vô địch bất khả chiến bại!'
  },
  {
    cat: 'music',
    titleVi: 'Đĩa Than Gốc Bản Độc Nhất Vô Nhị Đang Cháy Hàng',
    titleEn: 'One-Of-A-Kind Vinyl Record Chase',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc đĩa than âm nhạc cổ điển duy nhất được rao bán hôm nay'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'one-of-a-kind vinyl record chase'}! A high-stakes speed war erupts.`,
    hookVi: 'Sở hữu báu vật âm nhạc bằng tinh thần thép trên đường đèo!',
    hookEn: 'Sở hữu báu vật âm nhạc bằng tinh thần thép trên đường đèo!'
  },
  {
    cat: 'music',
    titleVi: 'Sân Khấu Riêng Cho Người Chiến Thắng Nhảy Flashmob',
    titleEn: 'Winner Exclusive Flashmob Stage Performance',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'sân khấu trung tâm quảng trường dành cho người về nhất ăn mừng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'winner exclusive flashmob stage performance'}! A high-stakes speed war erupts.`,
    hookVi: 'Khoảnh khắc ăn mừng cuồng nhiệt đang chờ đón kẻ xứng đáng!',
    hookEn: 'Khoảnh khắc ăn mừng cuồng nhiệt đang chờ đón kẻ xứng đáng!'
  },
  {
    cat: 'music',
    titleVi: 'Tấm Vé VIP Đi Chung Chuyên Cơ Cùng Ban Nhạc K-Pop',
    titleEn: 'Private Jet Flight With Top K-Pop Group',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chuyến bay chuyên cơ sang chảnh cùng các thần tượng xứ kim chi'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'private jet flight with top k-pop group'}! A high-stakes speed war erupts.`,
    hookVi: 'Tốc độ vượt trội đưa tay đua lên chín tầng mây cùng thần tượng!',
    hookEn: 'Tốc độ vượt trội đưa tay đua lên chín tầng mây cùng thần tượng!'
  },
  {
    cat: 'music',
    titleVi: 'Chiếc Micro Mạ Bạch Kim Của Diva Huyền Thoại',
    titleEn: 'Platinum Microphone Of The Legendary Diva',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'món quà danh giá dành riêng cho tài năng xuất chúng nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'platinum microphone of the legendary diva'}! A high-stakes speed war erupts.`,
    hookVi: 'Cầm micro chiến thắng cất cao giọng ca của kẻ thống trị!',
    hookEn: 'Cầm micro chiến thắng cất cao giọng ca của kẻ thống trị!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Đổ Nhầm 10 Lon Nước Tăng Lực Vào Bình Nhiên Liệu',
    titleEn: 'Energy Drink Poured In The Fuel Tank',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thợ máy đổ nhầm nước tăng lực khiến động cơ tăng vọt 850 mã lực'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'energy drink poured in the fuel tank'}! A high-stakes speed war erupts.`,
    hookVi: 'Động cơ uống nước tăng lực đang rú lên như quái thú sổng chuồng!',
    hookEn: 'Động cơ uống nước tăng lực đang rú lên như quái thú sổng chuồng!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Lắp Nhầm Cánh Gió Máy Bay Quân Sự Siêu Thanh',
    titleEn: 'Fighter Jet Supersonic Tail Wing Glitch',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cánh gió máy bay chiến đấu khiến chiếc xe bay là là mặt đất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'fighter jet supersonic tail wing glitch'}! A high-stakes speed war erupts.`,
    hookVi: 'Biến xe đua thành phi thuyền phản lực xé toạc không gian!',
    hookEn: 'Biến xe đua thành phi thuyền phản lực xé toạc không gian!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Van Xả Nitro Bị Kẹt Ở Chế Độ Siêu Tăng Áp 200%',
    titleEn: 'Stuck Overboost Nitro Purge Catastrophe',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'khí nitro tuôn trào không ngừng khiến tốc độ mất kiểm soát'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'stuck overboost nitro purge catastrophe'}! A high-stakes speed war erupts.`,
    hookVi: 'Lao đi như tên lửa hành trình xuyên thủng mọi định luật vật lý!',
    hookEn: 'Lao đi như tên lửa hành trình xuyên thủng mọi định luật vật lý!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Hệ Thống Phanh Bị Tháo Nhầm Dầu Trước Trận Đua',
    titleEn: 'Disconnected Brake Line Panic Dash',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'thợ sửa xe quên châm dầu thắng, chỉ còn biết dựa vào kỹ năng drift'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'disconnected brake line panic dash'}! A high-stakes speed war erupts.`,
    hookVi: 'Không phanh, không lùi bước, chỉ có tiến về phía trước sống còn!',
    hookEn: 'Không phanh, không lùi bước, chỉ có tiến về phía trước sống còn!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Bộ Vi Sai Khóa Chặt Khiến Xe Luôn Ở Thế Drift 90 Độ',
    titleEn: 'Permanently Welded Differential Drift Lock',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bộ vi sai bị hàn chết khiến chiếc xe trượt ngang liên tục tuyệt đẹp'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'permanently welded differential drift lock'}! A high-stakes speed war erupts.`,
    hookVi: 'Màn biểu diễn drift ngang đỉnh cao nghệ thuật của thế kỷ!',
    hookEn: 'Màn biểu diễn drift ngang đỉnh cao nghệ thuật của thế kỷ!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Lốp Xe Bị Bơm Nhầm Khí Heli Bay Lơ Lửng',
    titleEn: 'Helium Inflated Floating Wheels Malfunction',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'lốp xe nhẹ bẫng khiến gầm xe lướt trên không trung như đệm khí'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'helium inflated floating wheels malfunction'}! A high-stakes speed war erupts.`,
    hookVi: 'Bay bổng trên mặt đường nhựa với tốc độ không tưởng!',
    hookEn: 'Bay bổng trên mặt đường nhựa với tốc độ không tưởng!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Hệ Thống Ống Xả Phụt Lửa Nướng Chín Sơn Xe Đối Thủ',
    titleEn: 'Flamethrower Exhaust Paint Scorcher',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'ngọn lửa phụt dài 3 mét từ ống xả uy hiếp chiếc xe phía sau'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'flamethrower exhaust paint scorcher'}! A high-stakes speed war erupts.`,
    hookVi: 'Hỏa ngục rực sáng sau đuôi xe, thiêu đốt mọi nỗ lực bám đuổi!',
    hookEn: 'Hỏa ngục rực sáng sau đuôi xe, thiêu đốt mọi nỗ lực bám đuổi!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Bộ Loa Siêu Trầm Phát Nhạc Làm Rung Chấn Cả Khung Xe',
    titleEn: 'Subwoofer Earthquake Chassis Resonance',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tiếng bass cực mạnh làm vỡ toang kính chắn gió tạo hiệu ứng phim hành động'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'subwoofer earthquake chassis resonance'}! A high-stakes speed war erupts.`,
    hookVi: 'Âm thanh rung chuyển đất trời hòa cùng tiếng gầm động cơ!',
    hookEn: 'Âm thanh rung chuyển đất trời hòa cùng tiếng gầm động cơ!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Bảng Đồng Hồ Hiển Thị Bị Lỗi Hiển Thị 999 Km/h',
    titleEn: 'Speedometer Glitched To 999 KMH',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'kim đồng hồ vọt kịch trần tạo áp lực tâm lý tột độ cho người lái'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'speedometer glitched to 999 kmh'}! A high-stakes speed war erupts.`,
    hookVi: 'Con số 999 nhấp nháy thôi thúc cuộc bứt phá vĩ đại nhất!',
    hookEn: 'Con số 999 nhấp nháy thôi thúc cuộc bứt phá vĩ đại nhất!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Động Cơ Điện Tăng Cường Bị Chập Điện Phóng Tia Sét',
    titleEn: 'Short-Circuited Hybrid Electric Lightning Sparks',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'những tia sét xanh phóng ra từ gầm xe tạo cảnh tượng nghẹt thở'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'short-circuited hybrid electric lightning sparks'}! A high-stakes speed war erupts.`,
    hookVi: 'Chiếc xe sấm sét càn quét đường đua như thần thoại hy lạp!',
    hookEn: 'Chiếc xe sấm sét càn quét đường đua như thần thoại hy lạp!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Cửa Xe Bị Kẹt Mở Khiến Gió Thổi Bạt Mạng Bên Trong',
    titleEn: 'Jammed Open Gullwing Door Windstorm',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cánh cửa cánh chim bung mở tạo lực cản khí động học điên cuồng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'jammed open gullwing door windstorm'}! A high-stakes speed war erupts.`,
    hookVi: 'Chống chọi với bão gió trong cabin với ý chí sắt đá!',
    hookEn: 'Chống chọi với bão gió trong cabin với ý chí sắt đá!'
  },
  {
    cat: 'sabotage',
    titleVi: 'Bộ Cảm Biến Cảnh Báo Va Chạm Kêu Rên Không Dứt',
    titleEn: 'Proximity Alarm Continuous Siren Panic',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tiếng còi cảnh báo inh ỏi thúc giục người lái đạp ga tẩu thoát'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'proximity alarm continuous siren panic'}! A high-stakes speed war erupts.`,
    hookVi: 'Bỏ lại tiếng còi báo động phía sau bằng gia tốc xé gió!',
    hookEn: 'Bỏ lại tiếng còi báo động phía sau bằng gia tốc xé gió!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Đào Tẩu Khỏi Đám Đông 50.000 Fan Hâm Mộ Sân Vận Động',
    titleEn: 'Escaping The 50,000 Paddock Fan Mob',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'đám đông người hâm mộ tràn vào đường pitch đòi ôm và chụp ảnh'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'escaping the 50,000 paddock fan mob'}! A high-stakes speed war erupts.`,
    hookVi: 'Pha đào tẩu thế kỷ né tránh hàng vạn ống kính máy ảnh!',
    hookEn: 'Pha đào tẩu thế kỷ né tránh hàng vạn ống kính máy ảnh!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Trận Chiến Vương Quyền Tốc Độ Vũ Trụ Định Mệnh',
    titleEn: 'The Ultimate GOAT Asphalt Showdown',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hai huyền thoại vĩ đại nhất lịch sử phân định ngôi vương tối thượng'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the ultimate goat asphalt showdown'}! A high-stakes speed war erupts.`,
    hookVi: 'Đại chiến giữa các vị thần tốc độ làm rung chuyển mặt đất!',
    hookEn: 'Đại chiến giữa các vị thần tốc độ làm rung chuyển mặt đất!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Cú Nhảy Vượt Qua Cầu Sập Giữa Hai Đỉnh Đèo',
    titleEn: 'Leaping The Collapsed Mountain Bridge Gap',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'chiếc cầu vượt đang mở nhịp, buộc xe phải phóng hết tốc lực để bay qua'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'leaping the collapsed mountain bridge gap'}! A high-stakes speed war erupts.`,
    hookVi: 'Cú bay người không tưởng giữa không trung đi vào huyền thoại!',
    hookEn: 'Cú bay người không tưởng giữa không trung đi vào huyền thoại!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Cuộc Đua Xuyên Qua Hầm Gió Thử Nghiệm Tên Lửa',
    titleEn: 'Rocket Wind Tunnel High-Speed Dash',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hầm thử nghiệm khí động học với sức gió giật 500 km/h ngược chiều'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'rocket wind tunnel high-speed dash'}! A high-stakes speed war erupts.`,
    hookVi: 'Xuyên thủng bức tường gió ngược với sức mạnh động cơ điên cuồng!',
    hookEn: 'Xuyên thủng bức tường gió ngược với sức mạnh động cơ điên cuồng!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Bứt Tốc Trước Khi Sóng Thần Nước Mưa Tràn Vào Đường Đua',
    titleEn: 'Outrunning The Flash Flood Tidal Wave',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'dòng nước lũ xối xả đang tràn ngập góc cua nguy hiểm nhất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'outrunning the flash flood tidal wave'}! A high-stakes speed war erupts.`,
    hookVi: 'Chạy đua với thiên nhiên trong khoảnh khắc sinh tử ngàn cân treo sợi tóc!',
    hookEn: 'Chạy đua với thiên nhiên trong khoảnh khắc sinh tử ngàn cân treo sợi tóc!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Vượt Qua Đám Cháy Dầu Đường Hầm Với Vận Tốc Âm Thanh',
    titleEn: 'Tunnel Inferno Supersonic Breakthrough',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'khói lửa bao trùm đường hầm buộc xe phải lao qua với tốc độ tối đa'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'tunnel inferno supersonic breakthrough'}! A high-stakes speed war erupts.`,
    hookVi: 'Xuyên qua bức tường lửa như một mũi tên rực sáng!',
    hookEn: 'Xuyên qua bức tường lửa như một mũi tên rực sáng!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Cuộc Rượt Đổi Giữa Hai Chiếc Hypercar Đắt Nhất Nhân Loại',
    titleEn: 'Hundred-Million Dollar Hypercar Showdown',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tổng giá trị hai chiếc xe lên tới 100 triệu USD cùng so kè từng cm'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'hundred-million dollar hypercar showdown'}! A high-stakes speed war erupts.`,
    hookVi: 'Cuộc so tài đắt giá nhất hành tinh trên từng khúc cua định mệnh!',
    hookEn: 'Cuộc so tài đắt giá nhất hành tinh trên từng khúc cua định mệnh!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Pha Vượt Mặt Nghẹt Thở Ở Vận Tốc 680 Km/h Đoạn Thẳng',
    titleEn: '680 KMH Main Straight Slipstream Overtake',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'luồng gió hút phía sau đưa chiếc xe bứt phá kỷ lục tốc độ mặt đất'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'680 kmh main straight slipstream overtake'}! A high-stakes speed war erupts.`,
    hookVi: 'Xé toạc rào cản tốc độ mặt đất bằng cú núp gió thần thánh!',
    hookEn: 'Xé toạc rào cản tốc độ mặt đất bằng cú núp gió thần thánh!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Đào Tẩu Khỏi Đội Máy Bay Không Người Lái Săn Tin',
    titleEn: 'Outrunning Swarm Of Paparazzi FPV Drones',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'bầy flycam tốc độ cao đang bám đuổi ghi hình chiếc xe bí mật'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'outrunning swarm of paparazzi fpv drones'}! A high-stakes speed war erupts.`,
    hookVi: 'Cắt đuôi dàn drone săn tin bằng những pha bẻ lái xuất thần!',
    hookEn: 'Cắt đuôi dàn drone săn tin bằng những pha bẻ lái xuất thần!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Chuyến Xe Tốc Hành Giải Cứu Hợp Đồng Bản Quyền Hình Ảnh',
    titleEn: 'Image Rights Multi-Million Contract Delivery',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'tập hồ sơ triệu đô cần ký duyệt trước khi thị trường chuyển nhượng đóng cửa'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'image rights multi-million contract delivery'}! A high-stakes speed war erupts.`,
    hookVi: 'Cứu vãn bản hợp đồng lịch sử bằng tốc độ tên lửa đạn đạo!',
    hookEn: 'Cứu vãn bản hợp đồng lịch sử bằng tốc độ tên lửa đạn đạo!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Cú Drift 720 Độ Hoàn Hảo Tránh Chướng Ngại Vật Bất Ngờ',
    titleEn: 'The 720-Degree Miracle Drift Maneuver',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'hai vòng xoay xe nghệ thuật ở tốc độ cao khiến đối thủ sững sờ'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 720-degree miracle drift maneuver'}! A high-stakes speed war erupts.`,
    hookVi: 'Kỹ năng lái xe siêu phàm làm mãn nhãn hàng triệu người xem!',
    hookEn: 'Kỹ năng lái xe siêu phàm làm mãn nhãn hàng triệu người xem!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Pha Cán Đích Cách Nhau Chỉ Đúng 0.001 Giây Kịch Tính',
    titleEn: 'The 0.001-Second Photo Finish Epic',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'mắt thường không thể phân biệt, cần camera siêu chậm 10.000 FPS'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'the 0.001-second photo finish epic'}! A high-stakes speed war erupts.`,
    hookVi: 'Khoảnh khắc lịch sử nghẹt thở phân định bằng một phần nghìn giây!',
    hookEn: 'Khoảnh khắc lịch sử nghẹt thở phân định bằng một phần nghìn giây!'
  },
  {
    cat: 'supersonic',
    titleVi: 'Bức Phá Khỏi Cơn Lốc Xoáy Bụi Sa Mạc Khổng Lồ',
    titleEn: 'Escaping The Giant Desert Dust Vortex',
    descVi: (p: string, a: string, s: string) => `${p} và ${a} chạm trán ${s} khi đang tranh chấp ${'cơn lốc xoáy cát đang nuốt chửng đoạn đường phía sau xe'}! Cuộc đối đầu bùng nổ nghẹt thở trên đường đua.`,
    descEn: (p: string, a: string, s: string) => `${p} and ${a} clashed with ${s} over ${'escaping the giant desert dust vortex'}! A high-stakes speed war erupts.`,
    hookVi: 'Thoát khỏi miệng tử thần sa mạc bằng cú đạp ga dũng mãnh!',
    hookEn: 'Thoát khỏi miệng tử thần sa mạc bằng cú đạp ga dũng mãnh!'
  },
];
