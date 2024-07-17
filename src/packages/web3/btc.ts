import * as bitcoin from 'bitcoinjs-lib';
import { CHAINS } from 'packages/constants/blockchain';
import { ChainAccountType } from './types';
import { IS_MAINNET } from 'packages/constants';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

export class BTC {
  static chain = CHAINS.BITCOIN;
  static BTC_NETWORK = IS_MAINNET ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

  // four type: Native Segwit, Nested Segwit, Taproot, Legacy
  static createAccountBySeed(seed: Buffer): ChainAccountType[] {
    bitcoin.initEccLib(ecc);

    let accounts: Array<ChainAccountType> = [];

    const nativeSegwitPath = IS_MAINNET ? `m/84'/0'/0'/0/0` : `m/84'/1'/0'/0/0`;
    const nestedSegwitPath = IS_MAINNET ? `m/49'/0'/0'/0/0` : `m/49'/1'/0'/0/0`;
    const taprootPath = IS_MAINNET ? `m/86'/0'/0'/0/0` : `m/86'/1'/0'/0/0`;
    const legacyPath = IS_MAINNET ? `m/44'/0'/0'/0/0` : `m/44'/1'/0'/0/0`;

    // nativeSegwit
    const bip32 = BIP32Factory(ecc);
    const node = bip32.fromSeed(seed, this.BTC_NETWORK);

    const nativeSegwitPrivateKey = node.derivePath(nativeSegwitPath).privateKey?.toString('hex');
    const nativeSegwitAddress = this.getAddressP2wpkhFromPrivateKey(nativeSegwitPrivateKey as string);

    accounts.push({
      chain: this.chain,
      address: nativeSegwitAddress as string,
      privateKey: nativeSegwitPrivateKey,
      note: 'Native Segwit',
    });

    // nestedSegwit
    const nestedSegwitPrivateKey = node.derivePath(nestedSegwitPath).privateKey?.toString('hex');
    const nestedSegwitAddress = this.getAddressP2shP2wpkhFromPrivateKey(nestedSegwitPrivateKey as string);

    accounts.push({
      chain: this.chain,
      address: nestedSegwitAddress as string,
      privateKey: nestedSegwitPrivateKey,
      note: 'Nested Segwit',
    });

    // taproot
    const taprootPrivateKey = node.derivePath(taprootPath).privateKey?.toString('hex');
    const taprootAddress = this.getAddressP2trFromPrivateKey(taprootPrivateKey as string);

    accounts.push({
      chain: this.chain,
      address: taprootAddress as string,
      privateKey: taprootPrivateKey,
      note: 'Taproot',
    });

    // legacy
    const legacyPrivateKey = node.derivePath(legacyPath).privateKey?.toString('hex');
    const legacyAddress = this.getAddressP2pkhFromPrivateKey(legacyPrivateKey as string);

    accounts.push({
      chain: this.chain,
      address: legacyAddress as string,
      privateKey: legacyPrivateKey,
      note: 'Legacy',
    });

    return accounts;
  }

  static toWifStaring(privateKey: string): string {
    const ECPair = ECPairFactory(ecc);
    const privateKeyBytes = Buffer.from(privateKey, 'hex');
    const keyPair = ECPair.fromPrivateKey(privateKeyBytes, { network: this.BTC_NETWORK });
    return keyPair.toWIF();
  }

  // p2wpkh
  static getAddressP2wpkhFromPrivateKey(privateKey: string) {
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF(this.toWifStaring(privateKey), this.BTC_NETWORK);
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.BTC_NETWORK });
    return p2wpkh.address;
  }

  // p2sh-p2wpkh
  static getAddressP2shP2wpkhFromPrivateKey(privateKey: string) {
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF(this.toWifStaring(privateKey), this.BTC_NETWORK);
    const p2 = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: this.BTC_NETWORK }),
      network: this.BTC_NETWORK,
    });
    return p2.address;
  }

  // p2tr
  static getAddressP2trFromPrivateKey(privateKey: string) {
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF(this.toWifStaring(privateKey), this.BTC_NETWORK);
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: keyPair.publicKey.subarray(1, 33),
      network: this.BTC_NETWORK,
    });

    return p2tr.address;
  }

  // p2pkh
  static getAddressP2pkhFromPrivateKey(privateKey: string) {
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.fromWIF(this.toWifStaring(privateKey), this.BTC_NETWORK);
    const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: this.BTC_NETWORK });
    return p2pkh.address;
  }
}
