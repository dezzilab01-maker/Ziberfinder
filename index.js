const axios = require('axios');
const readline = require('readline');
const { SocksProxyAgent } = require('socks-proxy-agent');
const colors = require('colors');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let proxies = [];
let proxyIndex = 0;

async function fetchProxies() {
  try {
    const res = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all');
    const list = res.data.split('\r\n').filter(p => p.length > 0);
    proxies = list.map(p => `socks5://${p}`);
    console.log(colors.green(`Pobrano ${proxies.length} SOCKS5 proxy`));
  } catch {
    console.log(colors.yellow('Nie udało się pobrać proxy, używam fallback'));
    proxies = ['socks5://103.152.112.120:1080', 'socks5://103.152.112.122:1080'];
  }
}

function getProxyAgent() {
  if (proxies.length === 0) return undefined;
  const proxy = proxies[proxyIndex % proxies.length];
  proxyIndex++;
  return new SocksProxyAgent(proxy);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function generateDiscordNames(length) {
  const names = [];
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  while (names.length < 500) {
    let name = '';
    for (let i = 0; i < length; i++) name += chars[Math.floor(Math.random() * chars.length)];
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

function generateTikTokNames(length) {
  const names = [];
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.';
  while (names.length < 500) {
    let name = '';
    for (let i = 0; i < length; i++) {
      if (i === length - 1) name += chars.substring(0, chars.length - 1)[Math.floor(Math.random() * (chars.length - 1))];
      else name += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

async function checkDiscord(username) {
  try {
    const res = await axios.get(`https://discord.com/api/v9/users/${username}`, {
      httpsAgent: getProxyAgent(),
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
    });
    return res.status === 404;
  } catch (err) {
    if (err.response && err.response.status === 404) return true;
    if (err.response && err.response.status === 200) return false;
    return null;
  }
}

async function checkTikTok(username) {
  try {
    const res = await axios.get(`https://www.tiktok.com/@${username}`, {
      httpsAgent: getProxyAgent(),
      timeout: 15000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
    });
    if (res.status === 404) return true;
    if (res.request && res.request.res && res.request.res.responseUrl && res.request.res.responseUrl.includes('not-found')) return true;
    return false;
  } catch (err) {
    if (err.response && err.response.status === 404) return true;
    if (err.response && err.response.status === 200) return false;
    return null;
  }
}

async function main() {
  console.log(colors.blue.bold('=============================='));
  console.log(colors.blue.bold('   ZIBER FINDER'));
  console.log(colors.blue.bold('=============================='));

  console.log(colors.yellow('Pobieranie listy SOCKS5 proxy...'));
  await fetchProxies();

  while (true) {
    console.log('\n' + colors.cyan('[1]') + colors.blue(' Discord'));
    console.log(colors.cyan('[2]') + colors.magenta(' TikTok'));
    console.log(colors.cyan('[3]') + colors.red(' Wyjście'));

    const choice = await new Promise(res => rl.question(colors.yellow('Wybierz opcję (1/2/3): '), res));
    if (choice === '3') { console.log(colors.red('Do widzenia!')); rl.close(); break; }
    if (choice !== '1' && choice !== '2') { console.log(colors.red('Nieprawidłowy wybór!')); continue; }

    const platform = choice === '1' ? 'DISCORD' : 'TIKTOK';
    const colorPlatform = choice === '1' ? colors.blue : colors.magenta;
    console.log(colorPlatform(`Wybrałeś: ${platform}`));

    const length = parseInt(await new Promise(res => rl.question(colors.yellow('Ile znaków? (np. 3): '), res)));
    if (isNaN(length) || length < 2 || length > 15) { console.log(colors.red('Podaj liczbę od 2 do 15.')); continue; }

    console.log(colorPlatform(`Generuję nicki o długości ${length}...`));
    const nicknames = platform === 'DISCORD' ? generateDiscordNames(length) : generateTikTokNames(length);
    console.log(colorPlatform(`Wygenerowano ${nicknames.length} nicków. Sprawdzanie przez SOCKS5 proxy...`));
    console.log(colorPlatform('='.repeat(60)));

    const available = [];
    for (let i = 0; i < nicknames.length; i++) {
      const nick = nicknames[i];
      if (i % 10 === 0 && i > 0) await sleep(300);

      const status = platform === 'DISCORD' ? await checkDiscord(nick) : await checkTikTok(nick);
      if (status === true) {
        available.push(nick);
        console.log(colors.green.bold(`[WOLNE] ${nick}`));
      } else if (status === false) {
        console.log(colors.red.bold(`[ZAJĘTE] ${nick}`));
      } else {
        console.log(colors.yellow(`[NIEZNANE] ${nick}`));
      }
    }

    console.log(colorPlatform('\n' + '='.repeat(60)));
    console.log(colors.green.bold(`Dostępne (${available.length}): ${available.join(', ')}`));
  }
}

main().catch(err => console.error(colors.red(`Błąd: ${err.message}`)));
