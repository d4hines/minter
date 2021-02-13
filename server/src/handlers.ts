import { Request, Response } from 'express';
import { mintTokenServerSide } from './lib/nfts/actions';
import { TezosToolkit } from '@taquito/taquito';

import {
  PinataConfig,
  uploadImageWithThumbnailToPinata,
  uploadJSONToPinata
} from './helpers/pinata';

export async function handleIpfsFileUpload(
  pinataConfig: PinataConfig,
  req: Request,
  res: Response
) {
  const file = req.files?.file;
  if (!file?.data) {
    return res.status(500).json({
      error: 'No file data found'
    });
  }

  try {
    const content = await uploadImageWithThumbnailToPinata(
      pinataConfig,
      file.tempFilePath
    );
    return res.status(200).json(content);
  } catch (e) {
    return res.status(500).json({
      error: 'File upload failed'
    });
  }
}

export async function handleIpfsJSONUpload(
  pinataConfig: PinataConfig,
  req: Request,
  res: Response
) {
  if (req.body === undefined) {
    return res.status(500).json({
      error: 'Could not retrieve JSON request body'
    });
  }

  try {
    const content = await uploadJSONToPinata(pinataConfig, req.body);
    return res.status(200).json(content);
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: 'JSON upload failed'
    });
  }
}

export async function handleMintToken(
  owner: string,
  address: string,
  toolkit: TezosToolkit,
  req: Request,
  res: Response
) {
  if (req.body === undefined) {
    return res.status(500).json({
      error: 'Could not retrieve JSON request body'
    });
  }

  try {
    // we could get a lot more data from this using
    // the revealOperation method
    const { opHash } = await mintTokenServerSide(
      owner,
      toolkit,
      address,
      req.body
    );
    return res.status(200).json({ opHash });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: 'Mint Token Failed'
    });
  }
}
