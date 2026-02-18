
import { storage } from "../server/storage";

async function checkSubscribers() {
    const email = 'dannyjkeegan@gmail.com';
    const sub = await storage.getSubscriberByEmail(email);
    console.log('--- DATABASE CHECK ---');
    if (sub) {
        console.log(`Found ${email}:`, JSON.stringify(sub, null, 2));
    } else {
        console.log(`${email} NOT found in database.`);
    }

    const all = await storage.getAllActiveSubscribers();
    console.log('\n--- LAST 5 ACTIVE SUBS IN DB ---');
    all.slice(-5).forEach(s => console.log(`- ${s.email} (${(s as any).createdAt || 'no date'})`));
}

checkSubscribers().catch(console.error);
