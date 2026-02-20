const fs = require('fs');
const path = require('path');

const WALLETS_DB_PATH = './data/wallets.json';

class Wallet {
  static ensureDbDir() {
    const dir = path.dirname(WALLETS_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static loadWallets() {
    this.ensureDbDir();
    if (!fs.existsSync(WALLETS_DB_PATH)) {
      return [];
    }
    try {
      const data = fs.readFileSync(WALLETS_DB_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  static saveWallets(wallets) {
    this.ensureDbDir();
    fs.writeFileSync(WALLETS_DB_PATH, JSON.stringify(wallets, null, 2));
  }

  static create(walletData) {
    const wallets = this.loadWallets();
    const newWallet = {
      id: Date.now().toString(),
      address: walletData.address,
      name: walletData.name,
      active: true,
      createdAt: new Date().toISOString(),
      deactivatedAt: null,
      ...walletData
    };
    wallets.push(newWallet);
    this.saveWallets(wallets);
    return newWallet;
  }

  static getAll() {
    return this.loadWallets();
  }

  static getById(id) {
    const wallets = this.loadWallets();
    return wallets.find(w => w.id === id);
  }

  static getByAddress(address) {
    const wallets = this.loadWallets();
    return wallets.find(w => w.address === address);
  }

  static getActive() {
    return this.loadWallets().filter(w => w.active === true);
  }

  static deactivate(id) {
    const wallets = this.loadWallets();
    const wallet = wallets.find(w => w.id === id);
    if (wallet) {
      wallet.active = false;
      wallet.deactivatedAt = new Date().toISOString();
      this.saveWallets(wallets);
      return wallet;
    }
    return null;
  }

  static activate(id) {
    const wallets = this.loadWallets();
    const wallet = wallets.find(w => w.id === id);
    if (wallet) {
      wallet.active = true;
      wallet.deactivatedAt = null;
      this.saveWallets(wallets);
      return wallet;
    }
    return null;
  }

  static isActive(id) {
    const wallet = this.getById(id);
    return wallet && wallet.active === true;
  }

  static isActiveByAddress(address) {
    const wallet = this.getByAddress(address);
    return wallet && wallet.active === true;
  }
}

module.exports = Wallet;
