const fs = require('fs');
const path = require('path');

const CAS_SANDBOX_URL = 'https://sandbox.bankhub.dev';
const CAS_PROD_URL = 'https://production.bankhub.dev';
const VIETQR_API_URL = 'https://api.vietqr.io';

/**
 * Lấy cấu hình Cas / VietQR từ biến môi trường hoặc file data/settings.json
 */
function getCasCredentials() {
    let clientId = process.env.CAS_CLIENT_ID || process.env.VIETQR_CLIENT_ID || '';
    let secretKey = process.env.CAS_SECRET_KEY || process.env.VIETQR_API_KEY || '';
    let environment = process.env.CAS_ENV || 'production';

    try {
        const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            clientId = clientId || settings.casClientId || settings.vietqrClientId || '';
            secretKey = secretKey || settings.casSecretKey || settings.vietqrApiKey || '';
            environment = settings.casEnvironment || environment;
        }
    } catch (e) {
        console.error('Error reading settings for Cas credentials:', e.message);
    }

    return { clientId: clientId.trim(), secretKey: secretKey.trim(), environment };
}

/**
 * Kiểm tra xác thực thông tin Client ID & Secret Key với Cas / VietQR
 */
async function verifyCasConnection({ clientId, secretKey, environment = 'production' }) {
    if (!clientId || !secretKey) {
        return {
            success: false,
            message: 'Vui lòng cung cấp đầy đủ Client ID và Secret Key / API Key'
        };
    }

    const trimmedClientId = clientId.trim();
    const trimmedSecretKey = secretKey.trim();
    const baseUrl = environment === 'sandbox' ? CAS_SANDBOX_URL : CAS_PROD_URL;

    // 1. Kiểm tra với Cas / bankHub
    try {
        const casRes = await fetch(`${baseUrl}/grant/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': trimmedClientId,
                'x-secret-key': trimmedSecretKey
            },
            body: JSON.stringify({ scopes: ['identity'] }),
            signal: AbortSignal.timeout(6000)
        });

        const casData = await casRes.json().catch(() => null);

        if (casRes.ok && (casData?.grantToken || casData?.token)) {
            return {
                success: true,
                service: 'cas',
                message: `Kết nối thành công đến Cas Open Banking (${environment === 'sandbox' ? 'Sandbox' : 'Production'})!`,
                environment
            };
        }

        if (casData && casData.errorCode) {
            if (casData.errorCode === 'CLIENT_NOT_FOUND') {
                // Thử kiểm tra tiếp với VietQR xem đây có phải là khóa API của VietQR / Casso hay không
                const vietqrCheck = await checkVietQrCredentials(trimmedClientId, trimmedSecretKey);
                if (vietqrCheck.success) {
                    return vietqrCheck;
                }
                return {
                    success: false,
                    message: `Cas báo lỗi: ${casData.errorMessage || 'Tài khoản nhà phát triển không tồn tại'}`
                };
            }
            return {
                success: false,
                message: `Cas thông báo: ${casData.errorMessage || casData.errorCode}`
            };
        }
    } catch (e) {
        console.warn('Cas grant verification error:', e.message);
    }

    // 2. Thử kiểm tra tiếp với VietQR API (my.vietqr.io / casso.vn)
    return await checkVietQrCredentials(trimmedClientId, trimmedSecretKey);
}

async function checkVietQrCredentials(clientId, apiKey) {
    try {
        const res = await fetch(`${VIETQR_API_URL}/v2/lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': clientId,
                'x-api-key': apiKey
            },
            body: JSON.stringify({ bin: '970423', accountNumber: '10220062002' }),
            signal: AbortSignal.timeout(6000)
        });

        const data = await res.json().catch(() => null);

        if (res.status === 401 || data?.code === '401') {
            return {
                success: false,
                message: 'Khóa Client ID hoặc Secret Key / API Key không chính xác hoặc chưa được kích hoạt.'
            };
        }

        if (res.ok && (data?.code === '00' || data?.data?.accountName)) {
            return {
                success: true,
                service: 'vietqr',
                message: 'Kết nối thành công đến máy chủ VietQR / Cas!'
            };
        }

        if (data?.desc) {
            return {
                success: true,
                service: 'vietqr',
                message: `Kết nối máy chủ thành công: ${data.desc}`
            };
        }

        return {
            success: false,
            message: `Phản hồi từ máy chủ: ${data?.desc || res.statusText}`
        };
    } catch (e) {
        return {
            success: false,
            message: `Lỗi kết nối máy chủ: ${e.message}`
        };
    }
}

