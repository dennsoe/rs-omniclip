/**
 * Data demo bawaan fitur "Performa Kampanye" — agar fitur langsung bisa
 * dicoba tanpa file asli. Diport dari repo rs-9.
 */

export const DEMO_META_ADS_CSV = `"Nama iklan",Tanggal,"Waktu (zona waktu akun iklan)","Status Penayangan","Level Penayangan","Jenis hasil",Hasil,"Biaya per hasil","Jumlah yang dibelanjakan (IDR)",Impresi,Jangkauan,"Pengaturan atribusi","Peringkat kualitas","Peringkat nilai interaksi","Peringkat nilai konversi","Nama set iklan","Awal pelaporan","Akhir pelaporan"
G-1-sekolah,2026-07-10,"23:00:00 - 23:59:59",not_delivering,ad,"Klik tautan",703,26.36,18533,3041,2100,"Klik 7 hari atau tayangan 1 hari",-,-,-,G-SHCB,2026-07-10,2026-07-10
G-2-tas,2026-07-10,"23:00:00 - 23:59:59",active,ad,"Klik tautan",450,33.33,15000,2500,1800,"Klik 7 hari atau tayangan 1 hari",-,-,-,G-SHCB,2026-07-10,2026-07-10
G-3-gamis,2026-07-10,"23:00:00 - 23:59:59",active,ad,"Klik tautan",1200,41.66,50000,8000,5600,"Klik 7 hari atau tayangan 1 hari",-,-,-,G-SHCB,2026-07-10,2026-07-10
G-4-sepatu,2026-07-10,"23:00:00 - 23:59:59",active,ad,"Klik tautan",510,68.62,35000,2900,2000,"Klik 7 hari atau tayangan 1 hari",-,-,-,G-SHCB,2026-07-10,2026-07-10
G-5-mukena,2026-07-10,"23:00:00 - 23:59:59",active,ad,"Klik tautan",110,227.27,25000,1200,900,"Klik 7 hari atau tayangan 1 hari",-,-,-,G-SHCB,2026-07-10,2026-07-10`

