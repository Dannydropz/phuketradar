const title = "ปิดถนนซัดกัน นทท.ภูเก็ต กรรมการมาแยกทัน";
const content = "ปิดถนนซัดกัน นทท.ภูเก็ต กรรมการมาแยกทัน\n.\nคลิป : ยายแล ร้อยล้าน";
const combined = `${title} ${content}`;
const words = combined.trim().split(/\s+/).filter(w => w.length > 0);
console.log("Combined:", combined);
console.log("Words:", words);
console.log("Word Count:", words.length);

const title2 = "📛 แลไม่เห็น แน่เลย !!! #ที่นี่ภูเก็ต";
const content2 = "📛 แลไม่เห็น แน่เลย !!! #ที่นี่ภูเก็ต\nภาพ : Palangtham Laochan";
const combined2 = `${title2} ${content2}`;
const words2 = combined2.trim().split(/\s+/).filter(w => w.length > 0);
console.log("\nCombined 2:", combined2);
console.log("Words 2:", words2);
console.log("Word Count 2:", words2.length);
