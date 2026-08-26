// api/create-charge.js
// เรียกจากหน้าเว็บตอนลูกค้ากด "ซื้อเลย"
// สร้างรายการจ่ายเงินพร้อมเพย์กับ Omise แล้วส่ง QR กลับไปให้หน้าเว็บแสดง
//
// ราคาสินค้าทั้งหมดถูกกำหนดไว้ที่นี่ (ฝั่งเซิร์ฟเวอร์) เท่านั้น
// เพื่อกันไม่ให้ใครมาแก้ราคาจากฝั่งเบราว์เซอร์ได้

const PRODUCTS = {
  moonlit:  { name: 'Moonlit',      amount: 25000 }, // หน่วยสตางค์ = 250 บาท
  daydream: { name: 'Daydream',     amount: 35000 }, // 350 บาท
  Arina: { name: 'เอลีน่า Album',     amount: 6000 }, // 60 บาท
  yuna:     { name: 'ยูนะ Album',    amount: 5000 }, // 50 บาท
  'yuna-live2d': { name: 'ยูนะ Live2D', amount: 89000 }, // 890 บาท — ตัวอย่าง DLC หมวด Live2D ใช้ระบบเดียวกับหมวดภาพเป๊ะๆ แค่คนละ id
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { productId } = req.body || {};
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'ไม่พบสินค้านี้' });
  }

  const secretKey = process.env.OMISE_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า OMISE_KEY บนเซิร์ฟเวอร์' });
  }

  const auth = Buffer.from(secretKey + ':').toString('base64');

  try {
    const omiseRes = await fetch('https://api.omise.co/charges', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: product.amount,
        currency: 'thb',
        source: { type: 'promptpay' },
        metadata: { product_id: productId },
      }),
    });

    const charge = await omiseRes.json();

    if (charge.object === 'error') {
      return res.status(400).json({ error: charge.message || 'สร้างรายการชำระเงินไม่สำเร็จ' });
    }

    const qrUrl = charge.source?.scannable_code?.image?.download_uri;

    if (!qrUrl) {
      return res.status(500).json({ error: 'ไม่พบ QR โค้ดจาก Omise ลองใหม่อีกครั้ง' });
    }

    return res.status(200).json({
      chargeId: charge.id,
      qrUrl,
      amount: product.amount,
      productName: product.name,
    });
  } catch (err) {
    return res.status(500).json({ error: 'เชื่อมต่อ Omise ไม่สำเร็จ ลองใหม่อีกครั้ง' });
  }
}
