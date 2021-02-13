import express, { Express } from 'express';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import { InMemorySigner } from '@taquito/signer';
import { TezosToolkit } from '@taquito/taquito';

import { getPinataConfig } from './helpers/pinata';
import {
  handleIpfsFileUpload,
  handleIpfsJSONUpload,
  handleMintToken
} from './handlers';
import { config } from 'dotenv';
config();

const address = process.env.MINTER_ADDRESS!;
const rpcUrl = process.env.TZ_RPC_URL!;
const owner = process.env.TZ_KEY!;
const secret = process.env.TZ_SECRET!;

if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}

async function createHttpServer(app: Express) {
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(
    fileUpload({
      limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
      useTempFiles: true
    })
  );
  const toolkit = new TezosToolkit(rpcUrl);

  toolkit.setProvider({
    signer: await InMemorySigner.fromSecretKey(secret)
  });

  const pinataConfig = await getPinataConfig();

  app.post('/ipfs-file-upload', (req, res) => {
    return handleIpfsFileUpload(pinataConfig, req, res);
  });

  app.post('/ipfs-json-upload', (req, res) => {
    return handleIpfsJSONUpload(pinataConfig, req, res);
  });

  app.get('/hello', (req, res) => {
    return res.send('Hello world!');
  });

  app.route('/mint-token').post((req, res) => {
    return handleMintToken(owner, address, toolkit, req, res);
  });

  const httpServer = http.createServer(app);
  return httpServer;
}

process.on('unhandledRejection', (reason, _promise) => {
  console.log('[Process] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', error => {
  console.log('[Process] Uncaught Exception:', error);
});

async function run() {
  const envPort = process.env.MINTER_API_PORT;
  const port = envPort ? parseInt(envPort) : 3300;
  const app = express();
  const server = await createHttpServer(app);
  server.listen(port, () => {
    console.log(`[Server] Serving on port ${port}`);
  });
}

async function main() {
  try {
    await run();
  } catch (e) {
    console.log('FATAL - an error occurred during startup:');
    console.dir(e);
    process.exit(1);
  }
}

main();