/**
 * Tra cứu tên chủ tài khoản ngân hàng thông qua Cas / VietQR
 */
async function lookupAccountWithCas({ bin, accountNumber, clientId, secretKey, environment }) {
    if (!bin || !accountNumber) {
        return { success: false, message: 'Vui lòng chọn ngân hàng và nhập số tài khoản hợp lệ' };
    }

    const cleanBin = String(bin).trim();
    const cleanAcc = String(accountNumber).trim().replace(/\s+/g, '');

    const creds = getCasCredentials();
    const activeClientId = (clientId || creds.clientId || '').trim();
    const activeSecretKey = (secretKey || creds.secretKey || '').trim();
    const activeEnv = environment || creds.environment || 'production';

    if (!activeClientId || !activeSecretKey) {
        return {
            success: false,
            notConfigured: true,
            message: 'Chưa cấu hình API Key Cas (cas.so). Vui lòng cấu hình trong Cài đặt hoặc nhập tay tên người thụ hưởng.'
        };
    }

    // 1. Ưu tiên tra cứu qua VietQR API
    try {
        const vqrRes = await fetch(`${VIETQR_API_URL}/v2/lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': activeClientId,
                'x-api-key': activeSecretKey
            },
            body: JSON.stringify({ bin: cleanBin, accountNumber: cleanAcc }),
            signal: AbortSignal.timeout(7000)
        });

        const vqrData = await vqrRes.json().catch(() => null);

        if (vqrData && vqrData.code === '00' && vqrData.data?.accountName) {
            return {
                success: true,
                accountName: String(vqrData.data.accountName).trim().toUpperCase(),
                bankBin: cleanBin,
                accountNumber: cleanAcc,
                source: 'vietqr'
            };
        }

        if (vqrData && vqrData.desc && vqrData.code !== '401') {
            return {
                success: false,
                message: vqrData.desc
            };
        }
    } catch (err) {
        console.warn('VietQR lookup call failed, fallback to Cas Open Banking...', err.message);
    }

    // 2. Tra cứu qua Cas Open Banking Identity / Accounts Lookup
    try {
        const baseUrl = activeEnv === 'sandbox' ? CAS_SANDBOX_URL : CAS_PROD_URL;
        const casRes = await fetch(`${baseUrl}/accounts/lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': activeClientId,
                'x-secret-key': activeSecretKey
            },
            body: JSON.stringify({ bin: cleanBin, accountNumber: cleanAcc }),
            signal: AbortSignal.timeout(7000)
        });

        if (casRes.ok) {
            const casData = await casRes.json();
            const holderName = casData.accountName || casData.ownerName || casData.data?.accountName;
            if (holderName) {
                return {
                    success: true,
                    accountName: String(holderName).trim().toUpperCase(),
                    bankBin: cleanBin,
                    accountNumber: cleanAcc,
                    source: 'cas'
                };
            }
        }
    } catch (err) {
        console.warn('Cas open banking lookup failed:', err.message);
    }

    return {
        success: false,
        message: 'Không tìm thấy tên chủ tài khoản từ ngân hàng. Vui lòng kiểm tra lại STK hoặc nhập tay.'
    };
}

module.exports = {
    getCasCredentials,
    verifyCasConnection,
    lookupAccountWithCas
};
