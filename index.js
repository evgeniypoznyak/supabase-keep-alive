const urls = [
  'https://prompt.softery.io',
  'https://recipe.softery.io',
  'https://vkusnyashki.poznyaks.com',
  'https://evgeniy.poznyaks.com',
  'https://oydwzeanlzbmsfzyogia.supabase.co/functions/v1/health',
  'https://gdfuyaubwqvmdqdlwajv.supabase.co/functions/v1/health',
  'https://hqjwcvszyxdtkoiqtzza.supabase.co/functions/v1/keep-alive'
];

async function keepAlive() {
  console.log('🚀 Starting keep-alive pings...');
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${url}: ${response.status} ${response.statusText}`);
      } else {
        console.warn(`⚠️ ${url}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ ${url} failed:`, error.message);
    }
  }
  
  console.log('🏁 Keep-alive pings finished.');
}

keepAlive();
