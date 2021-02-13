import axios from 'axios';
import fs from 'fs';
import url from 'url';
import sharp from 'sharp';
import FormData from 'form-data';

// TODO: Move this configuration to a JSON definition
const ipfsConfig = {
  apiUrl: 'http://ipfs:5001',
  gatewayUrl: 'http://127.0.0.1:8080/',
  pinataGatewayUrl: 'https://gateway.pinata.cloud/',
  publicGatewayUrl: 'https://cloudflare-ipfs.com/'
};

// Configuration

export interface PinataConfig {
  apiKey: string;
  apiSecret: string;
}

export async function getPinataConfig(): Promise<PinataConfig> {
  const apiKey = process.env.PINATA_KEY;
  const apiSecret = process.env.PINATA_SECRET;
  if (!(typeof apiKey === 'string' && typeof apiSecret === 'string')) {
    throw new Error('Missing Pinata API keys.');
  }

  return {
    apiKey,
    apiSecret
  };
}

// Helper Functions

export async function uploadFileToPinata(
  pinataConfig: PinataConfig,
  path: string
) {
  const pinataUrl = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const formData = new FormData();
  formData.append('file', fs.createReadStream(path));

  const pinataRes = await axios.post(pinataUrl, formData, {
    maxContentLength: Infinity,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${
        (formData as any)._boundary
      }`,
      pinata_api_key: pinataConfig.apiKey,
      pinata_secret_api_key: pinataConfig.apiSecret
    }
  });

  const pinataData = pinataRes.data;
  const cid = pinataData.IpfsHash;

  return {
    cid,
    size: pinataData.PinSize,
    ipfsUri: `ipfs://${cid}`,
    url: url.resolve(ipfsConfig.pinataGatewayUrl, `ipfs/${cid}`),
    publicGatewayUrl: url.resolve(ipfsConfig.publicGatewayUrl, `ipfs/${cid}`)
  };
}

export async function uploadImageWithThumbnailToPinata(
  pinataConfig: PinataConfig,
  path: string
) {
  const thumbnailPath = `${path}-thumbnail`;
  await sharp(path).resize(200, 200).toFile(thumbnailPath);

  const origFile = await uploadFileToPinata(pinataConfig, path);
  const thumbnailFile = await uploadFileToPinata(pinataConfig, thumbnailPath);
  fs.unlink(thumbnailPath, () => null);
  return {
    ...origFile,
    thumbnail: thumbnailFile
  };
}

export async function uploadJSONToPinata(
  pinataConfig: PinataConfig,
  json: any
) {
  const pinataUrl = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  const pinataRes = await axios.post(pinataUrl, json, {
    headers: {
      pinata_api_key: pinataConfig.apiKey,
      pinata_secret_api_key: pinataConfig.apiSecret
    }
  });

  const pinataData = pinataRes.data;
  const cid = pinataData.IpfsHash;
  return {
    cid,
    size: pinataData.PinSize,
    ipfsUri: `ipfs://${cid}`,
    url: url.resolve(ipfsConfig.pinataGatewayUrl, `ipfs/${cid}`),
    publicGatewayUrl: url.resolve(ipfsConfig.publicGatewayUrl, `ipfs/${cid}`)
  };
}
