// api/check-charge.js
// หน้าเว็บจะเรียกอันนี้ซ้ำๆ ทุก 3 วินาทีเพื่อถามว่า "จ่ายเงินสำเร็จหรือยัง"
// ฟังก์ชันนี้ไปถาม Omise ตรงๆ (ไม่เชื่อคำบอกจากฝั่งลูกค้าเลย)
// และจะคืนลิงก์ดาวน์โหลดก็ต่อเมื่อ Omise ยืนยันว่าเงินเข้าจริงเท่านั้น

// TODO: พี่แก้ลิงก์ตรงนี้เป็นลิงก์ไฟล์จริงของแต่ละสินค้า
// (จะใช้ Google Drive แบบ "ทุกคนที่มีลิงก์ดูได้" ก็ได้ หรือที่เก็บไฟล์อื่นก็ได้)
const DOWNLOAD_LINKS = {
  moonlit: 'https://drive.google.com/PUT_MOONLIT_LINK_HERE',
  daydream: 'https://drive.google.com/PUT_DAYDREAM_LINK_HERE',
  festival: 'https://drive.google.com/PUT_FESTIVAL_LINK_HERE',
  yuna: 'https://drive.google.com/drive/folders/1Vd0QCBCSx54RMV__ZClksl_sB8t1pC6O?usp=sharing',
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ไม่พบรหัสรายการชำระเงิน' });
  }

  const secretKey = process.env.OMISE_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า OMISE_KEY บนเซิร์ฟเวอร์' });
  }

  const auth = Buffer.from(secretKey + ':').toString('base64');

  try {
    const omiseRes = await fetch(`https://api.omise.co/charges/${id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const charge = await omiseRes.json();

    if (charge.object === 'error') {
      return res.status(400).json({ error: charge.message });
    }

    const paid = charge.status === 'successful' && charge.paid === true;
    const productId = charge.metadata?.product_id;

    return res.status(200).json({
      status: charge.status,
      paid,
      downloadUrl: paid ? DOWNLOAD_LINKS[productId] : null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'เชื่อมต่อ Omise ไม่สำเร็จ' });
  }
}
