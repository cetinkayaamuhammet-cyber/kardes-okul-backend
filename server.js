import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ CORS AYARLARI
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS engellendi'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Raw XML body parser
app.use(express.text({ 
  type: ['application/xml', 'text/xml', '*/*']
}));

app.options('/api/send-sms', cors());

// 📱 SMS GÖNDERİM ENDPOINT'İ (MUTLUCELL API)
app.post("/api/send-sms", async (req, res) => {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 YENİ SMS İSTEĞİ ALINDI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Origin:', req.headers.origin || 'N/A');
    console.log('📄 Body Length:', req.body?.length || 0);

    if (!req.body || typeof req.body !== 'string') {
      console.error('❌ Geçersiz XML body');
      return res.status(400).send('<error>Geçersiz XML formatı</error>');
    }

    // XML parametrelerini parse et
    const usernameMatch = req.body.match(/ka="([^"]+)"/);
    const passwordMatch = req.body.match(/pwd="([^"]+)"/);
    const originatorMatch = req.body.match(/org="([^"]+)"/);
    const phoneMatch = req.body.match(/<nums>([^<]+)<\/nums>/);

    console.log('\n🔍 PARAMETRELERİ:');
    console.log('👤 Username:', usernameMatch ? usernameMatch[1] : '❌ YOK');
    console.log('🔐 Password:', passwordMatch ? passwordMatch[1] : '❌ YOK');
    console.log('📢 Originator:', originatorMatch ? originatorMatch[1] : '❌ YOK');
    console.log('📱 Phone:', phoneMatch ? phoneMatch[1] : '❌ YOK');

    // ✅ DOĞRU MUTLUCELL ENDPOINT (sndblkex)
    console.log('\n📡 MUTLUCELL API\'YE GÖNDERİLİYOR...');
    console.log('🔗 Endpoint: https://smsgw.mutlucell.com/smsgw-ws/sndblkex');
    
    const response = await fetch("https://smsgw.mutlucell.com/smsgw-ws/sndblkex", {
      method: "POST",
      headers: { 
        "Content-Type": "application/xml; charset=utf-8",
        "Accept": "application/xml"
      },
      body: req.body
    });

    console.log('📥 HTTP Status:', response.status);

    const responseText = await response.text();
    console.log('\n📡 MUTLUCELL YANITI:');
    console.log(responseText);

    // Yanıt analizi
    const idMatch = responseText.match(/<id>(\d+)<\/id>/);
    const errorMatch = responseText.match(/^(\d+)$/);

    if (idMatch) {
      console.log('✅ BAŞARILI - Job ID:', idMatch[1]);
    } else if (errorMatch) {
      const errorCodes = {
        '20': 'Kullanıcı adı/şifre hatalı',
        '21': 'Yetkilendirme hatası',
        '22': 'Kredi yetersiz',
        '23': 'Geçersiz gönderici başlığı',
        '24': 'Geçersiz telefon',
        '25': 'Mesaj hatası',
        '30': 'Sistem hatası'
      };
      console.log('❌ HATA KODU:', errorMatch[1]);
      console.log('❌ AÇIKLAMA:', errorCodes[errorMatch[1]] || 'Bilinmeyen');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(200)
       .set('Content-Type', 'application/xml; charset=utf-8')
       .send(responseText);

  } catch (error) {
    console.error('\n❌ PROXY HATASI:', error.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).send(`<error>${error.message}</error>`);
  }
});

// 🏥 Health Check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    service: "Mutlucell SMS Proxy",
    endpoint: "https://smsgw.mutlucell.com/smsgw-ws/sndblkex",
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint bulunamadı",
    path: req.path
  });
});

// Sunucu Başlatma
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   🚀 MUTLUCELL SMS PROXY AKTİF      ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`📍 Proxy URL: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📱 SMS API: POST /api/send-sms`);
  console.log(`🔗 Mutlucell: https://smsgw.mutlucell.com/smsgw-ws/sndblkex`);
  console.log('⏰ Başlatma:', new Date().toLocaleString('tr-TR'));
  console.log('═══════════════════════════════════════\n');
});