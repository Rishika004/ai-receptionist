import { google } from 'googleapis';
import readline from 'readline';
import { config } from 'dotenv';

config({ path: '.env.local' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost',
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar'],
  prompt: 'consent',
});

console.log('\n👉 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nAfter authorizing, Google will redirect to http://localhost?code=XXXX');
console.log('The page will fail to load — that is expected.');
console.log('Copy the "code" value from the URL in the address bar.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(decodeURIComponent(code));
    console.log('\n✅ Add this to your .env.local:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('\n❌ Failed to exchange code:', err.message);
  }
  rl.close();
});
