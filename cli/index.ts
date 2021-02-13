#!/usr/bin/env node
import FormData = require('form-data');
import fetch from 'node-fetch';
import fs = require('fs');

type IPFSResponse = {
  cid: string;
  size: number;
  ipfsUri: string;
  url: string;
  publicGatewayUrl: string;
};

type FileUploadResponse = IPFSResponse & { thumbnail: IPFSResponse };

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage(
    'Usage: $0 --file [path] --endpoint <server endpoint> --name [string] --description <string>' +
      '\n\nUploads a file to IPFS and mints an NFT with the associated metadata'
  )
  .default('endpoint', 'http://localhost:3300')
  .describe('name', 'The title of the token')
  .describe('description', 'An optional description field')
  .describe('file', 'The file to be associated with the token')
  .demandOption(['file', 'name']).argv;

(async () => {
  console.log(`Posting file ${argv.file}to IPFS...`);
  const form = new FormData();
  form.append('file', fs.createReadStream(argv.file));
  const res: FileUploadResponse = await fetch(
    `${argv.endpoint}/ipfs-file-upload`,
    {
      method: 'POST',
      body: form
    }
  ).then(x => x.json());

  const body = {
    artifactUri: res.ipfsUri,
    displayUri: res.ipfsUri,
    name: argv.name,
    thumbnailUri: res.thumbnail.ipfsUri
  };
  console.log("Minting new token...");
  const res2: {opHash: string} = await fetch(`${argv.endpoint}/mint-token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(x => x.json());

  console.log("Success! See the operation at:");
  console.log(`https://better-call.dev/delphinet/opg/${res2.opHash}/contents`)
})();
