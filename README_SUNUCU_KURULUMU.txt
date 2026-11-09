================================================================================
AUTOSYNC RESOLVE STUDIO - %100 ÜCRETSİZ GÜNCELLEME SUNUCUSU KURULUM REHBERİ
================================================================================

Bu klasör, AutoSync Resolve Studio uygulamasının kurulu olduğu tüm bilgisayarlara 
otomatik ve manuel güncelleme (OTA - Over The Air) dağıtmak için hazırlanmış,
sıfır maliyetli ve tamamen bağımsız güncelleme sunucusudur.

Hiçbir harici kütüphane gerektirmez (pure Node.js).
Görsel bir Yönetim Paneli (Web Admin Dashboard) içerir.

--------------------------------------------------------------------------------
1. SEÇENEK: RENDER.COM İLE BULUTTA %100 ÜCRETSİZ ÇALIŞTIRMA (ÖNERİLEN)
--------------------------------------------------------------------------------
Render.com, Node.js uygulamalarını hiçbir ücret ödemeden ve kredi kartı vermeden 
7/24 çalıştıran popüler bir bulut platformudur. Otomatik HTTPS (SSL) verir.

ADIMLAR:
1. https://render.com adresine gidin ve ücretsiz bir hesap açın (GitHub ile giriş yapabilirsiniz).
2. GitHub'da "autosync-update-server" adında ücretsiz bir depo (repository) oluşturup 
   bu klasörün ("update_server") içindekileri yükleyin.
3. Render.com panelinde "New +" -> "Web Service" seçin.
4. GitHub deponuzu seçin:
   - Runtime: Node
   - Build Command: (boş bırakabilirsiniz veya npm start)
   - Start Command: node server.js
   - Plan: Free ($0/month)
5. "Create Web Service" butonuna tıklayın.
6. Birkaç dakika içinde size özel bir adres oluşturulacaktır:
   Örnek: https://autosync-update.onrender.com

7. ARTIK HAZIR!
   - Yönetim Paneli: https://autosync-update.onrender.com/admin
   - Güncelleme API: https://autosync-update.onrender.com/version.json
   - Windows İndirme: https://autosync-update.onrender.com/download/windows
   - macOS İndirme: https://autosync-update.onrender.com/download/macos

Yeni bir sürüm çıktığında tek yapmanız gereken:
Web tarayıcınızdan Yönetim Paneline (/admin) girip yeni sürüm numarasını ve 
yenilikleri yazıp yeni setup dosyasını yüklemektir!

--------------------------------------------------------------------------------
2. SEÇENEK: GITHUB RELEASES İLE ÇALIŞTIRMA (ALTERNATİF %100 ÜCRETSİZ CDN)
--------------------------------------------------------------------------------
Sunucu çalıştırmak istemiyorsanız, doğrudan GitHub'ın kendi altyapısını 
ücretsiz bir indirme ve sürüm sunucusu olarak kullanabilirsiniz:

1. GitHub'da bir depo açın.
2. `version.json` dosyasını depoya yükleyin.
   Raw linki: https://raw.githubusercontent.com/KULLANICI_ADI/DEPO/main/version.json
3. Windows Setup ve macOS Setup dosyalarını GitHub "Releases" sekmesinde yeni bir 
   sürüm (ör: v3.2.0) oluşturup yükleyin.
4. `version.json` içindeki `downloadUrl` alanlarına bu GitHub indirme linklerini yazın.
5. Kullanıcıların bilgisayarları bu linkten kontrol eder ve güncellemeyi çeker.

--------------------------------------------------------------------------------
3. SEÇENEK: KENDİ BİLGİSAYARINIZDA VEYA YEREL AĞDA ÇALIŞTIRMA
--------------------------------------------------------------------------------
Ofisinizdeki veya stüdyonuzdaki bilgisayarlar için kendi bilgisayarınızı 
güncelleme sunucusu yapabilirsiniz:

1. Bu klasördeki `BASLAT_GUNCELLEME_SUNUCUSU.bat` dosyasına çift tıklayın.
2. Tarayıcınızda otomatik olarak "http://localhost:8080/admin" paneli açılacaktır.
3. Aynı Wi-Fi veya ofis ağındaki diğer bilgisayarlar, sizin yerel IP adresiniz üzerinden 
   (Örn: http://192.168.1.50:8080/version.json) güncellemeleri otomatik olarak alır.

İnternete ücretsiz açmak için:
- Cloudflare Tunnel (cloudflared) veya Ngrok kullanarak tek bir komutla 
  dış dünyaya ücretsiz ve güvenli şekilde açabilirsiniz.

--------------------------------------------------------------------------------
YÖNETİM PANELİ ÖZELLİKLERİ (/admin):
--------------------------------------------------------------------------------
- Canlı sunucu durumu ve aktif sürüm göstergesi.
- Kaç bilgisayarın güncelleme kontrolü yaptığı (Sayaç).
- Kaç kullanıcının yeni kurulum dosyasını indirdiği istatistiği.
- Tek form üzerinden yeni sürüm numarası, başlık, yayın tarihi ve sürüm notları girme.
- Windows (.exe) ve macOS (.command) kurulum dosyalarını tek tıkla yükleme/güncelleme.
- "Sürümü Yayınla" butonuna bastığınız anda tüm kurulu bilgisayarlar yeni güncellemeyi algılar!
================================================================================
