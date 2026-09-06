-- Turnover is credit/money volume (deposit + bonus), not win/loss.
alter table promo_claims add column if not exists turnover_base numeric(14, 2) not null default 0;

update promotions
set rules = 'ฝากขั้นต่ำ 200 บาท รับโบนัส 200 ต้องทำยอดเครดิต (ยอดฝาก+โบนัส) ตามเท่าที่กำหนด จึงจะถอนได้ นับยอดเงินที่นำไปเล่น ไม่สนได้หรือเสีย',
    updated_at = now()
where id = 'deposit200';

update promotions
set rules = 'โบนัสต้อนรับ 50 บาท ต้องทำยอดเครดิตตามเท่าที่กำหนดก่อนถอน นับยอดเงินที่นำไปเล่น ไม่สนได้หรือเสีย',
    updated_at = now()
where id = 'welcome50';
