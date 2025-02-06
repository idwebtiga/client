import { useEffect, useState } from 'react';
import {
  App,
  Page,
  Navbar,
  Block,
  Button,
  Card,
  List,
  ListItem,
  ListInput,
  Link,
  BlockTitle,
  ListButton,
  NavbarBackLink,
  Segmented,
  SegmentedButton
} from 'konsta/react';
import { useLocation } from "wouter";
import { BrowserProvider, JsonRpcSigner, formatEther, parseUnits, Contract, parseEther } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import store from './store/store';
import Lib from './Lib';

const { useStore } = store;
const { wei2fiat } = Lib;

export default function Swap(props) {
  const [amountBuy, setAmountBuy] = useState('');
  const [amountSell, setAmountSell] = useState('');
  const [activeSegmented, setActiveSegmented] = useState(1);
  const { signer, contracts, balance, gasSymbol, coinSymbol, tokenSymbol,
    setTxModalVisible,
    setTxModalStop,
    refreshBalance,
    refreshDaoData,
    daoData,
    approveTokenDao,
    approveCoinDao,
    coinToTokenResult,
    tokenToCoinResult,
    tokenToCoin,
    coinToToken,
    swapCoinToToken,
    swapTokenToCoin,
    buyToken,
    sellToken
  } = useStore();

  const updateCoinToToken = async (val) => {
    setAmountBuy(val);
    const amount = Number(val) > 0 ? BigInt(parseEther(val)) : 0n;
    await coinToToken(amount);
  };

  const onChangeAmountBuy = async (e) => {
    const val = e.target.value;
    await updateCoinToToken(val);
  };

  const setBuyMax = async () => {
    const val = formatEther(balance.coin);
    await updateCoinToToken(val);
  };

  const updateTokenToCoin = async (val) => {
    setAmountSell(val);
    const amount = Number(val) > 0 ? BigInt(parseEther(val)) : 0n;
    await tokenToCoin(amount);
  };

  const onChangeAmountSell = async (e) => {
    const val = e.target.value;
    await updateTokenToCoin(val);
  };

  const setSellMax = async () => {
    const val = formatEther(balance.token);
    await updateTokenToCoin(val);
  }

  const amc = Number(amountBuy) > 0 ? BigInt(parseEther(amountBuy)) : 0n;
  const amt = Number(amountSell) > 0 ? BigInt(parseEther(amountSell)) : 0n;
  const disableApproveC = amc === 0n || (amc > 0n && daoData.allowanceCoin > 0n && daoData.allowanceCoin >= amc);
  const disableApproveT = amt === 0n || (amt > 0n && daoData.allowanceToken > 0n && daoData.allowanceToken >= amt);

  const approveBuy = async () => {
    if (!(amc > 0n)) return toast.error('Invalid amount.');
    setTxModalVisible();
    await approveCoinDao(amc);
    await refreshBalance();
    await refreshDaoData();
    setTxModalStop();
  }

  const doBuy = async () => {
    if (!(amc > 0n)) return toast.error('Invalid amount.');
    setTxModalVisible();
    await swapCoinToToken(amc);
    await refreshBalance();
    await refreshDaoData();
    setTxModalStop();
  }

  const approveSell = async () => {
    if (!(amt > 0n)) return toast.error('Invalid amount.');
    setTxModalVisible();
    await approveTokenDao(amt);
    await refreshBalance();
    await refreshDaoData();
    setTxModalStop();
  }

  const doSell = async () => {
    if (!(amt > 0n)) return toast.error('Invalid amount.');
    setTxModalVisible();
    await swapTokenToCoin(amt);
    await refreshBalance();
    await refreshDaoData();
    setTxModalStop();
  }

  const doBuyToken = async () => {
    if (!(amc > 0n)) return toast.error('Invalid amount.');
    await buyToken(amc);
  }

  const doSellToken = async () => {
    if (!(amt > 0n)) return toast.error('Invalid amount.');
    await sellToken(amt);
  }

  const panelBuy = (
    <div className='-mx-4'>
      <Block margin='my-1'>
        <div>
          Kurs Beli: {wei2fiat(daoData.buyPrice)} {coinSymbol}<br />
          Saldo: {wei2fiat(balance.coin)} {coinSymbol}
        </div>
      </Block>
      <List margin='my-1'>
        <ListInput
          label={'Jumlah ' + coinSymbol + ' untuk ditukar.'}
          type="number"
          value={amountBuy}
          onChange={onChangeAmountBuy}
        />
      </List>
      <Block margin='my-1'>
        <div className="grid grid-cols-1 gap-2">
          <div>
            Tukar menjadi {wei2fiat(coinToTokenResult)} {tokenSymbol}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className=''>
              <Button outline onClick={setBuyMax}>Max</Button>
            </div>
            <div className='col-span-2'>
              <Button onClick={doBuyToken}>Beli {tokenSymbol}</Button>
            </div>
          </div>
        </div>
      </Block>
    </div>
  );

  const panelSell = (
    <div className='-mx-4'>
      <Block margin='my-1'>
        <div>
          Kurs Jual: {wei2fiat(daoData.sellPrice)} {coinSymbol}<br />
          Saldo: {wei2fiat(balance.token)} {tokenSymbol}
        </div>
      </Block>
      <List margin='my-1'>
        <ListInput
          label={'Jumlah ' + tokenSymbol + ' untuk ditukar.'}
          type="number"
          value={amountSell}
          onChange={onChangeAmountSell}
        />
      </List>
      <Block margin='my-1'>
        <div className="grid grid-cols-1 gap-2">
          <div>
            Tukar menjadi {wei2fiat(tokenToCoinResult)} {coinSymbol}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className=''>
              <Button outline onClick={setSellMax}>Max</Button>
            </div>
            <div className='col-span-2'>
              <Button onClick={doSellToken}>Jual {tokenSymbol}</Button>
            </div>
          </div>
        </div>
      </Block>
    </div>
  );

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
      <Card>{panelBuy}</Card>
      <Card>{panelSell}</Card>
    </div>
  )
}