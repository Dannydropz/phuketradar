
import 'dotenv/config';
import { classificationService } from '../server/services/classifier';

async function testClassifier() {
  const text1 = `🟢 #พังงา >> ประกาศตามหาเจ้าของทรัพย์สิน (สร้อยทองคำ) \n\nพบพลเมืองดีเก็บสร้อยทองได้ที่ร้าน 7-Eleven สาขาโรงพยาบาลพังงา...`;
  const text2 = `💥 #ฉลองเปิดร้านใหม่ #สาขาบิ๊กซีภูเก็ต โปรโมชั่นฉลองเปิดร้านใหม่ \n\n #โปรโมชั่นสุดคุ้ม...`;
  
  console.log('Testing Post 1 (Lost & Found):');
  const result1 = await classificationService.isNews(text1);
  console.log(`Is News: ${result1.isNews}`);
  console.log(`Reason: ${result1.reason}`);

  console.log('\nTesting Post 2 (Shop Opening):');
  const result2 = await classificationService.isNews(text2);
  console.log(`Is News: ${result2.isNews}`);
  console.log(`Reason: ${result2.reason}`);
}

testClassifier();
