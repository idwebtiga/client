import { create } from 'zustand';
import axios from 'axios';
import Lib from '../Lib';
import { BrowserProvider, JsonRpcSigner, Contract, ethers, parseEther, formatEther } from 'ethers';
import { abi as daoabi } from '../abi/DAO.json';
import { abi as zilabi } from '../abi/ZILNFT.json';
import { abi as coinabi } from '../abi/Coin.json';
import { abi as tokenabi } from '../abi/Token.json';
import { abi as delegatorabi } from '../abi/Delegator.json';
import { generateNonce, SiweMessage } from 'siwe';
import Config from '../Config';

const { e18 } = Lib;
const { CONFIG } = Config;

const domain = window.location.host;
const origin = window.location.origin;

function createSiweMessage(address, statement) {
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: CONFIG.chainId
  });
  return message.prepareMessage();
}

const useStore = create((set, get) => ({
  showBusy: false,
  setShowBusy: (val) => set((state) => {
    return {
      showBusy: val
    }
  }),
  txInfo: {
    status: 'HIDDEN', // START, STOP, HIDDEN
    result: 'PENDING', // PENDING, SUCCESS, ERROR
    txHash: false,
    errorMsg: false
  },
  setTxModalVisible: () => set((state) => {
    return {
      txInfo: {
        status: 'START',
        result: 'PENDING', // PENDING, SUCCESS, ERROR
        txHash: false,
        errorMsg: false
      }
    }
  }),
  setTxHash: (txHash) => set((state) => {
    return {
      txInfo: { ...state.txInfo, txHash }
    }
  }),
  setTxSuccess: () => set((state) => {
    return {
      txInfo: { ...state.txInfo, result: 'SUCCESS', errorMsg: false }
    }
  }),
  setTxError: (errorMsg) => set((state) => {
    return {
      txInfo: { ...state.txInfo, result: 'ERROR', errorMsg }
    }
  }),
  setTxModalStop: () => set((state) => {
    return {
      txInfo: { ...state.txInfo, status: 'STOP' }
    }
  }),
  setTxModalHidden: () => set((state) => {
    return {
      txInfo: {
        status: 'HIDDEN',
        txHash: false,
        errorMsg: false
      }
    }
  }),

  signer: false,
  provider: false,
  contracts: false,
  gasSymbol: '',
  coinSymbol: '',
  tokenSymbol: '',
  accessToken: false,
  delegatorFee: '2000', // todo

  loginStatus: 'DISCONNECTED', // CONNECTED, LOGGEDIN
  loginSigner: async (walletProvider, chainId, signerAddress) => {
    console.log('loginSigner');
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const signerProvider = new BrowserProvider(walletProvider, chainId);
    const signer = new JsonRpcSigner(signerProvider, signerAddress);
    const coin = new Contract(CONFIG.coinAddress, coinabi, provider);
    const token = new Contract(CONFIG.tokenAddress, tokenabi, provider);
    const dao = new Contract(CONFIG.daoAddress, daoabi, provider);
    const zil = new Contract(CONFIG.zilAddress, zilabi, provider);
    const delegator = new Contract(CONFIG.delegatorAddress, delegatorabi, provider);
    const gasSymbol = CONFIG.gasSymbol;
    console.log({ chainId, signerAddress });
    const coinSymbol = await coin.symbol();
    const tokenSymbol = await token.symbol();
    const contracts = {
      coin,
      token,
      dao,
      zil,
      delegator,
      coinSymbol,
      tokenSymbol
    };
    console.log(contracts);

    set({
      signer, contracts, gasSymbol, coinSymbol, tokenSymbol, provider
    });

    await Lib.delay(100);
    await get().refreshBalance();
    await Lib.delay(100);
    await get().refreshDaoData();
    await Lib.delay(100);
    await get().refreshZilData();
    await Lib.delay(100);

    set({
      loginStatus: 'CONNECTED'
    });
  },

  loginByToken: async () => {
    const { signer } = get();
    const address = signer.address;

    let validToken = false;
    const tokenForAddress = Lib.getTokenforAddress(address);
    if (tokenForAddress && tokenForAddress.length > 0) {
      try {
        console.log('users/profile');
        const resp = await axios.get(CONFIG.baseUrl + '/users/profile', {
          headers: {
            'Authorization': `Bearer ${tokenForAddress}`
          }
        });
        console.log(resp.data);
        validToken = tokenForAddress;
        console.log('valid token !!');
        set({
          loginStatus: 'LOGGEDIN', accessToken: validToken
        });
      } catch (err) {
        console.log('invalid token !!');
        console.error(err);
      }
    }

    return validToken;
  },

  loginBySiwe: async () => {
    const { signer } = get();
    const address = signer.address;

    try {
      Lib.removeTokenForAddress(address);
      const message = createSiweMessage(
        signer.address,
        'Sign in with Ethereum to the app.'
      );
      console.log('siwe:');
      console.log(message);

      const signature = await signer.signMessage(message);
      console.log({
        message, signature
      });

      console.log('message:');
      console.log(JSON.stringify({ message, signature }, null, 2));
      console.log('signature:');
      console.log(signature);

      const resp = await axios.post(CONFIG.baseUrl + '/users/authSiwe', {
        message,
        signature
      });

      console.log(resp.data);
      const token = resp.data.access_token;
      Lib.setTokenForAddress(address, token);
      set({
        loginStatus: 'LOGGEDIN', accessToken: token
      });
    } catch (err) {
      console.error(err);
    }
  },

  logout: () => set({ signer: false, ready: false, loginStatus: 'DISCONNECTED', accessToken: false }),

  faucet: async () => {
    console.log('faucet');
    const { accessToken } = get();

    try {
      console.log('transactions/faucet');
      const resp = await axios.get(CONFIG.baseUrl + '/transactions/faucet', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log(resp.data);
      const json = resp.data;
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);
      await get().refreshBalance();
    } catch (err) {
      console.error(err);
    }
  },

  balance: {
    gas: 0n,
    coin: 0n,
    token: 0n
  },

  daoData: {
    daoAddress: '',
    coinLocked: 0n,
    tokenLocked: 0n,
    buyPrice: 0n,
    sellPrice: 0n,
    allowanceCoin: 0n,
    allowanceToken: 0n
  },

  coinToTokenResult: 0n,
  tokenToCoinResult: 0n,

  coinToToken: async (amount) => {
    const { signer, contracts } = get();
    const { dao } = contracts;
    const amountToken = (await dao.coinToToken(signer.address, amount))[0];
    set({ coinToTokenResult: amountToken });
  },

  tokenToCoin: async (amount) => {
    const { signer, contracts } = get();
    const { dao } = contracts;
    const amountCoin = (await dao.tokenToCoin(signer.address, amount))[0];
    set({ tokenToCoinResult: amountCoin });
  },

  calculatedBorrow: 0n,

  calcBorrow: async (amount) => {
    const { contracts } = get();
    const { zil } = contracts;
    const calculatedBorrow = await zil.calcBorrow(amount);
    set({ calculatedBorrow });
  },

  calculatedCollateral: 0n,
  calcCollateral: async (amount) => {
    const { contracts } = get();
    const { zil } = contracts;
    const calculatedCollateral = await zil.calcCollateral(amount);
    set({ calculatedCollateral });
  },

  zilData: {
    zilAddress: '',
    coinLocked: 0n,
    tokenLocked: 0n,
    allowanceCoin: 0n,
    allowanceToken: 0n,
    loans: []
  },

  updateBalance: (balance) => set({ balance }),

  updatePrice: (buyPrice, sellPrice) => set({ buyPrice, sellPrice }),

  refreshBalance: async () => {
    console.log('refreshBalance');
    const { signer, contracts, provider } = get();
    if (signer, contracts) {
      const { coin, token, dao, zil } = contracts;
      const gas = await provider.getBalance(signer.address);
      const coin_ = await coin.balanceOf(signer.address);
      const token_ = await token.balanceOf(signer.address);
      const balance = {
        gas, coin: coin_, token: token_
      };

      console.log('balance:');
      console.log(balance);

      set({
        balance
      });
    }
  },

  refreshDaoData: async () => {
    console.log('refreshDaoData');
    const { signer, contracts } = get();
    if (signer, contracts) {
      const { coin, token, dao, zil } = contracts;
      const coinLocked = await coin.balanceOf(CONFIG.daoAddress);
      const tokenLocked = await token.balanceOf(CONFIG.daoAddress);
      const tokenBought = (await dao.coinToToken(signer.address, BigInt('1' + e18)))[0];
      const coinBought = (await dao.tokenToCoin(signer.address, BigInt('1' + e18)))[0];
      const buyPrice = BigInt('1' + e18 + e18) / tokenBought;
      const sellPrice = coinBought;
      const allowanceCoin = await coin.allowance(signer.address, CONFIG.daoAddress);
      const allowanceToken = await token.allowance(signer.address, CONFIG.daoAddress);

      const daoData = {
        daoAddress: CONFIG.daoAddress,
        coinLocked,
        tokenLocked,
        buyPrice,
        sellPrice,
        allowanceCoin,
        allowanceToken
      };

      set({
        daoData
      });
    }
  },

  refreshZilData: async () => {
    console.log('refreshZilData');
    const { signer, contracts } = get();
    if (signer, contracts) {
      const { coin, token, dao, zil } = contracts;
      const coinLocked = await coin.balanceOf(CONFIG.zilAddress);
      const tokenLocked = await token.balanceOf(CONFIG.zilAddress);
      const allowanceCoin = await coin.allowance(signer.address, CONFIG.zilAddress);
      const allowanceToken = await token.allowance(signer.address, CONFIG.zilAddress);

      const user = signer.address;
      const userToken = await token.balanceOf(user);
      const maxLoanCoin = await zil.calcBorrow(userToken);

      const loans = [];
      const balanceNft = await zil.balanceOf(signer.address);
      for (let i = 0; i < Number(balanceNft); i++) {
        const nftId = await zil.tokenOfOwnerByIndex(signer.address, i);
        const info = await zil.nftInfo(nftId);
        // console.log({ info });
        const staked = info[0];
        const borrowed = info[1];
        if (staked > 0n) {
          loans.push({
            nftId, staked, borrowed
          });
        }
      }

      const zilData = {
        zilAddress: CONFIG.zilAddress,
        coinLocked,
        tokenLocked,
        allowanceCoin,
        allowanceToken,
        // ownedCollateralToken: userToken,
        maxLoanCoin,
        // revToken,
        loans
      };

      console.log({ zilData });

      set({
        zilData
      });
    }
  },

  mintCoin: async (address, amount) => {
    console.log('mintCoin');
    const { signer, contracts } = get();
    const { coin } = contracts;
    try {
      const tx = await coin.mint(address, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  approveTokenDao: async (amount) => {
    console.log('approveTokenDao');
    const { signer, contracts } = get();
    const { token, zil } = contracts;
    try {
      const tx = await token.approve(CONFIG.daoAddress, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  approveCoinDao: async (amount) => {
    console.log('approveCoinDao');
    const { signer, contracts } = get();
    const { coin, zil } = contracts;
    try {
      const tx = await coin.approve(CONFIG.daoAddress, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  swapCoinToToken: async (amount) => {
    console.log('swapCoinToToken');
    const { signer, contracts } = get();
    const { dao } = contracts;
    try {
      let resultMin = (await dao.coinToToken(signer.address, amount))[0];
      resultMin = (resultMin * 95n / 100n);
      const tx = await dao.swapCoinToToken(amount, resultMin);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  swapTokenToCoin: async (amount) => {
    console.log('swapTokenToCoin');
    const { signer, contracts } = get();
    const { dao } = contracts;
    try {
      let resultMin = (await dao.tokenToCoin(signer.address, amount))[0];
      resultMin = (resultMin * 95n / 100n);
      const tx = await dao.swapTokenToCoin(amount, resultMin);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  approveTokenZil: async (amount) => {
    console.log('approveTokenZil');
    const { signer, contracts } = get();
    const { token, zil } = contracts;
    try {
      const tx = await token.approve(CONFIG.zilAddress, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  approveCoinZil: async (amount) => {
    console.log('approveCoinZil');
    const { signer, contracts } = get();
    const { coin, zil } = contracts;
    try {
      const tx = await coin.approve(CONFIG.zilAddress, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }

  },

  takeLoan: async (amount) => {
    console.log('takeLoan');
    const { signer, contracts } = get();
    const { zil } = contracts;
    try {
      const tx = await zil.takeLoan(amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }

  },

  payLoan: async (nftId, amount) => {
    console.log('payLoan');
    const { signer, contracts } = get();
    const { zil } = contracts;
    try {
      const tx = await zil.payLoan(nftId, amount);
      get().setTxHash(tx.hash);
      await tx.wait();
      get().setTxSuccess();
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'tx error';
      get().setTxError(errMsg);
    }
  },

  buyToken: async (amount) => {
    console.log('buyToken');
    const { signer, contracts, provider } = get();
    const { dao, delegator } = contracts;
    try {
      let resultMin = (await dao.coinToToken(signer.address, amount))[0];
      resultMin = (resultMin * 95n / 100n);

      const d = await delegator.eip712Domain();
      console.log(d);
      const name = d[1];
      const version = d[2];
      const chainId = d[3];
      const fee = CONFIG.feeCoin;
      const nonce = (await delegator.getUserNonce(signer.address)) + 1n;

      const domain = {
        name,
        version,
        chainId: chainId,
        verifyingContract: CONFIG.delegatorAddress
      };
      // BuyToken(uint256 amountCoin,uint256 resultMinimum,uint256 fee,uint256 nonce)
      const types = {
        BuyToken: [
          { name: 'amountCoin', type: 'uint256' },
          { name: 'resultMinimum', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const value = {
        amountCoin: amount,
        resultMinimum: resultMin,
        fee,
        nonce
      };
      const signature = await signer.signTypedData(domain, types, value);
      console.log({ domain, types, value, signature });

      const sender = await delegator.verifyBuyToken(
        value.amountCoin,
        value.resultMinimum,
        value.fee,
        value.nonce,
        signature
      );

      console.log(sender);
      if (sender.toLowerCase() !== signer.address.toLowerCase()) throw new Error('invalid verification');

      const data = {
        fn: 'BuyToken',
        amountCoin: value.amountCoin,
        resultMinimum: value.resultMinimum,
        fee: value.fee,
        nonce: value.nonce,
        signature,
        signer: sender
      }

      console.log(data);

      const { accessToken } = get();

      console.log('transactions/buyToken');
      const resp = await axios.post(CONFIG.baseUrl + '/transactions/buyToken', {
        amountCoin: value.amountCoin.toString(),
        resultMinimum: value.resultMinimum.toString(),
        fee: value.fee.toString(),
        nonce: value.nonce.toString(),
        signature,
        signer: sender
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(resp.data);
      const json = resp.data;
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);

      await get().refreshBalance();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'sign error';
    }
  },

  sellToken: async (amount) => {
    console.log('sellToken');
    const { signer, contracts, provider } = get();
    const { dao, delegator } = contracts;
    try {
      let resultMin = (await dao.tokenToCoin(signer.address, amount))[0];
      resultMin = (resultMin * 95n / 100n);

      const d = await delegator.eip712Domain();
      console.log(d);
      const name = d[1];
      const version = d[2];
      const chainId = d[3];
      const fee = CONFIG.feeCoin;
      const nonce = (await delegator.getUserNonce(signer.address)) + 1n;

      const domain = {
        name,
        version,
        chainId: chainId,
        verifyingContract: CONFIG.delegatorAddress
      };
      const types = {
        SellToken: [
          { name: 'amountToken', type: 'uint256' },
          { name: 'resultMinimum', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const value = {
        amountToken: amount,
        resultMinimum: resultMin,
        fee,
        nonce
      };
      const signature = await signer.signTypedData(domain, types, value);
      console.log({ domain, types, value, signature });

      const sender = await delegator.verifySellToken(
        value.amountToken,
        value.resultMinimum,
        value.fee,
        value.nonce,
        signature
      );

      console.log(sender);
      if (sender.toLowerCase() !== signer.address.toLowerCase()) throw new Error('invalid verification');

      const { accessToken } = get();

      console.log('transactions/sellToken');
      const resp = await axios.post(CONFIG.baseUrl + '/transactions/sellToken', {
        amountToken: value.amountToken.toString(),
        resultMinimum: value.resultMinimum.toString(),
        fee: value.fee.toString(),
        nonce: value.nonce.toString(),
        signature,
        signer: sender
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const json = resp.data;
      console.log(json);
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);

      await get().refreshBalance();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'sign error';
    }
  },

  takeLoanByDelegator: async (amount) => {
    console.log('takeLoanViaDelegator');
    const { signer, contracts, provider } = get();
    const { zil, delegator } = contracts;
    try {
      const d = await delegator.eip712Domain();
      const name = d[1];
      const version = d[2];
      const chainId = d[3];
      const fee = CONFIG.feeCoin;
      const nonce = (await delegator.getUserNonce(signer.address)) + 1n;

      const domain = {
        name,
        version,
        chainId: chainId,
        verifyingContract: CONFIG.delegatorAddress
      };
      const types = {
        TakeLoan: [
          { name: 'amountToken', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'nonce', type: 'uint256' }
        ],
      };
      const value = {
        amountToken: amount,
        fee,
        nonce
      };
      const signature = await signer.signTypedData(domain, types, value);
      const sender = await delegator.verifyTakeLoan(
        value.amountToken,
        value.fee,
        value.nonce,
        signature
      );

      if (sender.toLowerCase() !== signer.address.toLowerCase()) throw new Error('invalid verification');

      const { accessToken } = get();

      console.log('transactions/takeLoan');
      const resp = await axios.post(CONFIG.baseUrl + '/transactions/takeLoan', {
        amountToken: value.amountToken.toString(),
        fee: value.fee.toString(),
        nonce: value.nonce.toString(),
        signature,
        signer: sender
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const json = resp.data;
      console.log(json);
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);

      await get().refreshBalance();
      await get().refreshZilData();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'sign error';
    }
  },

  takeLoanByResultByDelegator: async (amountWanted) => {
    console.log('takeLoanByResultByDelegator');
    const { contracts } = get();
    const { zil } = contracts;
    const amount = await zil.calcCollateral(amountWanted);
    await get().takeLoanByDelegator(amount);
  },

  payLoanViaDelegator: async (nftId, amount) => {
    console.log('payLoanViaDelegator');
    const { signer, contracts, accessToken, provider } = get();
    const { delegator } = contracts;
    try {
      const d = await delegator.eip712Domain();
      const name = d[1];
      const version = d[2];
      const chainId = d[3];
      const fee = CONFIG.feeCoin;
      const nonce = (await delegator.getUserNonce(signer.address)) + 1n;

      const domain = {
        name,
        version,
        chainId: chainId,
        verifyingContract: CONFIG.delegatorAddress
      };
      const types = {
        PayLoan: [
          { name: 'nftId', type: 'uint256' },
          { name: 'amountCoin', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'nonce', type: 'uint256' }
        ],
      };
      const value = {
        nftId,
        amountCoin: amount,
        fee,
        nonce
      };
      const signature = await signer.signTypedData(domain, types, value);
      const sender = await delegator.verifyPayLoan(
        value.nftId,
        value.amountCoin,
        value.fee,
        value.nonce,
        signature
      );

      if (sender.toLowerCase() !== signer.address.toLowerCase()) throw new Error('invalid verification');

      console.log('transactions/payLoan');
      const resp = await axios.post(CONFIG.baseUrl + '/transactions/payLoan', {
        nftId: value.nftId.toString(),
        amountCoin: value.amountCoin.toString(),
        fee: value.fee.toString(),
        nonce: value.nonce.toString(),
        signature,
        signer: sender
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(resp.data);
      const json = resp.data;
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);

      await get().refreshBalance();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'sign error';
    }
  },

  topupData: {
    fee: 5000,
    minimumTopup: 50000,
    rows: []
  },

  getTopupData: async () => {
    console.log('getTopupData');
    const { accessToken } = get();
    try {
      const resp = await axios.get(CONFIG.baseUrl + '/topups/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          page: 0,
          size: 1000
        }
      });

      const json = resp.data;
      console.log('topup list:');
      console.log(json);
      const { topupData } = get();
      set({ topupData: { ...topupData, rows: json.items } });
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'getTopupData error';
    }
  },

  createTopup: async (amount) => {
    console.log('createTopup');
    const amountCoin = amount + '';
    const { signer, accessToken } = get();
    try {
      const resp = await axios.post(CONFIG.baseUrl + '/topups', {
        amount: amountCoin,
        toAddress: signer.address
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const json = resp.data;
      console.log(json);

      await get().getTopupData();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'getTopupData error';
    }
  },

  paymentData: {
    items: [],
    rows: []
  },

  getPaymentData: async () => {
    console.log('getPaymentData');
    const { accessToken } = get();
    try {
      let resp = await axios.get(CONFIG.baseUrl + '/payments/items', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          page: 0,
          size: 1000
        }
      });

      const items = resp.data.items;

      resp = await axios.get(CONFIG.baseUrl + '/payments/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          page: 0,
          size: 1000
        }
      });

      const rows = resp.data.items;
      const paymentData = {
        items,
        rows
      };

      set({
        paymentData
      });
    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'getPaymentData error';
    }
  },

  createPayment: async (itemId) => {
    console.log('createPayment');
    const { signer, accessToken } = get();
    try {
      const resp = await axios.post(CONFIG.baseUrl + '/payments', {
        itemId,
        fromAddress: signer.address
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const json = resp.data;
      console.log(json);

      const requestId = json.requestId;
      const amount = json.amount;

      await get().payWithNotes(requestId, amount);

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'getTopupData error';
    }
  },

  payWithNotes: async (notes, amount) => {
    console.log('payWithNotes');
    // toAddress, notes, amountCoin, fee, nonce, signature, signer 
    const { signer, contracts, accessToken, provider } = get();
    const { delegator } = contracts;

    const toAddress = CONFIG.deployer;
    const amountCoin = amount + e18;

    try {
      const d = await delegator.eip712Domain();
      const name = d[1];
      const version = d[2];
      const chainId = d[3];
      const fee = CONFIG.feeCoin;
      const nonce = (await delegator.getUserNonce(signer.address)) + 1n;

      const domain = {
        name,
        version,
        chainId: chainId,
        verifyingContract: CONFIG.delegatorAddress
      };
      const types = {
        PayWithNotes: [
          { name: 'toAddress', type: 'address' },
          { name: 'notes', type: 'string memory' },
          { name: 'amountCoin', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'nonce', type: 'uint256' }
        ],
      };
      const value = {
        toAddress,
        notes,
        amountCoin,
        fee,
        nonce
      };
      const signature = await signer.signTypedData(domain, types, value);
      const sender = await delegator.verifyPayWithNotes(
        value.toAddress,
        value.notes,
        value.amountCoin,
        value.fee,
        value.nonce,
        signature
      );

      if (sender.toLowerCase() !== signer.address.toLowerCase()) throw new Error('invalid verification');

      console.log('transactions/payWithNotes');
      const resp = await axios.post(CONFIG.baseUrl + '/transactions/payWithNotes', {
        toAddress,
        notes,
        amountCoin,
        fee: value.fee.toString(),
        nonce: value.nonce.toString(),
        signature,
        signer: sender
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(resp.data);
      const json = resp.data;
      const txHash = json.txHash;
      const receipt = await provider.waitForTransaction(txHash, 1);
      console.log(receipt);

      await get().refreshBalance();

    } catch (err) {
      console.error(err);
      const errMsg = err && err.message ? err.message : 'sign error';
    }
  },
}))

export default {
  useStore
}