const fs = require('fs');
const path = require('path');
const https = require('https');
const QRCode = require('qrcode');

function crc16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
        x ^= x >> 4;
        crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag, value) {
    const val = String(value ?? '');
    return tag + String(val.length).padStart(2, '0') + val;
}

function removeVietnameseTones(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function generateVietQREmvCo({ bin, accountNumber, amount, memo }) {
    if (!bin || !accountNumber) return '';
    const cleanBin = String(bin).trim();
    const cleanAccount = String(accountNumber).trim();
    const sub00 = tlv('00', 'A000000727');
    const sub01_00 = tlv('00', cleanBin);
    const sub01_01 = tlv('01', cleanAccount);
    const sub01 = tlv('01', sub01_00 + sub01_01);
    const sub02 = tlv('02', 'QRIBFTTA');
    const tag38 = tlv('38', sub00 + sub01 + sub02);

    const hasAmount = amount && Number(amount) > 0;
    let payload = tlv('00', '01') + tlv('01', hasAmount ? '12' : '11') + tag38 + tlv('53', '704');
    if (hasAmount) {
        payload += tlv('54', String(Math.round(Number(amount))));
    }
    payload += tlv('58', 'VN');
    if (memo) {
        const cleanMemo = removeVietnameseTones(memo).slice(0, 25);
        if (cleanMemo) {
            payload += tlv('62', tlv('08', cleanMemo));
        }
    }
    payload += '6304';
    return payload + crc16(payload);
}

function getVietQRImageUrl({ bin, accountNumber, amount, memo, accountName, template = 'compact2' }) {
    if (!bin || !accountNumber) return '';
    const cleanBin = String(bin).trim();
    const cleanAcc = String(accountNumber).trim();
    const cleanAmount = amount && Number(amount) > 0 ? Math.round(Number(amount)) : 0;
    const cleanMemo = memo ? removeVietnameseTones(memo).slice(0, 25) : '';
    const cleanName = accountName ? removeVietnameseTones(accountName) : '';

    let url = `https://img.vietqr.io/image/${cleanBin}-${cleanAcc}-${template}.png?amount=${cleanAmount}&accountName=${encodeURIComponent(cleanName)}`;
    if (cleanMemo) {
        url += `&addInfo=${encodeURIComponent(cleanMemo)}`;
    }
    return url;
}

function fetchHttpBuffer(url, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            reject(new Error('Fetch timeout'));
        });
        req.on('error', reject);
    });
}

let cachedBanks = null;
function getBanksCatalog() {
    if (!cachedBanks) {
        try {
            const banksPath = path.join(__dirname, '..', 'data', 'banks.json');
            if (fs.existsSync(banksPath)) {
                cachedBanks = JSON.parse(fs.readFileSync(banksPath, 'utf8'));
            }
        } catch (e) {
            cachedBanks = [];
        }
    }
    return cachedBanks || [];
}

function getBankLogoBuffer(bankIdentifier) {
    if (!bankIdentifier) return null;
    const cleanId = String(bankIdentifier).trim().toUpperCase();
    const banks = getBanksCatalog();
    const matchedBank = banks.find(b => 
        String(b.bin || '').trim() === cleanId ||
        String(b.code || '').trim().toUpperCase() === cleanId ||
        String(b.shortName || '').trim().toUpperCase() === cleanId ||
        String(b.short_name || '').trim().toUpperCase() === cleanId ||
        String(b.name || '').trim().toUpperCase() === cleanId
    );

    const checkCodes = new Set();
    checkCodes.add(cleanId);
    if (matchedBank) {
        if (matchedBank.code) checkCodes.add(String(matchedBank.code).trim().toUpperCase());
        if (matchedBank.shortName) checkCodes.add(String(matchedBank.shortName).trim().toUpperCase());
        if (matchedBank.logo) {
            const logoFilename = path.basename(matchedBank.logo, '.png').toUpperCase();
            checkCodes.add(logoFilename);
        }
    }

    const dirs = [
        path.join(__dirname, '..', 'data', 'bank-logos'),
        path.join(__dirname, '..', '..', 'client', 'public', 'bank-logos')
    ];

    for (const code of checkCodes) {
        for (const dir of dirs) {
            const filePath = path.join(dir, `${code}.png`);
            if (fs.existsSync(filePath)) {
                try {
                    return fs.readFileSync(filePath);
                } catch (e) {}
            }
        }
    }
    return null;
}

async function getVietQRImageBuffer({ bin, accountNumber, amount, memo, accountName, bankCode, preferOffline = false }) {
    if (!bin || !accountNumber) return null;

    if (!preferOffline) {
        try {
            const url = getVietQRImageUrl({ bin, accountNumber, amount, memo, accountName, template: 'compact2' });
            if (url) {
                const buffer = await fetchHttpBuffer(url, 3500);
                if (buffer && buffer.length > 500) {
                    return buffer;
                }
            }
        } catch (e) {
            // Fallback to offline generation
        }
    }

    // Offline fallback: generate QR code via QRCode library
    const emvPayload = generateVietQREmvCo({ bin, accountNumber, amount, memo });
    if (emvPayload) {
        try {
            return await QRCode.toBuffer(emvPayload, {
                type: 'png',
                width: 480,
                margin: 2,
                errorCorrectionLevel: 'M'
            });
        } catch (e) {
            console.error('Error generating offline QR:', e);
        }
    }

    return null;
}

async function lookupBankAccount({ bin, accountNumber, workerName, store }) {
    const { lookupAccountWithCas } = require('./cas');
    return await lookupAccountWithCas({ bin, accountNumber, workerName, store });
}

module.exports = {
    crc16,
    tlv,
    removeVietnameseTones,
    generateVietQREmvCo,
    getVietQRImageUrl,
    fetchHttpBuffer,
    getBankLogoBuffer,
    getVietQRImageBuffer,
    lookupBankAccount
};