export const DEMO_SHOPEE_AFFILIATE_CSV = `ID Pemesanan,Status Pesanan,Kode Pesanan Affiliate,Waktu Pemesanan,Waktu Terselesaikan,Waktu Klik,Nama Toko,ID Shop,Tipe toko.,ID Barang,Nama Barange,ID Model,Tipe Produk,ID Promosi,L1 Kategori Global,L2 Kategori Global,L3 Kategori Global,Harga(Rp),Jumlah,Tipe Penawaran,Kampanye Partnerr,Nilai Pembelian(Rp),Jumlah Pengembalian Dana(Rp),Persentase Komisi Shopee pada Produk,Komisi Barang Shopee(Rp),Persentase Komisi XTRA pada Produk,Komisi XTRA Produk(Rp),Total Komisi per Produk(Rp),Komisi Shopee per Pesanan(Rp),Komisi XTRA per Pesanan(Rp),Total Komisi per Pesanan(Rp),Nama MCN Terhubung,ID Kontrak MCN,Persentase Biaya Manajemen MCN,Biaya Manajemen MCN(Rp),Persentase Pembagian Komisi Affiliate,Komisi Bersih Affiliate (Rp),Status Produk Affiliate,Catatan Produk,Tipe Pesanan,Status Pemebelian,Tag_link1,Tag_link2,Tag_link3,Tag_link4,Tag_link5,Platform
260711BP4RCAWG,Tertunda,237401739235815,2026-07-10 23:55:39,,2026-07-10 23:18:25,kenzie_official_store,224672723,Preferred(Non-CB),5142028430,KALUNG SILVER TITANIUM MODEL TAMBANG ANTI KARAT SELAMANYA FASHION,60272820716,Normal Product,,Aksesoris Fashion,Kalung,,12000,1,Komisi XTRA,,12000,,1.50%,180,5.00%,600,780,180,600,780,,0,0.00%,0,100.00%,780,Tertunda,Pesanan sedang diproses. Komisi akan dikonfirmasi setelah pesanan selesai.,Pesanan dari Toko yang tidak Dipromosikan,Ada,sekolah,,,,,Facebook
260711CQ8TASXX,Selesai,237401739235816,2026-07-10 22:15:00,2026-07-11 08:00:00,2026-07-10 21:30:00,tas_lucu_store,345672123,Shopee Mall,98124235,TAS SELEMPANG WANITA KULIT PREMIUM KOREAN STYLE,78912422,Normal Product,,Tas Wanita,Sling Bag,,250000,1,Komisi XTRA,,250000,,10.00%,25000,0.00%,0,25000,25000,0,25000,,0,0.00%,0,100.00%,25000,Selesai,Pesanan selesai. Komisi telah dikonfirmasi.,Pesanan Toko yang Dipromosikan,Ada,tas,,,,,Facebook
260711DQ8GAMYY,Selesai,237401739235817,2026-07-10 21:05:00,2026-07-11 08:30:00,2026-07-10 20:10:00,hijab_beauty_mall,98765412,Shopee Mall,23521234,GAMIS SYARI PREMIUM SILK MEWAH SET JILBAB KHIMAR,1245124,Normal Product,,Pakaian Wanita,Gamis,,400000,1,Komisi XTRA,,400000,,10.00%,40000,0.00%,0,40000,40000,0,40000,,0,0.00%,0,100.00%,40000,Selesai,Pesanan selesai.,Pesanan Toko yang Dipromosikan,Ada,gamis,,,,,Facebook
260711EQ8GAMYY,Tertunda,237401739235818,2026-07-10 21:40:00,,2026-07-10 20:15:00,hijab_beauty_mall,98765412,Shopee Mall,23521234,GAMIS SYARI PREMIUM SILK MEWAH SET JILBAB KHIMAR,1245124,Normal Product,,Pakaian Wanita,Gamis,,400000,1,Komisi XTRA,,400000,,10.00%,40000,0.00%,0,40000,40000,0,40000,,0,0.00%,0,100.00%,40000,Tertunda,Sedang diproses.,Pesanan Toko yang Dipromosikan,Ada,gamis,,,,,Facebook
260711FQ8ORGAN,Selesai,237401739235819,2026-07-10 18:30:00,2026-07-11 09:00:00,2026-07-10 17:00:00,makeup_store,1245125,Preferred,8761245,LIPCREAM MATTE TRANSFERPROOF TAHAN LAMA,1241512,Normal Product,,Kecantikan,Bibir,,45000,1,Komisi Biasa,,45000,,4.00%,1800,0.00%,0,1800,1800,0,1800,,0,0.00%,0,100.00%,1800,Selesai,Konfirmasi.,Pesanan Toko yang Dipromosikan,Ada,,,,,,Platform Organik
260711GQ8GAMYY,Dibatalkan,237401739235820,2026-07-10 20:30:00,,2026-07-10 19:45:00,hijab_beauty_mall,98765412,Shopee Mall,23521234,GAMIS SYARI PREMIUM SILK MEWAH SET JILBAB KHIMAR,1245124,Normal Product,,Pakaian Wanita,Gamis,,400000,1,Komisi XTRA,,400000,,10.00%,40000,0.00%,0,40000,40000,0,40000,,0,0.00%,0,100.00%,40000,Dibatalkan,Pesanan dibatalkan pembeli.,Pesanan Toko yang Dipromosikan,Ada,gamis,,,,,Facebook
260711HQ8SEPA,Dibatalkan,237401739235821,2026-07-10 19:15:00,,2026-07-10 18:30:00,shoes_store,92345123,Preferred,45612345,SEPATU SNEAKERS WANITA KOREAN STYLE TRENDY,891234,Normal Product,,Sepatu Wanita,Sneakers,,150000,1,Komisi Biasa,,150000,,5.00%,7500,0.00%,0,7500,7500,0,7500,,0,0.00%,0,100.00%,7500,Dibatalkan,Pesanan dibatalkan pembeli.,Pesanan Toko yang Dipromosikan,Ada,sepatu,,,,,Facebook`

export const DEMO_SHOPEE_CLICKS_CSV = `Klik ID,Waktu Klik,Wilayah Klik,Tag_link,Perujuk
c11631556af9b71a86f69161183f4758,2026-07-10 23:59:58,Indonesia,sekolah----,Facebook
c21631556af9b71a86f69161183f4759,2026-07-10 23:55:12,Indonesia,sekolah,Facebook
c31631556af9b71a86f69161183f4760,2026-07-10 23:45:10,Indonesia,tas,Facebook
c41631556af9b71a86f69161183f4761,2026-07-10 23:30:15,Indonesia,tas,Instagram
c51631556af9b71a86f69161183f4762,2026-07-10 23:20:00,Indonesia,gamis,Facebook
c61631556af9b71a86f69161183f4763,2026-07-10 23:10:05,Indonesia,gamis,Facebook
c71631556af9b71a86f69161183f4764,2026-07-10 23:00:22,Indonesia,sepatu,Facebook
c81631556af9b71a86f69161183f4765,2026-07-10 22:50:11,Indonesia,sepatu,TikTok
c91631556af9b71a86f69161183f4766,2026-07-10 22:40:02,Indonesia,mukena,Facebook
c10631556af9b71a86f69161183f476,2026-07-10 22:30:00,Indonesia,mukena,Instagram`
